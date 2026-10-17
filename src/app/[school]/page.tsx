import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type School = { id: string; slug: string; name: string; colors: { primary: string } };

export default async function SchoolPage({ params, searchParams }: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ all?: string }>;
}) {
  const { school: slug } = await params;
  const all = (await searchParams).all === "1";
  const supabase = await supabaseServer();
  const { data: schools } = await supabase.from("schools").select("id, slug, name, colors").order("created_at");
  const school = schools?.find((s: School) => s.slug === slug);
  if (!school) notFound();
  const others = schools!.filter((s: School) => s.id !== school.id);
  const byId = Object.fromEntries(schools!.map((s: School) => [s.id, s]));

  let q = supabase.from("listings").select("id, title, price_cents, photo_url, kind, school_id")
    .eq("status", "active").order("created_at", { ascending: false });
  if (!all) q = q.eq("school_id", school.id);
  const { data: listings } = await q;

  // Rivalry banner: how many listings each other campus has right now.
  const counts = await Promise.all(others.map(async (s: School) => {
    const { count } = await supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("school_id", s.id).eq("status", "active");
    return { ...s, count: count ?? 0 };
  }));

  const tab = (on: boolean) => `px-4 py-2 rounded-full font-semibold ${on ? "bg-[var(--school)] text-white" : "border"}`;

  return (
    <main className="flex flex-col gap-4" style={{ "--school": school.colors.primary } as React.CSSProperties}>
      {counts.map((s) => (
        <Link key={s.id} href={`/${slug}?all=1`} className="rounded-xl p-4 text-white flex flex-wrap items-center justify-between gap-2"
          style={{ background: `linear-gradient(90deg, ${school.colors.primary}, ${s.colors.primary})` }}>
          <span className="font-bold">🏈 Rivalry mode: {s.name} is on Loop</span>
          <span>{s.count ? `${s.count} listing${s.count === 1 ? "" : "s"} you can trade for →` : "Just joined. Be the first to trade across campuses →"}</span>
        </Link>
      ))}

      <h1 className="text-3xl font-bold text-[var(--school)]">{school.name}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2" aria-label="Which campuses">
          <Link href={`/${slug}`} className={tab(!all)} aria-current={!all ? "page" : undefined}>{school.name.replace(/^The /, "")}</Link>
          <Link href={`/${slug}?all=1`} className={tab(all)} aria-current={all ? "page" : undefined}>All campuses</Link>
        </nav>
        <div className="flex flex-wrap gap-3">
          <Link href="/listings/new" className="rounded bg-[var(--school)] text-white px-5 py-3 font-semibold">
            + Sell or trade something
          </Link>
          <Link href="/chat" className="rounded border border-[var(--school)] px-5 py-3 font-semibold">
            💬 Tell Loop what you want
          </Link>
        </div>
      </div>

      {!listings?.length && <p>No listings yet (sign in to see your campus).</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings?.map((l) => {
          const from = byId[l.school_id];
          return (
            <Link key={l.id} href={`/listings/${l.id}`} className="rounded-xl border overflow-hidden">
              {l.photo_url
                ? <img src={l.photo_url} alt="" className="aspect-square w-full object-cover" />
                : <div className="aspect-square grid place-items-center text-3xl bg-gray-100 dark:bg-gray-800">
                    {l.kind === "ride" ? "🚗" : l.kind === "service" ? "🛠" : "📦"}
                  </div>}
              <div className="p-2">
                <p className="font-medium line-clamp-2">{l.title}</p>
                <p className="text-sm">{l.price_cents == null ? "Trade only" : `$${(l.price_cents / 100).toFixed(2)}`}</p>
                {all && (
                  <p className="text-xs mt-1 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: from.colors.primary }} aria-hidden />
                    {from.name.replace(/^The /, "")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
