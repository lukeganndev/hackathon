"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { RateForm } from "@/app/listings/mine/RateForm";

type ToRate = { legId: string; rateeId: string; rateeName: string; title: string };

// Pops up once a trade closes: review everyone you handed off with that you haven't reviewed yet.
export function ReviewPopup({ legs, userId }: { legs: ToRate[]; userId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [left, setLeft] = useState<ToRate[]>([]);
  const ids = legs.map((l) => l.legId).join(",");
  useEffect(() => {
    if (!legs.length) return;
    void supabaseBrowser().from("ratings").select("trade_leg_id").eq("rater_id", userId).in("trade_leg_id", legs.map((l) => l.legId))
      .then(({ data }) => {
        const done = new Set(data?.map((r) => r.trade_leg_id));
        const todo = legs.filter((l) => !done.has(l.legId));
        setLeft(todo);
        // Let the confetti land first.
        if (todo.length) setTimeout(() => ref.current?.showModal(), 1200);
      });
  }, [ids, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (legId: string) => setLeft((v) => {
    const next = v.filter((l) => l.legId !== legId);
    if (!next.length) ref.current?.close();
    return next;
  });

  return (
    <dialog ref={ref} className="modal" aria-labelledby="review-heading">
      <button className="modal-x" aria-label="Close" onClick={() => ref.current?.close()}>×</button>
      <h2 id="review-heading">How did it go?</h2>
      <p style={{ color: "var(--mute)", margin: 0 }}>Reviews help everyone on campus trade with confidence.</p>
      {left.map((l) => <RateForm key={l.legId} {...l} onDone={() => finish(l.legId)} />)}
      <button className="btn-ghost" onClick={() => ref.current?.close()}>Maybe later</button>
    </dialog>
  );
}
