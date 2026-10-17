"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LoopMark } from "./Crest";
import { clearLoopChat } from "./chat/ChatParts";

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

// Phone bottom tab bar from the mobile design (shown under 760px).
const TAB_ICONS: Record<string, string> = {
  Browse: "M3 10.5L12 3l9 7.5V21H3zM9 21v-6h6v6",
  Sell: "M12 5v14M5 12h14",
  Ask: "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z",
  Loops: "M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3",
  Me: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
};
export function MobileNav({ slug }: { slug: string }) {
  const path = usePathname();
  const tabs: [string, string][] = [[`/${slug}`, "Browse"], ["/listings/new", "Sell"], ["/chat", "Ask"], ["/trades", "Loops"], ["/listings/mine", "Me"]];
  return (
    <nav className="mnav" aria-label="Main">
      {tabs.map(([href, label]) => {
        const on = path === href || (href === "/trades" && path.startsWith("/trades"));
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden className={label === "Sell" ? "sell" : undefined}><path d={TAB_ICONS[label]} /></svg>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SignOut() {
  const router = useRouter();
  return (
    <button className="mute" style={{ background: "none", border: 0, padding: "0 0 0 6px" }}
      onClick={async () => { clearLoopChat(); await supabaseBrowser().auth.signOut(); router.push("/login"); router.refresh(); }}>
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
