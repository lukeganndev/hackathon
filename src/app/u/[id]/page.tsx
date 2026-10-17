import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { ink, themeVars } from "@/lib/schoolTheme";
import { ListingCard, IC, icon, type CardListing, type CardSchool } from "../../ListingCard";
import { ReviewsButton, type Review } from "../Reviews";

const CARD = "id, title, price_cents, photo_url, category, status, school:schools(name, colors, email_domains)";
type Card = CardListing & { school: CardSchool };

// Student profile: their listings up top, then completed trades with the reviews from each.
export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see profiles.</main>;

  const { data: person } = await supabase.from("profiles")
    .select("id, display_name, created_at, school:schools(name, colors)").eq("id", id).single();
  if (!person) notFound();
  const school = person.school as unknown as CardSchool;

  // Trade legs are private to participants (RLS); a profile shows only finished handoffs, read server-side.
  const [{ data: summary }, { data: reviews }, { data: listings }, { data: legs }] = await Promise.all([
    supabase.from("rating_summary").select("avg_stars, review_count").eq("ratee_id", id).maybeSingle(),
    supabase.from("ratings").select("id, stars, comment, created_at, trade_leg_id, rater:profiles!ratings_rater_id_fkey(id, display_name)")
      .eq("ratee_id", id).order("created_at", { ascending: false }),
    supabase.from("listings").select(CARD).eq("owner_id", id).eq("status", "active").order("created_at", { ascending: false }),
    supabaseAdmin().from("trade_legs").select(`id, giver_id, receiver_id, confirmed_at, listing:listings(${CARD})`)
      .not("confirmed_at", "is", null).or(`giver_id.eq.${id},receiver_id.eq.${id}`)
      .order("confirmed_at", { ascending: false }).limit(20),
  ]);
  const others = [...new Set((legs ?? []).map((l) => (l.giver_id === id ? l.receiver_id : l.giver_id)))];
  const { data: names } = others.length ? await supabase.from("profiles").select("id, display_name").in("id", others) : { data: [] };
  const nameOf = (uid: string) => names?.find((n) => n.id === uid)?.display_name ?? "a student";
  const all = (reviews ?? []) as unknown as (Review & { trade_leg_id: string })[];
  const first = person.display_name?.split(" ")[0] ?? "them";

  return (
    <main className="flex flex-col gap-10" style={themeVars(school)}>
      <section className="band" style={{ alignItems: "center" }}>
        <div className="w-20 h-20 rounded-full grid place-items-center text-4xl" style={{ background: "var(--on)", color: "var(--accent)", flex: "none", position: "relative", zIndex: 1 }} aria-hidden>
          {person.display_name?.[0]?.toUpperCase()}
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <small>{school.name} · .edu verified · joined {new Date(person.created_at).toLocaleDateString([], { month: "short", year: "numeric" })}</small>
          <h1>{person.display_name}{person.id === user.id && " (you)"}</h1>
          <ReviewsButton avg={summary?.avg_stars ?? null} count={summary?.review_count ?? 0} reviews={all} name={first} />
          <p style={{ opacity: .85 }}>{listings?.length ?? 0} listed · {legs?.length ?? 0} handoffs completed{person.id === user.id && <> · <Link href="/settings" className="underline">Edit profile</Link></>}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-3xl">{person.id === user.id ? "Your listings" : `${first}'s listings`}</h2>
        {!listings?.length && <p style={{ color: "var(--mute)" }}>Nothing listed right now.</p>}
        <div className="lgrid">
          {(listings as unknown as Card[] | null)?.map((l, i) => <ListingCard key={l.id} l={l} school={l.school} delay={i * 40} />)}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Completed trades</h2>
        {!legs?.length && <p style={{ color: "var(--mute)" }}>No completed trades yet.</p>}
        {legs?.map((leg, i) => {
          const l = leg.listing as unknown as Card | null;
          const gave = leg.giver_id === id;
          const other = gave ? leg.receiver_id : leg.giver_id;
          const legReviews = all.filter((r) => r.trade_leg_id === leg.id);
          return (
            <Link key={leg.id} href={l ? `/listings/${l.id}` : "#"} className="done-trade panel" style={{ animation: `up .5s ${i * 60}ms both` }}>
              <div className="done-thumb" style={{ background: l?.school.colors.primary, color: ink(l?.school.colors.primary ?? "#888") }}>
                {l?.photo_url ? <img src={l.photo_url} alt="" /> : <svg className="ic" viewBox="0 0 24 24" aria-hidden><path d={IC[icon(l?.title ?? "", l?.category)]} /></svg>}
              </div>
              <div className="flex flex-col gap-1" style={{ minWidth: 0, flex: 1 }}>
                <h3>{gave ? "Gave" : "Got"} {l?.title ?? "an item"} {gave ? "to" : "from"} {nameOf(other)}</h3>
                <small style={{ color: "var(--mute)", fontSize: 13 }}>✓ Handoff confirmed by code · {new Date(leg.confirmed_at!).toLocaleDateString()}</small>
                {legReviews.length ? legReviews.map((r) => (
                  <p key={r.id} className="review" style={{ margin: 0 }}>
                    <span><span className="text-amber-500">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>{r.comment && <> “{r.comment}”</>} <small>· {r.rater.display_name}</small></span>
                  </p>
                )) : <small style={{ color: "var(--mute)", fontSize: 13 }}>No review for this one yet.</small>}
              </div>
              <span aria-hidden style={{ color: "var(--mute)" }}>↗</span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
