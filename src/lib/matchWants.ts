import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/server";

// Wants that wait: when a listing is posted, link any open fuzzy wants
// (listing_id null, e.g. "any calc textbook") that it satisfies, so the
// loop matcher can use them. Server-only: updates other students' wants.
const client = new Anthropic();

export async function matchWaitingWants(listingId: string): Promise<number> {
  const db = supabaseAdmin();
  const { data: listing } = await db.from("listings")
    .select("id, owner_id, title, description, category, kind, status").eq("id", listingId).single();
  if (!listing || listing.status !== "active") return 0;

  // ponytail: newest 50 open wants only; add keyword/category prefiltering if the pool grows.
  const { data: wants } = await db.from("wants").select("id, text")
    .eq("active", true).is("listing_id", null).neq("user_id", listing.owner_id)
    .order("created_at", { ascending: false }).limit(50);
  if (!wants?.length) return 0;

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { want_ids: { type: "array", items: { type: "string", enum: wants.map((w) => w.id) } } },
          required: ["want_ids"],
          additionalProperties: false,
        },
      },
    },
    system: "You match a new campus marketplace listing to students' open wants. Return the ids of wants this listing would genuinely satisfy. Be strict: the right kind of thing, and the right edition/size/course if the want names one. Return an empty list if none fit.",
    messages: [{
      role: "user",
      content: JSON.stringify({
        listing: { title: listing.title, description: listing.description, category: listing.category, kind: listing.kind },
        wants,
      }),
    }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (response.stop_reason === "refusal" || !text || text.type !== "text") return 0;
  const ids: string[] = JSON.parse(text.text).want_ids;
  if (!ids.length) return 0;

  // Only still-open wants, in case one got linked while we were asking.
  const { data: linked } = await db.from("wants").update({ listing_id: listing.id })
    .in("id", ids).is("listing_id", null).eq("active", true).select("id");
  return linked?.length ?? 0;
}
