"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const REASONS = { scam: "Looks like a scam", prohibited: "Not allowed on campus", ticket_resale: "Ticket scalping", offensive: "Offensive", other: "Something else" };

export function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");

  async function report(reason: string) {
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").insert({ listing_id: listingId, reporter_id: user!.id, reason });
    setOpen(false);
    // Unique (listing, reporter): a second report from the same student is a no-op.
    setDone(error && error.code !== "23505" ? error.message : "Thanks. Our team will take a look.");
  }

  if (done) return <p className="text-sm opacity-70" role="status">{done}</p>;
  return (
    <div className="text-sm">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="underline opacity-70">⚑ Report this listing</button>
      {open && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(REASONS).map(([k, label]) => (
            <button key={k} onClick={() => report(k)} className="rounded border px-3 py-1">{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
