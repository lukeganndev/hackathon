import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function Settings() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main><Link href="/login" className="underline">Sign in</Link> to see settings.</main>;
  const { data: p } = await supabase.from("profiles").select("display_name, school:schools(name)").eq("id", user.id).single();
  const school = (p?.school as unknown as { name: string } | null)?.name;

  return (
    <main className="flex flex-col gap-4" style={{ maxWidth: 620 }}>
      <h1 className="text-4xl">Settings</h1>
      <section className="panel flex flex-col gap-1">
        <h2 className="text-xl">Account</h2>
        <p>{user.email}</p>
        <p className="text-sm" style={{ color: "var(--mute)" }}>{school} · .edu verified. Your school comes from your email and can&apos;t be changed. Your email is never shown to other students.</p>
        <Link href={`/u/${user.id}`} className="underline text-sm">View my public profile →</Link>
      </section>
      <SettingsForm userId={user.id} name={p?.display_name ?? ""} />
    </main>
  );
}
