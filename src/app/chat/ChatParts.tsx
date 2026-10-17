"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type Anthropic from "@anthropic-ai/sdk";
import { ListingCard, type CardListing, type CardSchool } from "../ListingCard";

type Msg = Anthropic.Beta.BetaMessageParam;
export type Conv = { id: string; title: string; messages: Msg[]; updated: number };
type Store = { convs: Conv[]; current: string | null };

// Saved conversations, shared by the Ask Loop box on the campus page and the full Ask Loop screen.
// The browser keeps the raw history (thinking blocks included) and sends it back unchanged.
const KEY = "loop-chats";
const load = (): Store => { try { return JSON.parse(localStorage.getItem(KEY) ?? "") as Store; } catch { return { convs: [], current: null }; } };
const save = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
/** Forget all saved conversations (on sign-out). */
export const clearLoopChat = () => { try { localStorage.removeItem(KEY); localStorage.removeItem("loop-chat"); } catch {} };

// AI texts already shown in this browser session: never retype them after a page change.
const seen = new Set<string>();

export function useLoopChat() {
  const [store, setStore] = useState<Store>({ convs: [], current: null });
  useEffect(() => {
    const s = load();
    s.convs.forEach((c) => render(c.messages).forEach((r) => r.kind === "ai" && seen.add(r.text)));
    setStore(s);
  }, []);
  const update = (fn: (s: Store) => Store) => setStore((old) => { const next = fn(old); save(next); return next; });

  const conv = store.convs.find((c) => c.id === store.current) ?? null;
  const messages = conv?.messages ?? [];
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function send(text: string): Promise<boolean> {
    if (!text.trim() || busy) return false;
    setError("");
    setBusy(true);
    setStatus("");
    const id = conv?.id ?? crypto.randomUUID();
    const title = conv?.title ?? text.slice(0, 48);
    const before = messages;
    const write = (msgs: Msg[]) => update((s) => ({
      current: id,
      convs: [{ id, title, messages: msgs, updated: Date.now() }, ...s.convs.filter((c) => c.id !== id)],
    }));
    const next: Msg[] = [...before, { role: "user", content: text }];
    write(next);
    const fail = (msg: string) => { setBusy(false); setStatus(""); write(before); setError(msg); return false; };
    const res = await fetch("/api/ai/chat", { method: "POST", body: JSON.stringify({ messages: next }) });
    if (!res.ok || !res.body) return fail((await res.json().catch(() => ({}))).error ?? "Something went wrong");
    // Progress lines arrive as the agent works; the last line has the full history.
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop()!;
      for (const line of lines.filter(Boolean)) {
        const ev = JSON.parse(line);
        if (ev.status) setStatus(ev.status);
        if (ev.error) return fail(ev.error);
        if (ev.messages) write(ev.messages);
      }
    }
    setBusy(false);
    setStatus("");
    return true;
  }

  return {
    messages, busy, status, error, send,
    convs: store.convs, current: store.current,
    open: (id: string) => update((s) => ({ ...s, current: id })),
    reset: () => { update((s) => ({ ...s, current: null })); setError(""); },
    remove: (id: string) => update((s) => ({ current: s.current === id ? null : s.current, convs: s.convs.filter((c) => c.id !== id) })),
  };
}

type Listing = CardListing & { school?: CardSchool };
type Leg = { gives: string; receives: string; item?: string };
type Item =
  | { kind: "me" | "ai"; text: string }
  | { kind: "chip"; text: string; href?: string }
  | { kind: "listings"; listings: Listing[] }
  | { kind: "loop"; legs: Leg[]; tradeId?: string };

// What the student sees: their words, Claude's text, and cards for what the tools did.
export function render(messages: Msg[]): Item[] {
  const out: Item[] = [];
  let lastLoop: Leg[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") { out.push({ kind: m.role === "user" ? "me" : "ai", text: m.content }); continue; }
    for (const b of m.content) {
      // Hide the "(Today is …)" date note the server adds to the first message.
      if (b.type === "text" && b.text.trim()) out.push({ kind: m.role === "user" ? "me" : "ai", text: b.text.replace(/^\(Today is [^)]*\)\s*/, "") });
      if (b.type !== "tool_result" || typeof b.content !== "string" || b.is_error) continue;
      const r = JSON.parse(b.content);
      if (r.saved?.title) out.push({ kind: "chip", text: `📦 Listed: ${r.saved.title}`, href: `/listings/${r.saved.id}` });
      if (r.saved?.text) out.push({ kind: "chip", text: `🔍 Wants: ${r.saved.text}${r.saved.listing_id ? " (matched)" : ""}`, href: r.saved.listing_id ? `/listings/${r.saved.listing_id}` : undefined });
      if (r.results?.length && r.results[0].school && r.show !== false) out.push({ kind: "listings", listings: r.results });
      if (r.updated?.id) {
        out.push({ kind: "chip", text: r.updated.status === "removed" ? `🗑️ Taken down: ${r.updated.title}` : `✏️ Updated: ${r.updated.title}` });
        if (r.updated.status !== "removed") out.push({ kind: "listings", listings: [r.updated] });
      }
      if (r.loops?.length) { lastLoop = r.loops[0].legs; out.push({ kind: "loop", legs: lastLoop }); }
      if (r.proposed?.id) {
        // Swap the "found" card for a "started" card.
        let i = out.length - 1;
        while (i >= 0 && out[i].kind !== "loop") i--;
        if (i >= 0) out.splice(i, 1);
        out.push({ kind: "loop", legs: lastLoop, tradeId: r.proposed.id });
      }
    }
  }
  return out;
}

function LoopCard({ legs, tradeId }: { legs: Leg[]; tradeId?: string }) {
  return (
    <div className="loop-card">
      <div className="loop-card-head">
        <span className="loop-spin" aria-hidden>↻</span>
        <b>{tradeId ? "Loop started!" : `Found a ${legs.length}-person loop`}</b>
      </div>
      <ol>{legs.map((l, i) => <li key={i}><b>{l.gives}</b> gives <i>{l.item ?? "an item"}</i> to <b>{l.receives}</b></li>)}</ol>
      {tradeId
        ? <Link href={`/trades/${tradeId}`} className="btn" style={{ padding: "8px 14px" }}>Open the trade →</Link>
        : <Link href="/trades" className="btn-ghost" style={{ padding: "8px 14px" }}>See loops →</Link>}
    </div>
  );
}

export function Thread({ messages }: { messages: Msg[] }) {
  return (
    <>
      {render(messages).map((r, i) => {
        if (r.kind === "chip") return r.href
          ? <Link key={`c${i}:${r.text}`} href={r.href} className="ai-chip">{r.text}</Link>
          : <span key={`c${i}:${r.text}`} className="ai-chip">{r.text}</span>;
        if (r.kind === "listings") return (
          <div key={`l${i}`} className="chat-cards">
            {r.listings.slice(0, 8).map((l, j) => l.school && <ListingCard key={l.id} l={l} school={l.school} delay={j * 60} />)}
          </div>
        );
        if (r.kind === "loop") return <LoopCard key={`o${i}:${r.tradeId ?? ""}`} legs={r.legs} tradeId={r.tradeId} />;
        return <p key={`${r.kind}:${r.text}`} className={`bubble ${r.kind}`}>{r.kind === "ai" ? <TypeText text={r.text} /> : r.text}</p>;
      })}
    </>
  );
}

/** Reveals text word by word on first mount, like it's being typed. Already-shown text stays put. */
export function TypeText({ text, speed = 28 }: { text: string; speed?: number }) {
  const words = text.split(/(\s+)/);
  const [n, setN] = useState(() => (seen.has(text) ? words.length : 0));
  useEffect(() => {
    seen.add(text);
    if (n >= words.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(words.length);
    const t = setInterval(() => setN((v) => (v >= words.length ? v : v + 1)), speed);
    return () => clearInterval(t);
  }, [words.length, speed]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = n >= words.length;
  return <>{words.slice(0, n).join("")}{!done && <span className="caret" aria-hidden />}</>;
}

/** Small working pill: spinner + shimmering status label. */
export function ThinkingPill({ label }: { label: string }) {
  return (
    <span className="think" role="status">
      <svg viewBox="0 0 24 24" aria-hidden>{Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="12" y1="3" x2="12" y2="7" transform={`rotate(${i * 45} 12 12)`} style={{ opacity: (i + 1) / 8 }} />
      ))}</svg>
      <span className="shimmer">{label || "Thinking…"}</span>
    </span>
  );
}
