import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
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

  const d = l.details as Record<string, string>;
  const price = l.price_cents == null ? "Trade only" : `$${(l.price_cents / 100).toFixed(2)}`;
  const per = l.kind === "service" ? ` / ${d.unit}` : l.kind === "ride" ? " / seat" : "";

  return (
    <main className="flex flex-col gap-3 max-w-2xl" style={{ "--school": l.school.colors.primary } as React.CSSProperties}>
      <Link href={`/${l.school.slug}`} className="text-sm underline">← {l.school.name}</Link>
      {l.photo_url && <img src={l.photo_url} alt={l.title} className="w-full rounded-xl object-cover max-h-80" />}
      {d.photo_credit && <p className="text-xs opacity-60 -mt-2">Photo: {d.photo_credit}</p>}
      <h1 className="text-2xl font-bold">{l.title}</h1>
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
        ? <p className="rounded bg-gray-100 dark:bg-gray-800 p-3">This is your listing.</p>
        : l.status === "active"
          ? <>
              {l.price_cents != null && <BuyButton listingId={l.id} sellerId={l.owner_id} buyerId={user.id} priceCents={l.price_cents} />}
              <WantButton listingId={l.id} title={l.title} wanted={!!myWant} />
            </>
          : <p className="rounded bg-gray-100 dark:bg-gray-800 p-3">No longer available.</p>}
      {l.owner_id !== user.id && <ReportButton listingId={l.id} />}
    </main>
  );
}
