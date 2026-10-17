import { supabaseServer } from "@/lib/supabase/server";
import { LoginGate } from "./LoginGate";

export default async function Login() {
  const db = await supabaseServer();
  const { data: schools } = await db.from("schools").select("id, slug, name, colors, slogan, logo_url, email_domains").order("name");
  return <LoginGate schools={schools ?? []} />;
}
