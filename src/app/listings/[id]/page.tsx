import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { WantButton } from "./WantButton";
import { ReportButton } from "./ReportButton";
import { BuyButton } from "./BuyButton";
import { Stars } from "@/app/u/Stars";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see listings.</main>;

  const { data: l } = await supabase
    .from("listings")
    .select("*, owner:profiles(display_name), school:schools(name, slug, colors)")
    .eq("id", id).single();
  if (!l) notFound();
  const { data: sellerRating } = await supabase
    .from("rating_summary").select("avg_stars, review_count").eq("ratee_id", l.owner_id).maybeSingle();
  const { count: wanted } = await supabase
    .from("wants").select("id", { count: "exact", head: true }).eq("listing_id", id).eq("active", true);
  const { data: myWant } = await supabase
    .from("wants").select("id").eq("listing_id", id).eq("user_id", user.id).eq("active", true).maybeSingle();

  const gone = l.status === "sold" || l.status === "traded";
  if (gone) return <SoldPage l={l} meId={user.id} />;

  const d = l.details as Record<string, string>;
  const price = l.price_cents == null ? "Trade only" : `$${(l.price_cents / 100).toFixed(2)}`;
  const per = l.kind === "service" ? ` / ${d.unit}` : l.kind === "ride" ? " / seat" : "";

  return (
    <main className="flex flex-col gap-3 max-w-2xl" style={{ "--school": l.school.colors.primary } as React.CSSProperties}>
      <Link href={`/${l.school.slug}`} className="text-sm underline">← {l.school.name}</Link>
      {l.photo_url && <img src={l.photo_url} alt={l.title} className="w-full rounded-xl object-cover max-h-80" />}
      {d.photo_credit && <p className="text-xs opacity-60 -mt-2">Photo: {d.photo_credit}</p>}
      <h1 className="text-3xl">{l.title}</h1>
      <p className="text-xl font-semibold text-[var(--school)]">{price}{l.price_cents != null && per}</p>
      {l.kind === "ride" && d.from && (
        <p>🚗 {d.from} → {d.to}{d.depart_at && `, ${new Date(d.depart_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}{d.seats && `, ${d.seats} seats`}</p>
      )}
      {l.kind === "ride" && d.pickup && <p>📍 Pickup: {d.pickup}</p>}
      {l.kind === "service" && d.course && <p>📚 {d.course}</p>}
      {!!wanted && <p className="rounded bg-[var(--school)] text-white px-3 py-2 self-start">🔔 {wanted} student{wanted === 1 ? " wants" : "s want"} this</p>}
      {l.description && <p>{l.description}</p>}
      <p className="text-sm flex flex-wrap items-center gap-2">
        <span className="opacity-70">Posted by</span>
        <Link href={`/u/${l.owner_id}`} className="underline font-medium">{l.owner.display_name}</Link>
        <Stars avg={sellerRating?.avg_stars ?? null} count={sellerRating?.review_count ?? 0} />
        <span className="opacity-70">· {l.category?.replace("_", " ")}</span>
      </p>
      {l.ticket_type && <p className="text-sm opacity-70">🎟 Transfers through the official ticket account. Payment is held until the buyer confirms.</p>}

      {l.owner_id === user.id
        ? <p className="note">This is your listing.</p>
        : l.status === "active"
          ? <>
              {l.price_cents != null && <BuyButton listingId={l.id} sellerId={l.owner_id} buyerId={user.id} priceCents={l.price_cents} />}
              <WantButton listingId={l.id} title={l.title} wanted={!!myWant} seller={{ id: l.owner_id, name: l.owner.display_name, priceCents: l.price_cents }} />
            </>
          : <p className="note">No longer available.</p>}
      {l.owner_id !== user.id && <ReportButton listingId={l.id} />}
    </main>
  );
}

// A sold or traded listing: a clear "done" page with who it went to and the review from that handoff.
async function SoldPage({ l, meId }: { l: { id: string; title: string; photo_url: string | null; status: string; price_cents: number | null; owner_id: string; owner: { display_name: string }; school: { name: string; slug: string; colors: { primary: string } } }; meId: string }) {
  const supabase = await supabaseServer();
  // Trade legs are private to participants; only the finished handoff's names and date are shown.
  const { data: leg } = await supabaseAdmin().from("trade_legs").select("id, giver_id, receiver_id, cash_cents, confirmed_at")
    .eq("listing_id", l.id).not("confirmed_at", "is", null).order("confirmed_at", { ascending: false }).limit(1).maybeSingle();
  const [{ data: people }, { data: reviews }] = await Promise.all([
    leg ? supabase.from("profiles").select("id, display_name").in("id", [leg.giver_id, leg.receiver_id]) : Promise.resolve({ data: [] }),
    leg ? supabase.from("ratings").select("id, stars, comment, rater_id").eq("trade_leg_id", leg.id) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = (id: string) => (id === meId ? "You" : people?.find((p) => p.id === id)?.display_name ?? "a student");
  const word = l.status === "sold" ? "Sold" : "Traded";
  const when = leg?.confirmed_at ? new Date(leg.confirmed_at).toLocaleDateString([], { month: "long", day: "numeric" }) : null;

  return (
    <main className="flex flex-col gap-4 max-w-2xl">
      <Link href={`/${l.school.slug}`} className="text-sm underline">← {l.school.name}</Link>
      <div className="sold-hero" style={{ background: l.school.colors.primary }}>
        {l.photo_url && <img src={l.photo_url} alt={l.title} />}
        <span className="sold-stamp">{word}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl">{l.title}</h1>
        <span className="sold-pill">✓ {word}{when ? ` · ${when}` : ""}</span>
      </div>
      <section className="panel flex flex-col gap-2">
        <h2 className="text-xl">This one found a new home.</h2>
        {leg ? <>
          <p>
            <Link href={`/u/${leg.giver_id}`} className="underline font-medium">{nameOf(leg.giver_id)}</Link>
            {" "}{leg.cash_cents > 0 ? `sold it for $${(leg.cash_cents / 100).toFixed(2)} to` : "traded it to"}{" "}
            <Link href={`/u/${leg.receiver_id}`} className="underline font-medium">{nameOf(leg.receiver_id)}</Link>
            {leg.cash_cents > 0 ? "." : " in a Loop."}
          </p>
          <small style={{ color: "var(--mute)" }}>Handoff confirmed in person with a code{when ? ` on ${when}` : ""}.</small>
          {reviews?.map((r) => (
            <p key={r.id} className="review" style={{ margin: 0 }}>
              <span className="text-amber-500">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
              {r.comment && <span>“{r.comment}”</span>}
              <small>{nameOf(r.rater_id)}</small>
            </p>
          ))}
        </> : <p style={{ color: "var(--mute)" }}>Posted by {l.owner.display_name}. It&apos;s no longer available.</p>}
      </section>
      <div className="flex gap-2 flex-wrap">
        <Link href={`/${l.school.slug}?q=${encodeURIComponent(l.title.split(/[ ,]/)[0])}`} className="btn">Find something similar</Link>
        <Link href="/chat" className="btn-ghost">Ask Loop to find one</Link>
      </div>
    </main>
  );
}
