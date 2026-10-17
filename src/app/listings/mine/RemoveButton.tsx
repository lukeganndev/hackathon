"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Soft delete: listings -> status 'removed', wants -> active false. RLS limits it to your own rows.
export function RemoveButton({ table, id }: { table: "listings" | "wants"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    const patch = table === "listings" ? { status: "removed" } : { active: false };
    const { error } = await supabaseBrowser().from(table).update(patch).eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div className="text-right">
      <button onClick={remove} disabled={busy} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>
        {busy ? "Removing…" : "Remove"}
      </button>
      {error && <p role="alert" className="text-xs text-[#b3261e]">{error}</p>}
    </div>
  );
}
