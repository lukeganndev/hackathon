"use client";
import { useState } from "react";
import Link from "next/link";
import type Anthropic from "@anthropic-ai/sdk";

type Msg = Anthropic.Beta.BetaMessageParam;

const EXAMPLES = [
  "Trade my Nike running shoes (size 10) for a Norton Anthology, or sell them for $25",
  "I'm looking for a CH 101 tutor and a mini fridge",
  "Driving to Atlanta Friday 3pm, 3 seats, $15 gas each",
];

// What the student sees: their own words, Claude's text, and a chip per saved have/want.
function render(messages: Msg[]) {
  const out: { who: "me" | "ai" | "chip"; text: string; href?: string }[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") { out.push({ who: m.role === "user" ? "me" : "ai", text: m.content }); continue; }
    for (const b of m.content) {
      if (b.type === "text" && b.text.trim()) out.push({ who: m.role === "user" ? "me" : "ai", text: b.text });
      if (b.type === "tool_result" && typeof b.content === "string" && !b.is_error) {
        const saved = JSON.parse(b.content).saved;
        if (saved?.title) out.push({ who: "chip", text: `📦 Listed: ${saved.title}`, href: `/listings/${saved.id}` });
        if (saved?.text) out.push({ who: "chip", text: `🔍 Wants: ${saved.text}${saved.listing_id ? " (matched a listing)" : ""}`, href: saved.listing_id ? `/listings/${saved.listing_id}` : undefined });
      }
    }
  }
  return out;
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError("");
    setBusy(true);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    const res = await fetch("/api/ai/chat", { method: "POST", body: JSON.stringify({ messages: next }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMessages(messages); setDraft(text); return setError(data.error); }
    setMessages(data.messages);
  }

  return (
    <main className="flex flex-col gap-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Tell Loop what you have and what you want</h1>

      {!messages.length && (
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => send(e)} className="rounded-xl border p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900">
              “{e}”
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2" aria-live="polite">
        {render(messages).map((r, i) =>
          r.who === "chip" ? (
            r.href
              ? <Link key={i} href={r.href} className="self-start rounded-full border px-3 py-1 text-sm underline">{r.text}</Link>
              : <span key={i} className="self-start rounded-full border px-3 py-1 text-sm">{r.text}</span>
          ) : (
            <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2 whitespace-pre-wrap ${r.who === "me" ? "self-end bg-black text-white" : "self-start bg-gray-100 dark:bg-gray-800"}`}>
              {r.text}
            </p>
          ))}
        {busy && <p className="self-start opacity-60">Thinking…</p>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="flex gap-2">
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
          placeholder="Trade my calc textbook for…" className="border rounded p-3 flex-1" />
        <button disabled={busy} className="rounded bg-black text-white px-5">Send</button>
      </form>
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </main>
  );
}
