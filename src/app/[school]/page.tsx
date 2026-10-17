import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { shortName, themeVars, type School } from "@/lib/schoolTheme";
import { Crest } from "../Crest";
import { ListingCard } from "../ListingCard";
import { ImpactCounter } from "./ImpactCounter";
import { LoopBanner } from "./LoopBanner";

type Row = { id: string; title: string; price_cents: number | null; photo_url: string | null; kind: string; category: string | null; school_id: string; owner: { display_name: string } | null };
const CATS = ["textbooks", "clothing", "tickets", "furniture", "electronics", "dorm", "lab", "tutoring", "rides", "other"];

export default async function SchoolPage({ params, searchParams }: {
  params: Promise<{ school: string }>;
  searchParams: Promise<{ all?: string; q?: string; cat?: string }>;
}) {
  const { school: slug } = await params;
  const { all: allParam, q = "", cat = "" } = await searchParams;
  const all = allParam === "1";
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: school } = await supabase.from("schools").select("id, slug, name, colors, slogan, logo_url, email_domains").eq("slug", slug).single();
  if (!school) notFound();

  let query = supabase.from("listings").select("id, title, price_cents, photo_url, kind, category, school_id, owner:profiles(display_name)")
    .eq("status", "active").order("created_at", { ascending: false }).limit(60);
  if (!all) query = query.eq("school_id", school.id);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  if (cat) query = query.eq("category", cat);
  const { data } = await query;
  const listings = (data ?? []) as unknown as Row[];

  // Schools shown on cards (only the ones we need), recent activity for the ticker,
  // and a "just joined" banner for schools added in the last 30 minutes (the live demo).
  const ids = [...new Set([school.id, ...listings.map((l) => l.school_id)])];
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const [{ data: cardSchools }, { data: recent }, { data: newSchools }, { count: campuses }] = await Promise.all([
    supabase.from("schools").select("id, name, colors, email_domains").in("id", ids),
    supabase.from("listings").select("title, status, school:schools(name)").order("created_at", { ascending: false }).limit(12),
    supabase.from("schools").select("id, slug, name, colors, slogan, logo_url").neq("id", school.id).gte("created_at", since).order("created_at", { ascending: false }).limit(1),
    supabase.from("schools").select("id", { count: "exact", head: true }),
  ]);
  const byId = Object.fromEntries((cardSchools ?? []).map((s) => [s.id, s]));
  const short = shortName(school.name);
  const tab = (href: string, on: boolean, label: string) => <Link href={href} aria-current={on ? "page" : undefined}>{label}</Link>;

  return (
    <div className="flex flex-col gap-6" style={themeVars(school as School)}>
      {(newSchools as School[] | null)?.map((s) => (
        <Link key={s.id} href={`/${slug}?all=1`} className="panel flex items-center gap-4" style={{ borderColor: s.colors.primary }}>
          <Crest school={s} className="crest" />
          <span><b className="serif" style={{ fontSize: 22 }}>{s.name} just joined Loop. {s.slogan}!</b><br />
            <span className="mute">Cross-campus trading is live. Be the first to trade with {shortName(s.name)} →</span></span>
        </Link>
      ))}

      <section className="band">
        <Crest school={school as School} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <small>{school.name} · verified {school.email_domains?.[0]}</small>
          <h1>{all ? "Every campus, one loop." : `${school.slogan ?? short}.`}</h1>
          <p>{all
            ? `Browsing ${campuses ?? 1} verified campuses. Trade across schools in loops, not pairs.`
            : `The ${short} student marketplace. Buy, sell and trade in loops with classmates. Only verified ${school.email_domains?.[0]} students.`}</p>
        </div>
      </section>

      {!!recent?.length && (
        <div className="tick" aria-hidden>
          <div>{[...recent, ...recent].map((r, i) => (
            <span key={i}><b>{r.status === "active" ? "New" : r.status === "sold" ? "Sold" : "Traded"}</b>{r.title} · {(r.school as unknown as { name: string })?.name}</span>
          ))}</div>
        </div>
      )}

      {user && <LoopBanner userId={user.id} />}
      <ImpactCounter schoolId={school.id} campuses={campuses ?? 1} />

      <form className="flex flex-wrap gap-3 items-center" action={`/${slug}`}>
        <nav className="seg" aria-label="Which campuses">
          {tab(`/${slug}`, !all, "My campus")}
          {tab(`/${slug}?all=1`, all, "All campuses")}
        </nav>
        {all && <input type="hidden" name="all" value="1" />}
        <label className="sr-only" htmlFor="q">Search listings</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search listings" style={{ flex: 1, minWidth: 160 }} />
        <label className="sr-only" htmlFor="cat">Category</label>
        <select id="cat" name="cat" defaultValue={cat}>
          <option value="">All categories</option>
          {CATS.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button className="btn-ghost">Search</button>
        <Link href="/listings/new" className="btn">+ Sell or trade</Link>
      </form>

      {!listings.length && <p className="mute" style={{ padding: "40px 0" }}>{user ? "Nothing here yet. Be the first to list something." : "Sign in to see your campus."}</p>}
      <div className="lgrid">
        {listings.map((l, i) => (
          <ListingCard key={l.id} l={l} school={byId[l.school_id] ?? school} seller={l.owner?.display_name}
            delay={i * 40} mine={all && l.school_id === school.id} />
        ))}
      </div>
    </div>
  );
}
