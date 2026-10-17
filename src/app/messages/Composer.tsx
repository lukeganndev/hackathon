"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function Composer({ to, listingId }: { to: string; listingId: string | null }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true); setError("");
    const { error } = await supabaseBrowser().from("messages").insert({ recipient_id: to, listing_id: listingId, body: body.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="dm-compose">
      <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Write a message…" aria-label="Message" />
      <button className="btn" disabled={busy || !body.trim()}>{busy ? "…" : "Send"}</button>
      {error && <p role="alert" className="text-[#b3261e] text-sm" style={{ width: "100%" }}>{error}</p>}
    </form>
  );
}

// New messages show up without a reload.
export function LiveRefresh({ me }: { me: string }) {
  const router = useRouter();
  useEffect(() => {
    const db = supabaseBrowser();
    const ch = db.channel("dm").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` }, () => router.refresh()).subscribe();
    return () => { void db.removeChannel(ch); };
  }, [me, router]);
  return null;
}
