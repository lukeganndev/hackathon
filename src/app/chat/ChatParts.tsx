"use client";
import { useState } from "react";
import Link from "next/link";
import type Anthropic from "@anthropic-ai/sdk";

type Msg = Anthropic.Beta.BetaMessageParam;

// Shared by the full /chat page and the Ask Loop box on the campus page.
// The browser keeps the raw history (thinking blocks included) and sends it back unchanged.
export function useLoopChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function send(text: string): Promise<boolean> {
    if (!text.trim() || busy) return false;
    setError("");
    setBusy(true);
    setStatus("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    const fail = (msg: string) => { setBusy(false); setStatus(""); setMessages(messages); setError(msg); return false; };
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
        if (ev.messages) setMessages(ev.messages);
      }
    }
    setBusy(false);
    setStatus("");
    return true;
  }

  return { messages, busy, status, error, send };
}

// What the student sees: their own words, Claude's text, and a chip per saved have/want.
export function render(messages: Msg[]) {
  const out: { who: "me" | "ai" | "chip"; text: string; href?: string }[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") { out.push({ who: m.role === "user" ? "me" : "ai", text: m.content }); continue; }
    for (const b of m.content) {
      // Hide the "(Today is …)" date note the server adds to the first message.
      if (b.type === "text" && b.text.trim()) out.push({ who: m.role === "user" ? "me" : "ai", text: b.text.replace(/^\(Today is [^)]*\)\s*/, "") });
      if (b.type === "tool_result" && typeof b.content === "string" && !b.is_error) {
        const saved = JSON.parse(b.content).saved;
        if (saved?.title) out.push({ who: "chip", text: `📦 Listed: ${saved.title}`, href: `/listings/${saved.id}` });
        if (saved?.text) out.push({ who: "chip", text: `🔍 Wants: ${saved.text}${saved.listing_id ? " (matched a listing)" : ""}`, href: saved.listing_id ? `/listings/${saved.listing_id}` : undefined });
      }
    }
  }
  return out;
}

export function Thread({ messages }: { messages: Msg[] }) {
  return (
    <>
      {render(messages).map((r, i) =>
        r.who === "chip" ? (
          r.href
            ? <Link key={i} href={r.href} className="ai-chip">{r.text}</Link>
            : <span key={i} className="ai-chip">{r.text}</span>
        ) : (
          <p key={i} className={`bubble ${r.who === "me" ? "me" : "ai"}`}>{r.text}</p>
        ))}
    </>
  );
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
