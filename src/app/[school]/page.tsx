import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SchoolPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const supabase = await supabaseServer();
  const { data: school } = await supabase.from("schools").select("*").eq("slug", slug).single();
  if (!school) notFound();
  const { data: listings } = await supabase
    .from("listings").select("id, title, price_cents, photo_url, kind")
    .eq("school_id", school.id).eq("status", "active").order("created_at", { ascending: false });

  return (
    <main className="flex flex-col gap-3" style={{ "--school": school.colors.primary } as React.CSSProperties}>
      <h1 className="text-2xl font-bold text-[var(--school)]">{school.name}</h1>
      <div className="flex flex-wrap gap-3">
        <Link href="/listings/new" className="rounded bg-[var(--school)] text-white px-5 py-3 font-semibold">
          + Sell or trade something
        </Link>
        <Link href="/chat" className="rounded border border-[var(--school)] px-5 py-3 font-semibold">
          💬 Tell Loop what you want
        </Link>
      </div>
      {!listings?.length && <p>No listings yet (sign in to see your campus).</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings?.map((l) => (
          <Link key={l.id} href={`/listings/${l.id}`} className="rounded-xl border overflow-hidden">
            {l.photo_url
              ? <img src={l.photo_url} alt="" className="aspect-square w-full object-cover" />
              : <div className="aspect-square grid place-items-center text-3xl bg-gray-100 dark:bg-gray-800">
                  {l.kind === "ride" ? "🚗" : l.kind === "service" ? "🛠" : "📦"}
                </div>}
            <div className="p-2">
              <p className="font-medium line-clamp-2">{l.title}</p>
              <p className="text-sm">{l.price_cents == null ? "Trade only" : `$${(l.price_cents / 100).toFixed(2)}`}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
