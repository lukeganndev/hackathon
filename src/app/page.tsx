import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data: schools } = await supabase.from("schools").select("slug, name, colors").order("name");
  return (
    <main className="flex flex-col gap-3">
      <h1 className="text-3xl font-bold">Loop</h1>
      <p>Trade with your campus. Pick your school:</p>
      {schools?.map((s) => (
        <Link key={s.slug} href={`/${s.slug}`} className="rounded-xl p-4 text-white font-semibold"
          style={{ background: s.colors.primary }}>
          {s.name}
        </Link>
      ))}
      <Link href="/login" className="underline">Sign in with your .edu email</Link>
    </main>
  );
}
