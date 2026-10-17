import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { RemoveButton } from "./RemoveButton";
import { RateForm } from "./RateForm";

const money = (c: number | null) => (c == null ? "Trade only" : `$${(c / 100).toFixed(2)}`);

export default async function MyStuff() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see your stuff.</main>;

  const [{ data: listings }, { data: wants }, { data: done }, { data: rated }] = await Promise.all([
    supabase.from("listings").select("id, title, price_cents, status, kind")
      .eq("owner_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
    supabase.from("wants").select("id, text, listing_id, listing:listings(title)")
      .eq("user_id", user.id).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("trade_legs").select("id, giver_id, receiver_id, listing:listings(title)")
      .not("confirmed_at", "is", null).or(`giver_id.eq.${user.id},receiver_id.eq.${user.id}`),
    supabase.from("ratings").select("trade_leg_id").eq("rater_id", user.id),
  ]);
  // Confirmed handoffs I haven't reviewed yet.
  const ratedIds = new Set(rated?.map((r) => r.trade_leg_id));
  const toRate = (done ?? []).filter((l) => !ratedIds.has(l.id))
    .map((l) => ({ ...l, other: l.giver_id === user.id ? l.receiver_id : l.giver_id }));
  const { data: names } = toRate.length
    ? await supabase.from("profiles").select("id, display_name").in("id", toRate.map((l) => l.other))
    : { data: [] };
  const nameOf = (id: string) => names?.find((n) => n.id === id)?.display_name ?? "them";

  return (
    <main className="grid md:grid-cols-2 gap-8">
      {!!toRate.length && (
        <section className="md:col-span-2 flex flex-col gap-3">
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
        <h1 className="text-3xl">What you have</h1>
        {!listings?.length && <p>Nothing posted yet. <Link href="/listings/new" className="underline">Post something</Link>.</p>}
        {listings?.map((l) => (
          <div key={l.id} className="panel flex items-center justify-between gap-3">
            <div>
              <Link href={`/listings/${l.id}`} className="font-medium underline">{l.title}</Link>
              <p className="text-sm opacity-70">{money(l.price_cents)} · {l.status}</p>
            </div>
            {l.status === "active" && <RemoveButton table="listings" id={l.id} />}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-3xl">What you want</h2>
        {!wants?.length && <p>No wants yet. <Link href="/chat" className="underline">Tell Loop what you want</Link>.</p>}
        {wants?.map((w) => {
          const matched = (w.listing as unknown as { title: string } | null)?.title;
          return (
            <div key={w.id} className="panel flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{w.text.replace(/^\[demo\] /, "")}</p>
                <p className="text-sm opacity-70">
                  {matched ? <>Matched: <Link href={`/listings/${w.listing_id}`} className="underline">{matched}</Link></> : "Waiting for a match"}
                </p>
              </div>
              <RemoveButton table="wants" id={w.id} />
            </div>
          );
        })}
      </section>
    </main>
  );
}
