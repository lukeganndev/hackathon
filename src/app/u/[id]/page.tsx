import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Stars } from "../Stars";

// Public-to-students profile: rating, reviews, and what they're offering.
export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see profiles.</main>;

  const { data: person } = await supabase.from("profiles")
    .select("id, display_name, created_at, school:schools(name, colors)").eq("id", id).single();
  if (!person) notFound();
  const school = person.school as unknown as { name: string; colors: { primary: string } };

  const [{ data: summary }, { data: reviews }, { data: listings }] = await Promise.all([
    supabase.from("rating_summary").select("avg_stars, review_count").eq("ratee_id", id).maybeSingle(),
    supabase.from("ratings").select("id, stars, comment, created_at, rater:profiles!ratings_rater_id_fkey(id, display_name)")
      .eq("ratee_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("listings").select("id, title, price_cents").eq("owner_id", id).eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="grid md:grid-cols-[1fr_2fr] gap-8" style={{ "--school": school.colors.primary } as React.CSSProperties}>
      <section className="flex flex-col gap-2">
        <div className="w-16 h-16 rounded-full grid place-items-center text-2xl font-bold text-white bg-[var(--school)]" aria-hidden>
          {person.display_name?.[0]?.toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold">{person.display_name}{person.id === user.id && " (you)"}</h1>
        <p className="text-sm opacity-70">{school.name} · .edu verified · joined {new Date(person.created_at).toLocaleDateString([], { month: "short", year: "numeric" })}</p>
        <Stars avg={summary?.avg_stars ?? null} count={summary?.review_count ?? 0} />
        <h2 className="text-lg font-semibold mt-4">Offering</h2>
        {!listings?.length && <p className="text-sm opacity-70">Nothing right now.</p>}
        {listings?.map((l) => (
          <Link key={l.id} href={`/listings/${l.id}`} className="underline">
            {l.title} · {l.price_cents == null ? "Trade only" : `$${(l.price_cents / 100).toFixed(2)}`}
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <p className="text-sm opacity-70">Only students who completed a handoff with them (confirmed by code) can leave a review.</p>
        {!reviews?.length && <p>No reviews yet.</p>}
        {reviews?.map((r) => {
          const rater = r.rater as unknown as { id: string; display_name: string };
          return (
            <article key={r.id} className="rounded-xl border p-3">
              <p><span className="text-amber-500" aria-label={`${r.stars} stars`}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span></p>
              {r.comment && <p className="mt-1">{r.comment}</p>}
              <p className="text-xs opacity-70 mt-1">
                <Link href={`/u/${rater.id}`} className="underline">{rater.display_name}</Link> · {new Date(r.created_at).toLocaleDateString()}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
