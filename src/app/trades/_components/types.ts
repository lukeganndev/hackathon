export type TradeStatus = "proposed" | "accepted" | "meetup_set" | "done" | "cancelled";
export type Trade = { id: string; status: TradeStatus; meetup_spot: string | null; meetup_at: string | null; created_at: string };
export type Leg = { id: string; trade_id: string; listing_id: string; giver_id: string; receiver_id: string; cash_cents: number; accepted_at: string | null; confirmed_at: string | null };
export type Listing = { id: string; title: string; owner_id: string; school_id: string; kind: string; status: string; price_cents: number | null };
export type Profile = { id: string; display_name: string | null };
export type School = { id: string; name: string; meetup_spots: { name: string; lat?: number; lng?: number }[] };
export type TradeDetail = { userId: string; trade: Trade; legs: Leg[]; listings: Listing[]; profiles: Profile[]; schools: School[]; codes: { leg_id: string; code: string }[] };
export type FoundLeg = { from: string; to: string; listingId: string; cashCents: number; title: string; giverName: string; receiverName: string };
export type FoundLoop = { legs: FoundLeg[] };
export type TradeSummary = { userId: string; trades: Trade[] };

export function orderLegs(legs: Leg[], viewer: string): Leg[] {
  if (legs.length < 2) return legs;
  const outgoing = new Map(legs.map((leg) => [leg.giver_id, leg]));
  const ordered: Leg[] = [];
  const seen = new Set<string>();
  let next = outgoing.has(viewer) ? viewer : legs[0].giver_id;
  while (outgoing.has(next) && !seen.has(next)) {
    seen.add(next);
    const leg = outgoing.get(next)!;
    ordered.push(leg);
    next = leg.receiver_id;
  }
  return ordered.length === legs.length ? ordered : legs;
}

export const statusLabels: Record<TradeStatus, string> = {
  proposed: "Awaiting acceptance", accepted: "Ready to meet", meetup_set: "Meetup scheduled", done: "Loop closed", cancelled: "Cancelled",
};

export function displayDate(value: string | null): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function localDateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
