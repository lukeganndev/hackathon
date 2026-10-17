"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Email OTP: Supabase emails a 6-digit code (email template must include {{ .Token }}).
export default function Login() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message.includes("Database error") ? "Use your school email (e.g. @crimson.ua.edu)" : error.message);
    else { setError(""); setSent(true); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) return setError(error.message);
    const { data } = await supabase.from("profiles").select("schools(slug)").single();
    router.push(`/${(data?.schools as unknown as { slug: string })?.slug ?? ""}`);
    router.refresh();
  }

  return (
    <main className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {!sent ? (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="email">School email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="border rounded p-3" placeholder="you@crimson.ua.edu" />
          <button className="rounded bg-black text-white p-3">Send code</button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-2">
          <label htmlFor="code">Code sent to {email}</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code}
            onChange={(e) => setCode(e.target.value)} className="border rounded p-3 tracking-widest" />
          <button className="rounded bg-black text-white p-3">Verify</button>
        </form>
      )}
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </main>
  );
}
