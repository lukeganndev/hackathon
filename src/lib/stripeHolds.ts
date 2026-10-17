import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

// Payment holds for cash legs (sales and top-ups), Stripe TEST MODE only.
// Hold when everyone accepts, charge when the giver enters the receiver's code,
// release on cancel. Every call is idempotent, so retries are safe.
// ponytail: pm_card_visa (Stripe's test card) stands in for real card entry; add Stripe Elements for live payments.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Leg = { id: string; cash_cents: number; stripe_payment_intent_id: string | null; confirmed_at: string | null };

async function cashLegs(tradeId: string): Promise<Leg[]> {
  const { data, error } = await supabaseAdmin().from("trade_legs")
    .select("id, cash_cents, stripe_payment_intent_id, confirmed_at").eq("trade_id", tradeId).gt("cash_cents", 0);
  if (error) throw new Error(error.message);
  return data;
}

/** Place a hold for every cash leg that doesn't have one yet. Call when the trade becomes 'accepted'. */
export async function holdTrade(tradeId: string) {
  for (const leg of await cashLegs(tradeId)) {
    if (leg.stripe_payment_intent_id) continue;
    const intent = await stripe.paymentIntents.create({
      amount: leg.cash_cents,
      currency: "usd",
      capture_method: "manual",
      payment_method: "pm_card_visa",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { trade_id: tradeId, leg_id: leg.id },
    }, { idempotencyKey: `hold-${leg.id}` });
    const { error } = await supabaseAdmin().from("trade_legs")
      .update({ stripe_payment_intent_id: intent.id }).eq("id", leg.id).is("stripe_payment_intent_id", null);
    if (error) throw new Error(error.message);
  }
}

/** Charge the held money for one leg. Call after that leg's handoff code is confirmed. */
export async function captureLeg(legId: string) {
  const { data: leg } = await supabaseAdmin().from("trade_legs")
    .select("stripe_payment_intent_id, confirmed_at").eq("id", legId).single();
  if (!leg?.stripe_payment_intent_id || !leg.confirmed_at) return;
  const intent = await stripe.paymentIntents.retrieve(leg.stripe_payment_intent_id);
  if (intent.status === "requires_capture") {
    await stripe.paymentIntents.capture(intent.id, {}, { idempotencyKey: `capture-${legId}` });
  }
}

/** Release holds on unconfirmed legs. Call after the trade is cancelled. */
export async function releaseTrade(tradeId: string) {
  for (const leg of await cashLegs(tradeId)) {
    if (!leg.stripe_payment_intent_id || leg.confirmed_at) continue;
    const intent = await stripe.paymentIntents.retrieve(leg.stripe_payment_intent_id);
    if (intent.status === "requires_capture") {
      await stripe.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `release-${leg.id}` });
    }
  }
}
