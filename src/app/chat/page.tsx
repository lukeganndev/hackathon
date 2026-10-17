"use client";
import { useState } from "react";
import { Thread, ThinkingPill, useLoopChat } from "./ChatParts";

const EXAMPLES = [
  "Trade my running shoes (size 10) for a Norton Anthology, or sell them for $25",
  "I'm looking for a CH 101 tutor and a mini fridge",
  "Driving to Atlanta Friday 3pm, 3 seats, $15 gas each",
];

export default function Chat() {
  const { messages, busy, status, error, send, reset } = useLoopChat();
  const [draft, setDraft] = useState("");
  const go = async (text: string) => { setDraft(""); if (!(await send(text))) setDraft(text); };

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl">Tell Loop what you have and what you want</h1>
        {!!messages.length && <button onClick={reset} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>New chat</button>}
      </div>

      {!messages.length && (
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((e) => <button key={e} onClick={() => go(e)} className="panel text-left">“{e}”</button>)}
        </div>
      )}

      <div className="flex flex-col gap-2" aria-live="polite">
        <Thread messages={messages} />
        {busy && <ThinkingPill label={status} />}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); go(draft); }} className="flex gap-2">
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
          placeholder="Trade my calc textbook for…" className="flex-1" />
        <button disabled={busy} className="btn">Send</button>
      </form>
      {error && <p role="alert" className="text-[#b3261e]">{error}</p>}
    </div>
  );
}
