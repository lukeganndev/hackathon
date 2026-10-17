import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function SchoolPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params;
  const supabase = await supabaseServer();
  const { data: school } = await supabase.from("schools").select("*").eq("slug", slug).single();
  if (!school) notFound();
  const { data: listings } = await supabase
    .from("listings").select("id, title, price_cents, photo_url")
    .eq("school_id", school.id).eq("status", "active").order("created_at", { ascending: false });

  return (
    <main className="flex flex-col gap-3" style={{ "--school": school.colors.primary } as React.CSSProperties}>
      <h1 className="text-2xl font-bold text-[var(--school)]">{school.name}</h1>
      {!listings?.length && <p>No listings yet (sign in to see your campus).</p>}
      {listings?.map((l) => (
        <div key={l.id} className="rounded-xl border p-3">
          {l.title} {l.price_cents != null && `· $${(l.price_cents / 100).toFixed(2)}`}
        </div>
      ))}
    </main>
  );
}
