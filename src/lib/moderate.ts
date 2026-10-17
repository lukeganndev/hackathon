import Anthropic from "@anthropic-ai/sdk";

// AI moderation for anything students post. The database blocklist (0008) is the hard floor;
// this catches what a word list can't: slurs, sexual content, scams, disguised drugs/weapons.
const client = new Anthropic();
const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`;

const POLICY = `You moderate posts on Loop, a marketplace for verified college students. Decide if a post is allowed.
Not allowed: drugs, vapes, alcohol, weapons (including disguised ones), stolen or counterfeit goods, fake IDs, academic cheating services (selling exam answers, writing papers), sexual content or services, hate speech or slurs, harassment or threats, personal info about others, scams (deposits up front, gift cards, "DM me to pay outside the app"), animals, prescription meds.
Allowed: normal student stuff: textbooks, clothes, furniture, electronics, dorm items, game tickets (school rules apply), tutoring, rides with gas money, haircuts, moving help. Mild slang and normal profanity in casual descriptions is fine. Judge the item, not spelling. When unsure about an ordinary item, allow it.`;

export type Verdict = { allowed: boolean; reason: string };

export async function moderate(post: { title?: string; description?: string | null; text?: string; photoUrl?: string | null }): Promise<Verdict> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  // Only our own bucket's photos, sent as bytes (Anthropic can't always fetch URLs).
  if (post.photoUrl?.startsWith(BUCKET)) {
    const img = await fetch(post.photoUrl);
    if (img.ok) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(await img.arrayBuffer()).toString("base64") } });
  }
  content.push({ type: "text", text: JSON.stringify({ title: post.title, description: post.description, text: post.text }) });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              allowed: { type: "boolean" },
              reason: { type: "string", description: "If not allowed: one short friendly sentence for the student. Else empty." },
            },
            required: ["allowed", "reason"],
            additionalProperties: false,
          },
        },
      },
      system: POLICY,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return { allowed: false, reason: "This post can't go on Loop." };
    const text = response.content.find((b) => b.type === "text");
    return text?.type === "text" ? JSON.parse(text.text) : { allowed: true, reason: "" };
  } catch (e) {
    // ponytail: fail open if the AI is down so posting still works; the DB blocklist still applies.
    console.error("moderate", e);
    return { allowed: true, reason: "" };
  }
}
