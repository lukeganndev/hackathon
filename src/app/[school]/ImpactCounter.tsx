import { supabaseAdmin } from "@/lib/supabase/server";

// Live campus stats for the pitch. Aggregate counts only, so reading with the
// admin client exposes nothing private (trades are otherwise participant-only).
export async function ImpactCounter({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const db = supabaseAdmin();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [students, active, loops, reused] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId)),
    count(db.from("listings").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active")),
    count(db.from("trades").select("id", { count: "exact", head: true }).eq("status", "done")),
    db.from("listings").select("price_cents").eq("school_id", schoolId).in("status", ["traded", "sold"]).then((r) => r.data ?? []),
  ]);
  const dollars = Math.round(reused.reduce((sum, l) => sum + (l.price_cents ?? 0), 0) / 100);

  const stats = [
    { n: students, label: "students on Loop" },
    { n: active, label: "listings live now" },
    { n: reused.length, label: "items reused, not trashed" },
    { n: `$${dollars.toLocaleString()}`, label: "of stuff kept on campus" },
    { n: loops, label: "trade loops closed, all campuses" },
  ];
  return (
    <section aria-label={`${schoolName} impact`} className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-[var(--school)] tabular-nums">{s.n}</p>
          <p className="text-xs opacity-70">{s.label}</p>
        </div>
      ))}
    </section>
  );
}
