"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Kind = "item" | "service" | "ride";
const CATEGORIES: Record<Kind, string[]> = {
  item: ["textbooks", "clothing", "tickets", "furniture", "electronics", "dorm", "lab", "other"],
  service: ["tutoring", "haircut", "nails", "moving_help", "other"],
  ride: ["rides"],
};

// Phone photos are huge; shrink to 1280px JPEG before upload (faster, and fits the AI's image limit).
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));
}

const input = "w-full";

export default function NewListing() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("item");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [f, setF] = useState({
    title: "", description: "", category: "other", price: "", tradeOnly: false,
    ticket_type: "", face_value: "",
    from: "", to: "", depart_at: "", seats: "3", pickup: "", unit: "hour", course: "",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("Uploading photo…");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, await shrink(file), { contentType: "image/jpeg" });
    if (upErr) { setStatus(""); return setError(upErr.message); }
    const url = supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
    setPhotoUrl(url);

    setStatus("AI is writing your listing…");
    const res = await fetch("/api/ai/listing", { method: "POST", body: JSON.stringify({ photoUrl: url }) });
    const draft = await res.json();
    setStatus("");
    if (!res.ok) return setError(draft.error);
    if (!draft.allowed) return setError("That item isn't allowed on Loop.");
    setF((old) => ({
      ...old,
      title: draft.title, description: draft.description, category: draft.category,
      price: (draft.price_cents / 100).toFixed(2),
      ticket_type: draft.ticket_type ?? "",
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    const { data: profile } = await supabase.from("profiles").select("id, school_id").eq("id", user.id).single();
    if (!profile) return router.push("/login");
    const cents = (v: string) => (v ? Math.round(parseFloat(v) * 100) : null);
    const details =
      kind === "ride" ? { from: f.from, to: f.to, depart_at: f.depart_at, seats: Number(f.seats), ...(f.pickup && { pickup: f.pickup }) }
      : kind === "service" ? { unit: f.unit, ...(f.category === "tutoring" && { course: f.course }) }
      : {};
    const { data, error } = await supabase.from("listings").insert({
      school_id: profile.school_id, owner_id: profile.id, kind, details,
      title: f.title, description: f.description, category: f.category,
      price_cents: f.tradeOnly ? null : cents(f.price),
      photo_url: photoUrl,
      ticket_type: kind === "item" && f.ticket_type ? f.ticket_type : null,
      face_value_cents: kind === "item" && f.ticket_type ? cents(f.face_value) : null,
    }).select("id").single();
    if (error) return setError(error.message); // includes ticket policy errors from the DB
    setStatus("Checking who's already looking for this…");
    await fetch("/api/ai/match", { method: "POST", body: JSON.stringify({ listingId: data.id }) }).catch(() => {});
    router.push(`/listings/${data.id}`);
  }

  const priceLabel = kind === "ride" ? "Gas share per seat ($)" : kind === "service" ? `Price per ${f.unit} ($)` : "Price ($)";

  return (
    <main className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-3xl">New listing</h1>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Listing type">
        {(["item", "service", "ride"] as Kind[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k}
            onClick={() => { setKind(k); setF({ ...f, category: CATEGORIES[k][0] }); }}
            className={`${kind === k ? "btn" : "btn-ghost"} capitalize`}>
            {k}
          </button>
        ))}
      </div>

      {kind === "item" && (
        <label className="panel flex flex-col gap-2 text-center cursor-pointer" style={{ borderStyle: "dashed", borderWidth: 2 }}>
          {photoUrl
            ? <img src={photoUrl} alt="Your item" className="mx-auto max-h-60 rounded" />
            : <span>📷 Snap a photo and AI fills in the rest</span>}
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" />
        </label>
      )}
      {status && <p aria-live="polite">{status}</p>}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label>Title<input required value={f.title} onChange={set("title")} className={input} /></label>
        <label>Description<textarea value={f.description} onChange={set("description")} className={input} rows={2} /></label>
        <label>Category
          <select value={f.category} onChange={set("category")} className={input}>
            {CATEGORIES[kind].map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
        </label>

        {kind === "ride" && (<>
          <label>From<input required value={f.from} onChange={set("from")} className={input} placeholder="Tuscaloosa" /></label>
          <label>To<input required value={f.to} onChange={set("to")} className={input} placeholder="Atlanta" /></label>
          <label>Leaving<input required type="datetime-local" value={f.depart_at} onChange={set("depart_at")} className={input} /></label>
          <label>Seats<input required type="number" min={1} max={7} value={f.seats} onChange={set("seats")} className={input} /></label>
          <label>Pickup spot (optional)<input value={f.pickup} onChange={set("pickup")} className={input} placeholder="Ferguson Center lot" /></label>
        </>)}
        {kind === "service" && (<>
          <label>Priced per
            <select value={f.unit} onChange={set("unit")} className={input}>
              <option value="hour">hour</option><option value="session">session</option>
            </select>
          </label>
          {f.category === "tutoring" && <label>Course<input value={f.course} onChange={set("course")} className={input} placeholder="CH 101" /></label>}
        </>)}

        <label className="flex items-center gap-2"><input type="checkbox" checked={f.tradeOnly} onChange={set("tradeOnly")} /> Trade only, no cash</label>
        {!f.tradeOnly && <label>{priceLabel}<input required type="number" step="0.01" min="0" value={f.price} onChange={set("price")} className={input} /></label>}

        {kind === "item" && f.category === "tickets" && (<>
          <label>Ticket type
            <select required value={f.ticket_type} onChange={set("ticket_type")} className={input}>
              <option value="">Pick one</option>
              <option value="football_general">Football (general)</option>
              <option value="football_student">Football (student)</option>
              <option value="other">Other event</option>
            </select>
          </label>
          <label>Face value ($)<input required type="number" step="0.01" min="0" value={f.face_value} onChange={set("face_value")} className={input} /></label>
          <p className="text-sm opacity-70">Tickets transfer through the official account. Price can&apos;t go over face value.</p>
        </>)}

        <button className="btn" disabled={!!status}>Post listing</button>
      </form>
      {error && <p role="alert" className="text-[#b3261e]">{error}</p>}
    </main>
  );
}
