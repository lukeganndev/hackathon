"use client";
import Link from "next/link";
import { useRef } from "react";
import { Stars } from "./Stars";

export type Review = { id: string; stars: number; comment: string | null; created_at: string; rater: { id: string; display_name: string } };

export function ReviewItem({ r }: { r: Review }) {
  return (
    <article className="review">
      <span className="text-amber-500" aria-label={`${r.stars} stars`}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
      {r.comment && <p style={{ margin: 0 }}>{r.comment}</p>}
      <small><Link href={`/u/${r.rater.id}`} className="underline">{r.rater.display_name}</Link> · {new Date(r.created_at).toLocaleDateString()}</small>
    </article>
  );
}

// The star rating, clickable: opens every review in a popup.
export function ReviewsButton({ avg, count, reviews, name }: { avg: number | null; count: number; reviews: Review[]; name: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  if (!count) return <Stars avg={avg} count={count} />;
  return (
    <>
      <button className="stars-btn" onClick={() => ref.current?.showModal()}><Stars avg={avg} count={count} /></button>
      <dialog ref={ref} className="modal" aria-labelledby="reviews-heading">
        <button className="modal-x" aria-label="Close" onClick={() => ref.current?.close()}>×</button>
        <h2 id="reviews-heading">Reviews for {name}</h2>
        <Stars avg={avg} count={count} />
        <p style={{ color: "var(--mute)", margin: 0, fontSize: 13 }}>Only students who completed a code-confirmed handoff can leave a review.</p>
        {reviews.map((r) => <ReviewItem key={r.id} r={r} />)}
      </dialog>
    </>
  );
}
