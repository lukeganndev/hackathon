import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { RemoveButton } from "./RemoveButton";

const money = (c: number | null) => (c == null ? "Trade only" : `$${(c / 100).toFixed(2)}`);

export default async function MyStuff() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see your stuff.</main>;

  const [{ data: listings }, { data: wants }] = await Promise.all([
    supabase.from("listings").select("id, title, price_cents, status, kind")
      .eq("owner_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
    supabase.from("wants").select("id, text, listing_id, listing:listings(title)")
      .eq("user_id", user.id).eq("active", true).order("created_at", { ascending: false }),
  ]);

  return (
    <main className="grid md:grid-cols-2 gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">What you have</h1>
        {!listings?.length && <p>Nothing posted yet. <Link href="/listings/new" className="underline">Post something</Link>.</p>}
        {listings?.map((l) => (
          <div key={l.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
            <div>
              <Link href={`/listings/${l.id}`} className="font-medium underline">{l.title}</Link>
              <p className="text-sm opacity-70">{money(l.price_cents)} · {l.status}</p>
            </div>
            {l.status === "active" && <RemoveButton table="listings" id={l.id} />}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">What you want</h2>
        {!wants?.length && <p>No wants yet. <Link href="/chat" className="underline">Tell Loop what you want</Link>.</p>}
        {wants?.map((w) => {
          const matched = (w.listing as unknown as { title: string } | null)?.title;
          return (
            <div key={w.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
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
