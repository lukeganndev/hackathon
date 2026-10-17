import { supabaseAdmin } from "@/lib/supabase/server";

// Live campus stats for the pitch. Aggregate counts only, so reading with the
// admin client exposes nothing private (trades are otherwise participant-only).
export async function ImpactCounter({ schoolId, campuses }: { schoolId: string; campuses: number }) {
  const db = supabaseAdmin();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [students, active, loops, reused] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId)),
    count(db.from("listings").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active")),
    count(db.from("trades").select("id", { count: "exact", head: true }).eq("status", "done")),
    db.from("listings").select("price_cents").eq("school_id", schoolId).in("status", ["traded", "sold"]).then((r) => r.data ?? []),
  ]);
  const dollars = Math.round(reused.reduce((sum, l) => sum + (l.price_cents ?? 0), 0) / 100);
  const stats: [string | number, string][] = [
    [campuses, "campuses live"], [students, "students here"], [active, "listings live"],
    [reused.length, "items reused, not trashed"], [`$${dollars.toLocaleString()}`, "kept on campus"], [loops, "trade loops closed"],
  ];
  return (
    <section className="stats" aria-label="Impact">
      {stats.map(([n, label]) => <div key={label}><b>{n}</b>{label}</div>)}
    </section>
  );
}
