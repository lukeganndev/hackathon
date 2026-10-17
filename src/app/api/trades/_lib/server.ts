import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { findLoops } from "@/lib/matcher";
import { handleTradeRequest, TradeError, type Action, type TradeDependencies } from "./http";

type Database = ReturnType<typeof supabaseAdmin>;
type Listing = { id: string; title: string; owner_id: string; school_id: string; kind: string; status: string; price_cents: number | null };
type Leg = { id: string; trade_id: string; listing_id: string; giver_id: string; receiver_id: string; cash_cents: number; accepted_at: string | null; confirmed_at: string | null };
type Trade = { id: string; status: string; meetup_spot: string | null; meetup_at: string | null; created_at: string };

function checked<T>(result: { data: T | null; error: unknown }): NonNullable<T> {
  if (result.error || result.data === null) throw new TradeError(503, "Database is unavailable. Please retry.");
  return result.data as NonNullable<T>;
}

async function find(db: Database, userId: string) {
  const wants = checked(await db.from("wants").select("user_id, listing_id").eq("active", true).not("listing_id", "is", null).limit(1001));
  if (wants.length > 1000) throw new TradeError(422, "The matching pool is too large for this demo");
  if (!wants.length) return { loops: [] };
  const listings = checked(await db.from("listings").select("id, title, owner_id, school_id, kind, status, price_cents")
    .in("id", [...new Set(wants.map((want) => want.listing_id))]).eq("status", "active")) as Listing[];
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  const edges = wants.flatMap((want) => {
    const listing = byId.get(want.listing_id);
    return listing ? [{ from: listing.owner_id, to: want.user_id as string, listingId: listing.id, cashCents: 0 }] : [];
  });
  const loops = findLoops(edges, userId);
  const selected = loops.slice(0, 50);
  const people = [...new Set(selected.flatMap((loop) => loop.flatMap((leg) => [leg.from, leg.to])))];
  const names = people.length ? checked(await db.from("profiles").select("id, display_name").in("id", people)) : [];
  const byUser = new Map(names.map((person) => [person.id, person.display_name ?? "Student"]));
  return {
    loops: selected.map((legs) => ({ legs: legs.map((leg) => ({
      ...leg, title: byId.get(leg.listingId)!.title,
      giverName: byUser.get(leg.from) ?? "Student", receiverName: byUser.get(leg.to) ?? "Student",
    })) })),
    moreAvailable: loops.length > selected.length,
  };
}

async function detail(db: Database, userId: string, id: string) {
  // Authorize before loading names, meetup information, or receiver-only codes.
  const legs = checked(await db.from("trade_legs").select("id, trade_id, listing_id, giver_id, receiver_id, cash_cents, accepted_at, confirmed_at").eq("trade_id", id)) as Leg[];
  if (!legs.some((leg) => leg.giver_id === userId || leg.receiver_id === userId)) throw new TradeError(404, "Trade not found");
  const trade = checked(await db.from("trades").select("id, status, meetup_spot, meetup_at, created_at").eq("id", id).single<Trade>());
  const listingIds = legs.map((leg) => leg.listing_id);
  const listings = checked(await db.from("listings").select("id, title, owner_id, school_id, kind, status, price_cents").in("id", listingIds)) as Listing[];
  const people = [...new Set(legs.flatMap((leg) => [leg.giver_id, leg.receiver_id]))];
  const profiles = checked(await db.from("profiles").select("id, display_name").in("id", people));
  const schoolIds = [...new Set(listings.map((listing) => listing.school_id))];
  const schools = schoolIds.length ? checked(await db.from("schools").select("id, name, meetup_spots").in("id", schoolIds)) : [];
  const receiverLegIds = legs.filter((leg) => leg.receiver_id === userId).map((leg) => leg.id);
  const codes = trade.status === "meetup_set" && receiverLegIds.length
    ? checked(await db.from("trade_leg_codes").select("leg_id, code").in("leg_id", receiverLegIds)) : [];
  return { userId, trade, legs, listings, profiles, schools, codes };
}

async function list(db: Database, userId: string) {
  const participation = checked(await db.from("trade_legs").select("trade_id")
    .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`));
  const ids = [...new Set(participation.map((leg) => leg.trade_id))];
  if (!ids.length) return { userId, trades: [] };
  const trades = checked(await db.from("trades").select("id, status, meetup_spot, meetup_at, created_at")
    .in("id", ids).order("created_at", { ascending: false }).limit(100));
  return { userId, trades };
}

export function tradeRoute(action: Action, request: Request, params: { id?: string; legId?: string } = {}) {
  let admin: Database | undefined;
  const db = () => admin ??= supabaseAdmin();
  const dependencies: TradeDependencies = {
    async authenticate(request) {
      const authorization = request.headers.get("authorization");
      // Explicit bearer support also allows repeatable tests with separate student sessions.
      if (authorization) {
        const match = /^Bearer (\S+)$/i.exec(authorization);
        if (!match) return null;
        const { data, error } = await db().auth.getUser(match[1]);
        return error ? null : data.user?.id ?? null;
      }
      const { data, error } = await (await supabaseServer()).auth.getUser();
      return error ? null : data.user?.id ?? null;
    },
    async read(action, userId, id) {
      if (action === "find") return find(db(), userId);
      if (action === "detail") return detail(db(), userId, id!);
      return list(db(), userId);
    },
    async mutate(action, userId, payload) {
      // One database transaction locks rows, validates roles/state, and performs all writes.
      const { data, error } = await db().rpc("loop_trade_action", { p_actor: userId, p_action: action, p_payload: payload });
      if (error) {
        if (error.code === "PGRST202") throw new TradeError(503, "Trade database migration is missing in this environment");
        const match = /^TRADE:(400|403|404|409|429):(.+)$/.exec(error.message);
        if (match) throw new TradeError(Number(match[1]), match[2]);
        if (["40001", "40P01", "55P03"].includes(error.code)) throw new TradeError(409, "Trade changed. Refresh and retry.");
        if (error.code.startsWith("22")) throw new TradeError(400, "Invalid trade data");
        throw new TradeError(503, "Could not save this trade. Please retry.");
      }
      if (data && typeof data === "object" && "httpStatus" in data && "error" in data) {
        const failure = data as { httpStatus: number; error: string };
        throw new TradeError(failure.httpStatus, failure.error);
      }
      return data;
    },
  };
  return handleTradeRequest(request, action, dependencies, params);
}
