import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { IC, icon } from "../ListingCard";
import { Composer, LiveRefresh } from "./Composer";

type Msg = {
  id: string; sender_id: string; recipient_id: string; body: string; offer_cents: number | null; read_at: string | null; created_at: string;
  listing: { id: string; title: string; photo_url: string | null; price_cents: number | null; status: string; category: string | null } | null;
};
const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const time = (t: string) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Inbox: one thread per person, offers shown as listing cards inside the thread.
export default async function Messages({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see messages.</main>;
  const me = user.id;

  const { data } = await supabase.from("messages")
    .select("id, sender_id, recipient_id, body, offer_cents, read_at, created_at, listing:listings(id, title, photo_url, price_cents, status, category)")
    .order("created_at", { ascending: false }).limit(500); // ponytail: one page of history; paginate if inboxes grow
  const msgs = (data ?? []) as unknown as Msg[];
  const threads = new Map<string, Msg[]>();
  for (const m of msgs) {
    const other = m.sender_id === me ? m.recipient_id : m.sender_id;
    threads.set(other, [...(threads.get(other) ?? []), m]);
  }
  const ids = [...threads.keys()];
  const { with: open = ids[0] } = await searchParams;
  if (open && !threads.has(open)) threads.set(open, []); // starting a new conversation
  const { data: people } = threads.size
    ? await supabase.from("profiles").select("id, display_name").in("id", [...threads.keys()]) : { data: [] };
  const nameOf = (id: string) => people?.find((p) => p.id === id)?.display_name ?? "Student";

  const thread = open ? [...(threads.get(open) ?? [])].reverse() : [];
  if (open && thread.some((m) => m.recipient_id === me && !m.read_at))
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("sender_id", open).eq("recipient_id", me).is("read_at", null);
  const lastListing = [...thread].reverse().find((m) => m.listing)?.listing?.id ?? null;

  return (
    <main className="dm">
      <LiveRefresh me={me} />
      <aside className="dm-list">
        <h1 className="text-3xl" style={{ padding: "4px 8px 10px" }}>Messages</h1>
        {!threads.size && <p style={{ color: "var(--mute)", padding: 8 }}>No messages yet. Tap “I want this” on a listing to send an offer.</p>}
        {[...threads.entries()].map(([id, list]) => {
          const last = list[0];
          const unread = list.filter((m) => m.recipient_id === me && !m.read_at && id !== open).length;
          return (
            <Link key={id} href={`/messages?with=${id}`} className="dm-row" aria-current={id === open ? "page" : undefined}>
              <span className="acct-av" aria-hidden>{nameOf(id)[0]?.toUpperCase()}</span>
              <span className="dm-row-text">
                <b>{nameOf(id)}</b>
                <small>{last ? `${last.sender_id === me ? "You: " : ""}${last.offer_cents != null ? `Offer ${money(last.offer_cents)} · ` : ""}${last.body}` : "New conversation"}</small>
              </span>
              {!!unread && <span className="badge-dot">{unread}</span>}
            </Link>
          );
        })}
      </aside>

      <section className="dm-thread">
        {open ? <>
          <header className="dm-head"><Link href={`/u/${open}`} className="underline font-medium">{nameOf(open)}</Link></header>
          <div className="dm-msgs">
            {thread.map((m) => {
              const mine = m.sender_id === me;
              return (
                <div key={m.id} className={`dm-msg ${mine ? "me" : ""}`}>
                  {m.listing && (
                    <Link href={`/listings/${m.listing.id}`} className="dm-offer">
                      <span className="dm-thumb">{m.listing.photo_url ? <img src={m.listing.photo_url} alt="" /> : <svg viewBox="0 0 24 24" aria-hidden><path d={IC[icon(m.listing.title, m.listing.category)]} /></svg>}</span>
                      <span>
                        <small>{m.offer_cents != null ? "OFFER" : "ABOUT"}</small>
                        <b>{m.offer_cents != null ? `${money(m.offer_cents)} for ` : ""}{m.listing.title}</b>
                        <small>{m.listing.status === "active" ? (m.listing.price_cents != null ? `Listed at ${money(m.listing.price_cents)}` : "Trade only") : "No longer available"}</small>
                      </span>
                    </Link>
                  )}
                  <p className="bubble">{m.body}</p>
                  <small>{time(m.created_at)}{mine && m.read_at ? " · Seen" : ""}</small>
                </div>
              );
            })}
            {!thread.length && <p style={{ color: "var(--mute)" }}>Say hi to {nameOf(open)}.</p>}
          </div>
          <Composer to={open} listingId={lastListing} />
        </> : <div className="dm-empty">Pick a conversation.</div>}
      </section>
    </main>
  );
}
