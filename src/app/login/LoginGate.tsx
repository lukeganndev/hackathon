"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ink, themeVars, type School } from "@/lib/schoolTheme";
import { Crest } from "../Crest";

type GateSchool = School & { email_domains: string[] };

// Find the school for an email, including subdomains (mail.umich.edu -> umich.edu).
const resolve = (email: string, schools: GateSchool[]) => {
  const dom = email.toLowerCase().split("@")[1] ?? "";
  if (!dom.includes(".")) return null;
  return schools.find((s) => s.email_domains.some((d) => dom === d || dom.endsWith("." + d))) ?? null;
};

// Sign-in gate from the design: type your .edu and the whole page rethemes to your school.
// Email OTP: Supabase emails a 6-digit code (template includes {{ .Token }}).
export function LoginGate({ schools }: { schools: GateSchool[] }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0); // seconds until "resend" is allowed
  const [welcome, setWelcome] = useState<GateSchool | null>(null);
  const school = resolve(email, schools);

  // Retheme the page live as the student types.
  useEffect(() => {
    const vars = themeVars(school) as Record<string, string>;
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  }, [school]);

  // Each send emails a NEW code and voids the old one, so block double-clicks and rapid resends.
  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || wait) return;
    if (!school) return setError("Use your school email. We support .edu addresses from our partner campuses.");
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
    // Welcome splash in school colors, then into the campus marketplace.
    setWelcome(school);
    setTimeout(() => { router.push(`/${school?.slug ?? ""}`); router.refresh(); }, 2300);
  }

  return (
    <>
      {welcome && (
        <div className="wel" style={{ ...themeVars(welcome), color: ink(welcome.colors.primary) }}>
          <div><Crest school={welcome} /><h2>{welcome.slogan ?? "Welcome"}!</h2><p style={{ opacity: .85 }}>Welcome to the {welcome.name} marketplace</p></div>
        </div>
      )}
      <div className="gate">
        <h1>Your campus, on Loop.</h1>
        <p>Sign in with your school email. We read your .edu and open your campus marketplace automatically.</p>
        <div className="flex items-center gap-3" style={{ minHeight: 64 }} aria-live="polite">
          {school && <><Crest school={school} className="crest" /><div><b>{school.name}</b><br /><small className="mute">{school.slogan}</small></div></>}
        </div>
        {!sent ? (
          <form onSubmit={send} className="flex flex-col gap-2">
            <label htmlFor="email" className="sr-only">School email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="you@crimson.ua.edu" />
            <button disabled={busy} className="btn">{busy ? "Sending…" : "Send verification code"}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-2">
            <label htmlFor="code">Code sent to {email}</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} placeholder="6-digit code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ letterSpacing: ".3em" }} />
            <button disabled={busy} className="btn">{busy ? "Checking…" : "Verify and enter"}</button>
            <p className="note">It can take up to a minute to arrive. Check spam. Only the newest code works.</p>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => send()} disabled={busy || wait > 0} className="underline disabled:no-underline disabled:opacity-50" style={{ background: "none", border: 0 }}>
                {wait ? `Resend in ${wait}s` : "Resend code"}
              </button>
              <button type="button" onClick={() => { setSent(false); setWait(0); setError(""); }} className="underline" style={{ background: "none", border: 0 }}>Use a different email</button>
            </div>
          </form>
        )}
        {error && <p role="alert" style={{ color: "#b3261e" }}>{error}</p>}
        <p className="note" style={{ marginTop: 16 }}>Try typing <b>@vt.edu</b>, <b>@umich.edu</b> or <b>@lsu.edu</b>: the whole site rethemes to that school. {schools.length} campuses are live.</p>
      </div>
    </>
  );
}
