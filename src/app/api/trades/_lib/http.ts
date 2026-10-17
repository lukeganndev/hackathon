export type Action = "find" | "list" | "detail" | "create" | "accept" | "meetup" | "confirm" | "cancel";
export type Payload = Record<string, unknown>;

export class TradeError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface TradeDependencies {
  authenticate(request: Request): Promise<string | null>;
  read(action: "find" | "list" | "detail", userId: string, id?: string): Promise<unknown>;
  mutate(action: "create" | "accept" | "meetup" | "confirm" | "cancel", userId: string, payload: Payload): Promise<unknown>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new TradeError(400, "Invalid ID");
  return value.toLowerCase();
}

function object(value: unknown): Payload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TradeError(400, "Expected a JSON object");
  return value as Payload;
}

async function body(request: Request): Promise<Payload> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new TradeError(415, "Send application/json");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new TradeError(400, "Missing JSON body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 16_384) {
      await reader.cancel();
      throw new TradeError(413, "Request is too large");
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new TradeError(400, "Invalid JSON"); }
  return object(value);
}

function parseLegs(value: unknown, userId: string) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw new TradeError(400, "A trade needs 1 to 4 legs");
  }
  const legs = value.map((value) => {
    const leg = object(value);
    if (!Number.isSafeInteger(leg.cashCents) || (leg.cashCents as number) < 0 || (leg.cashCents as number) > 2_147_483_647) {
      throw new TradeError(400, "Cash must be a nonnegative whole number of cents");
    }
    const parsed = { from: uuid(leg.from), to: uuid(leg.to), listingId: uuid(leg.listingId), cashCents: leg.cashCents as number };
    if (parsed.from === parsed.to) throw new TradeError(400, "You cannot trade with yourself");
    return parsed;
  });
  if (!legs.some((leg) => leg.from === userId || leg.to === userId)) throw new TradeError(403, "You must be in this trade");
  if (new Set(legs.map((leg) => leg.listingId)).size !== legs.length) throw new TradeError(400, "A listing can appear only once");
  if (legs.length === 1) return legs;
  if (legs.some((leg) => leg.cashCents !== 0)) throw new TradeError(400, "Loop cash top-ups are not enabled");
  const outgoing = new Map(legs.map((leg) => [leg.from, leg]));
  if (outgoing.size !== legs.length || new Set(legs.map((leg) => leg.to)).size !== legs.length) {
    throw new TradeError(400, "Each person must give and receive once");
  }
  const ordered = [];
  let next = legs[0].from;
  const visited = new Set<string>();
  for (let index = 0; index < legs.length; index++) {
    const leg = outgoing.get(next);
    if (!leg || visited.has(next)) throw new TradeError(400, "Legs must form one connected loop");
    visited.add(next);
    ordered.push(leg);
    next = leg.to;
  }
  if (next !== ordered[0].from) throw new TradeError(400, "Legs must form a closed loop");
  return ordered;
}

/** Shared HTTP boundary; dependencies let tests exercise the actual route behavior. */
export async function handleTradeRequest(
  request: Request,
  action: Action,
  dependencies: TradeDependencies,
  params: { id?: string; legId?: string } = {},
): Promise<Response> {
  const reply = (value: unknown, status = 200) => Response.json(value, {
    status, headers: { "Cache-Control": "no-store" },
  });
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new TradeError(403, "Use this site's trade API");
    const userId = await dependencies.authenticate(request);
    if (!userId) throw new TradeError(401, "Sign in first");
    if (action === "find" || action === "list" || action === "detail") {
      return reply(await dependencies.read(action, userId, action === "detail" ? uuid(params.id) : undefined));
    }
    let payload: Payload = action === "create" ? {} : { id: uuid(params.id) };
    if (action === "create") {
      payload = { legs: parseLegs((await body(request)).legs, userId) };
    } else if (action === "meetup") {
      const input = await body(request);
      if (typeof input.spot !== "string" || !input.spot.trim() || input.spot.length > 200) throw new TradeError(400, "Choose a meetup spot");
      if (typeof input.at !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(input.at)) throw new TradeError(400, "Meetup time must include a timezone");
      const timestamp = Date.parse(input.at);
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) throw new TradeError(400, "Choose a future meetup time");
      payload = { ...payload, spot: input.spot.trim(), at: new Date(timestamp).toISOString() };
    } else if (action === "confirm") {
      const input = await body(request);
      if (typeof input.code !== "string" || !/^\d{4}$/.test(input.code)) throw new TradeError(400, "Enter the 4-digit code");
      payload = { ...payload, legId: uuid(params.legId), code: input.code };
    }
    return reply(await dependencies.mutate(action, userId, payload), action === "create" ? 201 : 200);
  } catch (error) {
    if (error instanceof TradeError) return reply({ error: error.message }, error.status);
    // Never send database errors, keys, request bodies, or handoff codes to clients/logs.
    return reply({ error: "Trade request failed. Please retry." }, 500);
  }
}
