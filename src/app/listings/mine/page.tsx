import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { RemoveButton } from "./RemoveButton";
import { RateForm } from "./RateForm";
import { ListingCard, IC, icon, type CardListing, type CardSchool } from "../../ListingCard";

const CARD = "id, title, price_cents, photo_url, category, status, school:schools(name, colors, email_domains)";
type Card = CardListing & { school: CardSchool };

export default async function MyStuff() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see your stuff.</main>;

  const [{ data: listings }, { data: wants }, { data: done }, { data: rated }] = await Promise.all([
    supabase.from("listings").select(CARD)
      .eq("owner_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
    supabase.from("wants").select(`id, text, listing_id, listing:listings(${CARD})`)
      .eq("user_id", user.id).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("trade_legs").select("id, giver_id, receiver_id, listing:listings(title)")
      .not("confirmed_at", "is", null).or(`giver_id.eq.${user.id},receiver_id.eq.${user.id}`),
    supabase.from("ratings").select("trade_leg_id").eq("rater_id", user.id),
  ]);
  const { data: me } = await supabase.from("profiles").select("school:schools(name, colors, email_domains)").eq("id", user.id).single();
  const mySchool = me?.school as unknown as CardSchool;
  // Confirmed handoffs I haven't reviewed yet.
  const ratedIds = new Set(rated?.map((r) => r.trade_leg_id));
  const toRate = (done ?? []).filter((l) => !ratedIds.has(l.id))
    .map((l) => ({ ...l, other: l.giver_id === user.id ? l.receiver_id : l.giver_id }));
  const { data: names } = toRate.length
    ? await supabase.from("profiles").select("id, display_name").in("id", toRate.map((l) => l.other))
    : { data: [] };
  const nameOf = (id: string) => names?.find((n) => n.id === id)?.display_name ?? "them";

  return (
    <main className="flex flex-col gap-10">
      {!!toRate.length && (
        <section className="flex flex-col gap-3">
          <h2 className="text-3xl">Rate your recent trades</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {toRate.map((l) => (
              <RateForm key={l.id} legId={l.id} rateeId={l.other} rateeName={nameOf(l.other)}
                title={(l.listing as unknown as { title: string } | null)?.title ?? "your trade"} />
            ))}
          </div>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3"><h1 className="text-3xl">What you have</h1><Link href="/listings/new" className="btn">+ Post something</Link></div>
        {!listings?.length && <p>Nothing posted yet.</p>}
        <div className="lgrid">
          {(listings as unknown as Card[] | null)?.map((l, i) => (
            <div key={l.id} className="card-wrap">
              <ListingCard l={l} school={l.school} delay={i * 40} />
              <div className="flex items-center justify-between text-sm" style={{ color: "var(--mute)" }}>
                <span>{l.status === "active" ? "Live" : l.status === "pending" ? "In a trade" : l.status === "sold" ? "Sold" : l.status === "traded" ? "Traded" : l.status}</span>
                {l.status === "active" && <RemoveButton table="listings" id={l.id} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-3xl">What you want</h2><Link href="/chat" className="btn-ghost">Tell Loop what you want</Link></div>
        {!wants?.length && <p>No wants yet.</p>}
        <div className="lgrid">
          {wants?.map((w, i) => {
            const matched = w.listing as unknown as Card | null;
            const text = w.text.replace(/^\[demo\] /, "");
            return (
              <div key={w.id} className="card-wrap">
                {matched ? <ListingCard l={matched} school={matched.school} delay={i * 40} /> : (
                  <div className="lcard" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="tile want-tile">
                      <svg className="ic" viewBox="0 0 24 24" aria-hidden><path d={IC[icon(text)]} /></svg>
                      <span className="tag">WANTED{mySchool ? ` · ${(mySchool.email_domains?.[0] ?? "").toUpperCase()}` : ""}</span>
                    </div>
                    <div className="cb"><h3>{text}</h3><div className="crow"><span>Loop is watching for this</span></div></div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm" style={{ color: "var(--mute)" }}>
                  <span>{matched ? `✓ Matched: you want “${text}”` : "Waiting for a match"}</span>
                  <RemoveButton table="wants" id={w.id} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
