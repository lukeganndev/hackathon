"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearLoopChat } from "../chat/ChatParts";
import { useSignOut } from "../HeaderClient";

export function SettingsForm({ userId, name: initial }: { userId: string; name: string }) {
  const router = useRouter();
  const signOut = useSignOut();
  const [name, setName] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    // The database blocklist rejects offensive names (0009).
    const { error } = await supabaseBrowser().from("profiles").update({ display_name: name.trim() }).eq("id", userId);
    setBusy(false);
    setMsg(error ? error.message : "Saved ✓");
    if (!error) router.refresh();
  }

  return (
    <>
      <form onSubmit={save} className="panel flex flex-col gap-2">
        <h2 className="text-xl">Display name</h2>
        <p className="text-sm" style={{ color: "var(--mute)" }}>What other students see on your listings, loops and reviews.</p>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="flex-1" />
          <button className="btn" disabled={busy || !name.trim() || name.trim() === initial}>{busy ? "Saving…" : "Save"}</button>
        </div>
        {msg && <p role="status" className="text-sm" style={{ color: msg.startsWith("Saved") ? "#1e8a4c" : "#b3261e" }}>{msg}</p>}
      </form>
      <ThemePicker />
      <section className="panel flex flex-col gap-2">
        <h2 className="text-xl">Ask Loop history</h2>
        <p className="text-sm" style={{ color: "var(--mute)" }}>Your chats are saved in this browser only.</p>
        <button className="btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => { clearLoopChat(); setMsg(""); alert("Saved chats cleared."); }}>Clear saved chats</button>
      </section>
      <button className="btn-ghost" style={{ alignSelf: "flex-start" }} onClick={signOut}>Sign out</button>
    </>
  );
}

// Light / dark / system. Saved in a cookie so the server renders the right theme with no flash.
function ThemePicker() {
  const [theme, setTheme] = useState("system");
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "system"), []);
  function pick(t: string) {
    setTheme(t);
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <section className="panel flex flex-col gap-2">
      <h2 className="text-xl">Appearance</h2>
      <div className="seg" role="group" aria-label="Theme">
        {[["light", "Light"], ["dark", "Dark"], ["system", "System"]].map(([v, label]) => (
          <button key={v} type="button" aria-pressed={theme === v} onClick={() => pick(v)}>{label}</button>
        ))}
      </div>
      <p className="text-sm" style={{ color: "var(--mute)" }}>System follows your device setting.</p>
    </section>
  );
}
