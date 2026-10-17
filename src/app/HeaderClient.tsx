"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LoopMark } from "./Crest";

export function Nav({ slug }: { slug: string }) {
  const path = usePathname();
  const links: [string, string][] = [
    [`/${slug}`, "Browse"], ["/listings/new", "Sell"], ["/chat", "Ask Loop"], ["/trades", "Loops"], ["/listings/mine", "My stuff"],
  ];
  return (
    <nav className="nav" aria-label="Main">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href || (href === "/trades" && path.startsWith("/trades")) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

export function SignOut() {
  const router = useRouter();
  return (
    <button className="mute" style={{ background: "none", border: 0, padding: "0 0 0 6px" }}
      onClick={async () => { await supabaseBrowser().auth.signOut(); router.push("/login"); router.refresh(); }}>
      Sign out
    </button>
  );
}

// The design's logo intro, once per browser session.
export function Intro() {
  const [phase, setPhase] = useState<"show" | "go" | "done">("done");
  useEffect(() => {
    try { if (sessionStorage.getItem("loop-intro")) return; sessionStorage.setItem("loop-intro", "1"); } catch { return; }
    setPhase("show");
    const a = setTimeout(() => setPhase("go"), 2400), b = setTimeout(() => setPhase("done"), 3400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (phase === "done") return null;
  return <div className={`intro ${phase === "go" ? "go" : ""}`} aria-hidden><div><LoopMark /><b>Loop</b></div></div>;
}
