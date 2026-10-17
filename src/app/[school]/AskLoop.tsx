"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Thread, ThinkingPill, useLoopChat } from "../chat/ChatParts";

const SUGGESTIONS = ["Find me a trade loop", "Trade my calc textbook for a mini fridge", "Find me a CH 101 tutor"];

// Inline AI box under the campus banner: say what you have or want, Loop lists and matches it.
export function AskLoop({ shortName }: { shortName: string }) {
  const { messages, busy, status, error, send, reset } = useLoopChat();
  const [draft, setDraft] = useState("");
  const router = useRouter();
  const go = async (text: string) => {
    setDraft("");
    if (await send(text)) router.refresh(); // new listings show up in the feed below
    else setDraft(text);
  };

  return (
    <section className="ask" aria-label="Ask Loop">
      <div className="ask-head">
        <span className="ask-orb" aria-hidden />
        <div>
          <b className="serif" style={{ fontSize: 20 }}>Ask Loop</b>
          <p className="mute" style={{ margin: 0, fontSize: 13 }}>Say what you have or want. Loop posts it, searches {shortName} and every campus, and finds your loop.</p>
        </div>
        {!!messages.length && <span style={{ marginLeft: "auto", fontSize: 13, display: "flex", gap: 12 }}>
          <button type="button" onClick={reset} className="mute" style={{ background: "none", border: 0, padding: 0 }}>New chat</button>
          <Link href="/chat" className="mute">Open full chat →</Link>
        </span>}
      </div>

      {!!messages.length && (
        <div className="ask-thread" aria-live="polite">
          <Thread messages={messages.slice(-4)} />
        </div>
      )}
      {busy && <ThinkingPill label={status} />}

      <form onSubmit={(e) => { e.preventDefault(); go(draft); }} className="ask-input">
        <label htmlFor="ask" className="sr-only">Ask Loop</label>
        <input id="ask" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
          placeholder="Trade my running shoes for a Norton Anthology, or sell for $25…" />
        <button disabled={busy || !draft.trim()} className="btn" aria-label="Send">↑</button>
      </form>
      {!messages.length && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => <button key={s} type="button" className="ai-chip" onClick={() => go(s)} disabled={busy}>{s}</button>)}
        </div>
      )}
      {error && <p role="alert" className="text-[#b3261e]" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}
