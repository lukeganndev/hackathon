"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// "I want this" = a concrete want edge the loop matcher uses.
export function WantButton({ listingId, title, wanted }: { listingId: string; title: string; wanted: boolean }) {
  const supabase = supabaseBrowser();
  const [on, setOn] = useState(wanted);
  const [error, setError] = useState("");

  async function toggle() {
    setError("");
    const { data: profile } = await supabase.from("profiles").select("id, school_id").single();
    if (!profile) return setError("Sign in first");
    const { error } = on
      ? await supabase.from("wants").update({ active: false }).eq("listing_id", listingId).eq("user_id", profile.id)
      : await supabase.from("wants").insert({ user_id: profile.id, school_id: profile.school_id, listing_id: listingId, text: title });
    if (error) return setError(error.message);
    setOn(!on);
  }

  return (
    <>
      <button onClick={toggle} className={`rounded p-3 ${on ? "border" : "bg-[var(--school)] text-white"}`}>
        {on ? "✓ On your wants list (tap to remove)" : "I want this"}
      </button>
      {on && <p className="text-sm opacity-70">We&apos;ll look for a trade loop that gets it to you.</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </>
  );
}
