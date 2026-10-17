"use client";
import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0); // seconds until "resend" is allowed

  // Each send emails a NEW code and voids the old one, so block double-clicks and rapid resends.
  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || wait) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) return setError(error.message.includes("Database error") ? "Use your school email (e.g. @crimson.ua.edu)" : error.message);
    setError("");
    setCode("");
    setSent(true);
    setWait(60);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setBusy(false);
      return setError(error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")
        ? "That code didn't work. Use the code from the newest email, or resend." : error.message);
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("schools(slug)").eq("id", user!.id).single();
    router.push(`/${(data?.schools as unknown as { slug: string })?.slug ?? ""}`);
    router.refresh();
  }

  return (
    <main className="flex flex-col gap-3 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {!sent ? (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="email">School email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="border rounded p-3" placeholder="you@crimson.ua.edu" />
          <button disabled={busy} className="rounded bg-black text-white p-3 disabled:opacity-50">{busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-2">
          <label htmlFor="code">Code sent to {email}</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="border rounded p-3 tracking-widest" />
          <button disabled={busy} className="rounded bg-black text-white p-3 disabled:opacity-50">{busy ? "Checking…" : "Verify"}</button>
          <p className="text-sm opacity-70">It can take up to a minute to arrive. Check spam. Only the newest code works.</p>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => send()} disabled={busy || wait > 0} className="underline disabled:no-underline disabled:opacity-50">
              {wait ? `Resend in ${wait}s` : "Resend code"}
            </button>
            <button type="button" onClick={() => { setSent(false); setWait(0); setError(""); }} className="underline">Use a different email</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </main>
  );
}
