import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

// Signed in: straight to your campus. Signed out: the sign-in gate.
export default async function Home() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("profiles").select("school:schools(slug)").eq("id", user.id).single();
  redirect(`/${(data?.school as unknown as { slug: string })?.slug ?? "login"}`);
}
