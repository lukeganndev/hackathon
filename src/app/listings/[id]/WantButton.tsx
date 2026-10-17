"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Seller = { id: string; name: string; priceCents: number | null };

// "I want this" = a concrete want edge the loop matcher uses, then a chance to message the seller an offer.
export function WantButton({ listingId, title, wanted, seller }: { listingId: string; title: string; wanted: boolean; seller: Seller }) {
  const supabase = supabaseBrowser();
  const [on, setOn] = useState(wanted);
  const [error, setError] = useState("");
  const offer = useRef<HTMLDialogElement>(null);

  async function toggle() {
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Sign in first");
    const { data: profile } = await supabase.from("profiles").select("id, school_id").eq("id", user.id).single();
    if (!profile) return setError("Sign in first");
    const { error } = on
      ? await supabase.from("wants").update({ active: false }).eq("listing_id", listingId).eq("user_id", profile.id)
      : await supabase.from("wants").insert({ user_id: profile.id, school_id: profile.school_id, listing_id: listingId, text: title });
    if (error) return setError(error.message);
    if (!on) offer.current?.showModal();
    setOn(!on);
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button onClick={toggle} className="btn-ghost" style={on ? undefined : { borderColor: "var(--accent)", color: "var(--accent)" }}>
          {on ? "✓ On your wants list (tap to remove)" : "I want this"}
        </button>
        <button onClick={() => offer.current?.showModal()} className="btn-ghost">Message {seller.name}</button>
      </div>
      {on && <p className="text-sm opacity-70">We&apos;ll look for a trade loop that gets it to you.</p>}
      {error && <p role="alert" className="text-[#b3261e]">{error}</p>}
      <dialog ref={offer} className="modal" aria-labelledby="offer-heading">
        <button className="modal-x" aria-label="Close" onClick={() => offer.current?.close()}>×</button>
        <OfferForm listingId={listingId} title={title} seller={seller} onClose={() => offer.current?.close()} />
      </dialog>
    </>
  );
}

function OfferForm({ listingId, title, seller, onClose }: { listingId: string; title: string; seller: Seller; onClose: () => void }) {
  const router = useRouter();
  const [body, setBody] = useState(`Hi ${seller.name}! I'm interested in your ${title}. Is it still available?`);
  const [price, setPrice] = useState(seller.priceCents != null ? String(Math.round(seller.priceCents / 100)) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const offer = price.trim() ? Math.round(Number(price) * 100) : null;
    const { error } = await supabaseBrowser().from("messages")
      .insert({ recipient_id: seller.id, listing_id: listingId, body: body.trim(), offer_cents: offer });
    setBusy(false);
    if (error) return setError(error.message);
    onClose();
    router.push(`/messages?with=${seller.id}`);
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-3">
      <h2 id="offer-heading">Send {seller.name} an offer</h2>
      <p style={{ color: "var(--mute)", margin: 0 }}>{title}{seller.priceCents != null ? ` · listed at $${(seller.priceCents / 100).toFixed(0)}` : " · trade only"}</p>
      <label className="text-sm flex flex-col gap-1">Your offer (optional, $)
        <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Leave empty to just ask or offer a trade" />
      </label>
      <label className="text-sm flex flex-col gap-1">Message
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} required />
      </label>
      <button className="btn" disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send offer"}</button>
      {error && <p role="alert" className="text-[#b3261e] text-sm">{error}</p>}
    </form>
  );
}
