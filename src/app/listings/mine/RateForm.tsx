"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Rate the other person in a confirmed handoff. The database rejects anything else.
export function RateForm({ legId, rateeId, rateeName, title, onDone }: { legId: string; rateeId: string; rateeName: string; title: string; onDone?: () => void }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("ratings").insert({
      trade_leg_id: legId, rater_id: user!.id, ratee_id: rateeId, stars, comment: comment.trim() || null,
    });
    if (error) return setError(error.message);
    if (onDone) onDone(); else router.refresh();
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-2">
      <p className="font-medium">How was {rateeName}? <span className="opacity-70 font-normal">({title})</span></p>
      <div role="radiogroup" aria-label="Stars" className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)} className={n <= stars ? "text-amber-500" : "opacity-40"} style={{ background: "none", border: 0, fontSize: 26 }}>★</button>
        ))}
      </div>
      <label className="text-sm">Comment (optional)
        <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500}
          className="w-full" placeholder="On time, item as described" />
      </label>
      <button disabled={!stars} className="btn">Post review</button>
      {error && <p role="alert" className="text-[#b3261e] text-sm">{error}</p>}
    </form>
  );
}
