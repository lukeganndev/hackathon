"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LoopMark } from "./Crest";
import { clearLoopChat } from "./chat/ChatParts";

export function Nav({ slug, unread }: { slug: string; unread: number }) {
  const path = usePathname();
  const links: [string, string][] = [
    [`/${slug}`, "Browse"], ["/listings/new", "Sell"], ["/chat", "Ask Loop"], ["/trades", "Loops"], ["/messages", "Messages"], ["/listings/mine", "My stuff"],
  ];
  return (
    <nav className="nav" aria-label="Main">
      {links.map(([href, label]) => (
        <Link key={href} href={href} aria-current={path === href || (href === "/trades" && path.startsWith("/trades")) ? "page" : undefined}>{label}{href === "/messages" && unread > 0 && <span className="badge-dot">{unread}</span>}</Link>
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

export function useSignOut() {
  const router = useRouter();
  return async () => { clearLoopChat(); await supabaseBrowser().auth.signOut(); router.push("/login"); router.refresh(); };
}

// The "school · name" chip in the header opens the account menu.
export function AccountMenu({ userId, name, school, slug }: { userId: string; name: string; school: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const signOut = useSignOut();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const items: [string, string, string][] = [
    [`/u/${userId}`, TAB_ICONS.Me, "View my profile"],
    ["/listings/mine", "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10", "My listings & wants"],
    ["/trades", TAB_ICONS.Loops, "My loops"],
    ["/listings/new", TAB_ICONS.Sell, "Post something"],
    ["/messages", "M4 4h16v12H8l-4 4zM8 9h8M8 12h5", "Messages & offers"],
    ["/chat", TAB_ICONS.Ask, "Ask Loop chats"],
    [`/${slug}?all=1`, "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18", "Browse all campuses"],
    ["/settings", "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z", "Settings"],
  ];  return (
    <div className="acct" ref={ref}>
      <button className="chip who" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <i className="dot" /><span className="who-text">{school} · </span>{name}<span aria-hidden className={open ? "caret-up" : ""}>▾</span>
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-head">
            <span className="acct-av" aria-hidden>{name[0]?.toUpperCase()}</span>
            <div><b>{name}</b><small>{school} · .edu verified</small></div>
          </div>
          {items.map(([href, d, label]) => <Link key={href} href={href} role="menuitem"><svg viewBox="0 0 24 24" aria-hidden><path d={d} /></svg>{label}</Link>)}
          <button role="menuitem" onClick={signOut}><svg viewBox="0 0 24 24" aria-hidden><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>Sign out</button>
        </div>
      )}
    </div>
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
