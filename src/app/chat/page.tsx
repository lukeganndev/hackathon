"use client";
import { useEffect, useRef, useState } from "react";
import { Thread, ThinkingPill, useLoopChat } from "./ChatParts";

const EXAMPLES = [
  ["🔁", "Get me a mini fridge for my Norton Anthology"],
  ["🛍️", "Can I see listings for mini fridges?"],
  ["📚", "Trade my Norton Anthology, or sell it for $35"],
  ["🚗", "Driving to Atlanta Friday 3pm, 3 seats, $15 gas each"],
];

// Full-screen Ask Loop: previous chats on the left, the conversation and composer on the right.
// Shares saved conversations with the Ask Loop box on the campus page.
export default function AskLoopScreen() {
  const { messages, busy, status, error, send, convs, current, open, reset, remove } = useLoopChat();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const go = async (text: string) => { setDraft(""); if (!(await send(text))) setDraft(text); };
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, busy]);

  return (
    <div className="ai-screen">
      <aside className="ai-side" aria-label="Previous chats">
        <button className="btn" onClick={reset} style={{ width: "100%" }}>+ New chat</button>
        <p className="eyebrow" style={{ margin: "14px 4px 6px" }}>Previous chats</p>
        {!convs.length && <p className="mute" style={{ fontSize: 13, margin: "0 4px" }}>Your chats show up here.</p>}
        <ul>
          {convs.map((c) => (
            <li key={c.id} className={c.id === current ? "on" : undefined}>
              <button onClick={() => open(c.id)} title={c.title}>{c.title}</button>
              <button className="x" aria-label={`Delete chat: ${c.title}`} onClick={() => remove(c.id)}>×</button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="ai-main">
        <div className="ai-scroll" aria-live="polite">
          {!messages.length ? (
            <div className="ai-empty">
              <span className="ask-orb big" aria-hidden />
              <h1>What are we trading today?</h1>
              <p className="mute">Tell Loop what you have and what you want. It posts listings, searches every campus, and starts trade loops for you.</p>
              <div className="ai-examples">
                {EXAMPLES.map(([icon, e]) => (
                  <button key={e} onClick={() => go(e)} className="panel" disabled={busy}><span aria-hidden>{icon}</span> {e}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ai-thread">
              <Thread messages={messages} />
              {busy && <ThinkingPill label={status} />}
              <div ref={end} />
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); go(draft); }} className="ask-input ai-composer">
          <label htmlFor="msg" className="sr-only">Message Ask Loop</label>
          <input id="msg" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} autoComplete="off"
            placeholder="Get me a mini fridge for my Norton Anthology…" />
          <button disabled={busy || !draft.trim()} className="btn" aria-label="Send">↑</button>
        </form>
        {error && <p role="alert" className="text-[#b3261e]" style={{ margin: "6px 0 0" }}>{error}</p>}
      </section>
    </div>
  );
}
