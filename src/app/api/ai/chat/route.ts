import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { matchWaitingWants } from "@/lib/matchWants";
import { moderate } from "@/lib/moderate";
import { findLoops } from "@/lib/matcher";

// Chat agent: turns "trade my shoes for a Norton Anthology or sell for $25" into
// listings (haves) and wants. Tools run as the signed-in user, so RLS applies.
// The client sends back the full message history unchanged each turn (thinking
// blocks included): Opus 5.5 rejects edited history, so this must stay append-only.
const client = new Anthropic();

const SYSTEM = `You are Loop's trade assistant for college students. Loop finds multi-way trade loops (A gives B, B gives C, C gives A) and also does plain buying and selling.

Your job: turn what the student says into
- haves: things they're offering, saved with create_listing (check my_listings first so you don't duplicate one they already posted)
- wants: things they're looking for, saved with add_want. Always search_listings first; if a matching listing exists, pass its listing_id so the loop matcher can use it. If nothing matches, save the want without a listing_id.

Rules:
- Ask a short follow-up only when you truly can't tell what they mean (e.g. which edition). Otherwise act.
- Prices are in cents. "sell for $25" = price_cents 2500. "trade only" = price_cents null.
- Tickets must be posted with the photo form (ticket rules apply), not here. Say so.
- Services (tutoring, haircut, nails, moving help) and rides are listings too (kind "service" or "ride").
- Rides need from, to, and a departure date/time before you post. Ask for whichever is missing. Pickup spot is optional. Turn "Friday 3pm" into an exact date using today's date from the first message.
- Trades and loops: when the student wants to trade something or asks for a loop, make sure their have (create_listing or my_listings) and want (add_want with a listing_id) are saved, then call find_loops. If it finds a loop, describe it in one short line per person (who gives what to whom) and ask if they want you to propose it. Only call propose_loop after they say yes, passing the legs exactly as find_loops returned them. If there's no loop yet, say their want is saved and Loop will find a loop when someone posts a match.
- If a tool says something is not allowed, tell the student kindly why and don't try to post it another way.
- Only describe what you actually saved. Never promise features Loop doesn't have (notifications, messaging, payments for rides).
- After saving, confirm in one or two plain sentences what you saved. No markdown headers.`;

const nullable = (type: string) => ({ type: [type, "null"] });

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_listings",
    description: "Search active listings from other students across all campuses by keyword.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "1-3 keywords, e.g. 'norton anthology'" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "my_listings",
    description: "List the student's own active listings.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "create_listing",
    description: "Post something the student is offering (a have).",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        kind: { type: "string", enum: ["item", "service", "ride"] },
        category: {
          type: "string",
          enum: ["textbooks", "clothing", "furniture", "electronics", "dorm", "lab", "tutoring", "haircut", "nails", "moving_help", "rides", "other"],
        },
        price_cents: { ...nullable("integer"), description: "null = trade only. Ride: gas share per seat. Service: price per unit." },
        details: {
          type: "object",
          description: "Ride and service fields. Use null for anything that doesn't apply.",
          properties: {
            from: { ...nullable("string"), description: "Ride start city" },
            to: { ...nullable("string"), description: "Ride destination city" },
            depart_at: { ...nullable("string"), description: "Ride departure, local time, YYYY-MM-DDTHH:MM" },
            seats: nullable("integer"),
            pickup: { ...nullable("string"), description: "Ride pickup spot, e.g. 'Ferguson Center lot'" },
            unit: { anyOf: [{ type: "string", enum: ["hour", "session"] }, { type: "null" }], description: "Service priced per" },
            course: { ...nullable("string"), description: "Tutoring course code, e.g. 'CH 101'" },
          },
          required: ["from", "to", "depart_at", "seats", "pickup", "unit", "course"],
          additionalProperties: false,
        },
      },
      required: ["title", "description", "kind", "category", "price_cents", "details"],
      additionalProperties: false,
    },
  },
  {
    name: "add_want",
    description: "Save something the student wants.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What they want, e.g. 'Norton Anthology of English Lit, 10th ed'" },
        listing_id: { ...nullable("string"), description: "id from search_listings if a listing matches, else null" },
        max_cash_cents: { type: "integer", description: "Cash they'd add on top of a trade, 0 if none said" },
      },
      required: ["text", "listing_id", "max_cash_cents"],
      additionalProperties: false,
    },
  },
  {
    name: "find_loops",
    description: "Find trade loops (2-4 students each giving one item) that include this student, using everyone's saved wants.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "propose_loop",
    description: "Propose a loop from find_loops as a trade. Only after the student says yes.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        legs: {
          type: "array",
          items: {
            type: "object",
            properties: { from: { type: "string" }, to: { type: "string" }, listingId: { type: "string" } },
            required: ["from", "to", "listingId"],
            additionalProperties: false,
          },
        },
      },
      required: ["legs"],
      additionalProperties: false,
    },
  },
];

const STATUS: Record<string, string> = {
  search_listings: "Searching listings on every campus…",
  my_listings: "Checking what you've already posted…",
  create_listing: "Posting your listing and checking who wants it…",
  add_want: "Saving what you want…",
  find_loops: "Looking for a trade loop across campus…",
  propose_loop: "Proposing the loop to everyone…",
};

export const maxDuration = 60;

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;
type Profile = { id: string; school_id: string };

async function runTool(name: string, input: Record<string, unknown>, db: Supabase, me: Profile) {
  switch (name) {
    case "search_listings": {
      const words = String(input.query).split(/\s+/).filter(Boolean).slice(0, 3);
      let q = db.from("listings").select("id, title, price_cents, kind, school:schools(name)")
        .eq("status", "active").neq("owner_id", me.id).limit(8);
      for (const w of words) q = q.ilike("title", `%${w.replace(/[%_]/g, "")}%`);
      const { data, error } = await q;
      return error ? { error: error.message } : { results: data };
    }
    case "my_listings": {
      const { data, error } = await db.from("listings").select("id, title, price_cents, kind")
        .eq("owner_id", me.id).eq("status", "active");
      return error ? { error: error.message } : { results: data };
    }
    case "create_listing": {
      const v = await moderate({ title: String(input.title), description: String(input.description ?? "") });
      if (!v.allowed) return { error: `Not allowed on Loop: ${v.reason}` };
      // Drop the null detail fields so listings only store what applies.
      const details = Object.fromEntries(Object.entries(input.details as object).filter(([, v]) => v != null));
      const { data, error } = await db.from("listings").insert({ ...input, details, owner_id: me.id, school_id: me.school_id })
        .select("id, title").single();
      if (error) return { error: error.message };
      const waiting = await matchWaitingWants(data.id).catch(() => 0);
      return { saved: data, students_already_waiting_for_this: waiting };
    }
    case "add_want": {
      const v = await moderate({ text: String(input.text) });
      if (!v.allowed) return { error: `Not allowed on Loop: ${v.reason}` };
      const { data, error } = await db.from("wants").insert({ ...input, user_id: me.id, school_id: me.school_id })
        .select("id, text, listing_id").single();
      return error ? { error: error.message } : { saved: data };
    }
    case "find_loops": {
      // Same edges as the trades API: active concrete wants on active listings.
      const admin = supabaseAdmin();
      const { data: wants } = await admin.from("wants")
        .select("user_id, listing_id, listing:listings!inner(owner_id, title, status)")
        .eq("active", true).not("listing_id", "is", null).eq("listing.status", "active").limit(1000);
      type Row = { user_id: string; listing_id: string; listing: { owner_id: string; title: string } };
      const rows = (wants ?? []) as unknown as Row[];
      const loops = findLoops(rows.map((w) => ({ from: w.listing.owner_id, to: w.user_id, listingId: w.listing_id, cashCents: 0 })), me.id).slice(0, 3);
      const ids = [...new Set(loops.flat().flatMap((l) => [l.from, l.to]))];
      const { data: people } = ids.length ? await admin.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
      const name = (id: string) => (id === me.id ? "you" : people?.find((p) => p.id === id)?.display_name ?? "a student");
      return {
        loops: loops.map((legs) => ({
          legs: legs.map((l) => ({ from: l.from, to: l.to, listingId: l.listingId, gives: name(l.from), receives: name(l.to), item: rows.find((w) => w.listing_id === l.listingId)?.listing.title })),
        })),
      };
    }
    case "propose_loop": {
      const legs = (input.legs as { from: string; to: string; listingId: string }[]).map((l) => ({ ...l, cashCents: 0 }));
      // Same transactional RPC as the trades API; the actor is the signed-in student.
      const { data, error } = await supabaseAdmin().rpc("loop_trade_action", { p_actor: me.id, p_action: "create", p_payload: { legs } });
      if (error) return { error: error.message.replace(/^TRADE:\d+:/, "") };
      const trade = (data as { trade?: { id: string } }).trade;
      return trade ? { proposed: { id: trade.id, link: `/trades/${trade.id}` } } : { error: "Couldn't propose that loop." };
    }
  }
  return { error: `Unknown tool ${name}` };
}

export async function POST(req: Request) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
  const { data: me } = await db.from("profiles").select("id, school_id").eq("id", user.id).single();
  if (!me) return Response.json({ error: "Sign in first" }, { status: 401 });

  const { messages } = (await req.json()) as { messages: Anthropic.Beta.BetaMessageParam[] };
  if (!Array.isArray(messages) || !messages.length) return Response.json({ error: "No message" }, { status: 400 });
  // Date goes into the first message (not the system prompt) so the history stays append-only.
  if (messages.length === 1 && typeof messages[0].content === "string") {
    const today = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
    messages[0].content = [{ type: "text", text: `(Today is ${today}, Central time.)

${messages[0].content}` }];
  }

  // Streams newline-delimited JSON: {status} lines while working, then {messages} or {error}.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: object) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        send({ status: "Reading your message…" });
        // ponytail: cap of 8 model calls per user message; raise if it gives up early.
        for (let i = 0; i < 8; i++) {
          const response = await client.beta.messages.create({
            model: "claude-opus-5-5",
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "low" },
            system: SYSTEM,
            tools,
            messages,
          });
          messages.push({ role: "assistant", content: response.content });
          if (response.stop_reason !== "tool_use") break; // also covers "refusal"

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type !== "tool_use") continue;
            send({ status: STATUS[block.name] ?? "Working…" });
            const out = await runTool(block.name, block.input as Record<string, unknown>, db, me);
            results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out), is_error: "error" in out });
          }
          messages.push({ role: "user", content: results });
          send({ status: "Writing a reply…" });
        }
        send({ messages });
      } catch (e) {
        console.error("ai/chat", e);
        send({ error: "AI is busy, try again." });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
