"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// A plain sale is a 1-leg trade: seller gives the listing to the buyer for its price.
// The trade API holds the money with Stripe (test mode) and charges it on handoff.
export function BuyButton({ listingId, sellerId, buyerId, priceCents }: { listingId: string; sellerId: string; buyerId: string; priceCents: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legs: [{ from: sellerId, to: buyerId, listingId, cashCents: priceCents }] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(data.error ?? "Couldn't start the purchase."); }
    router.push(`/trades/${data.trade.id}`);
  }

  return (
    <>
      <button onClick={buy} disabled={busy} className="btn">
        {busy ? "Holding payment…" : `Buy for $${(priceCents / 100).toFixed(2)}`}
      </button>
      <p className="text-sm opacity-70">Your card is held, not charged, until you get the item and give the seller your code.</p>
      {error && <p role="alert" className="text-[#b3261e]">{error}</p>}
    </>
  );
}
