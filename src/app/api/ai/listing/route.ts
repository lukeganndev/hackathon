import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

// Photo -> listing draft. The user reviews and edits it before posting.
const client = new Anthropic();

const CATEGORIES = ["textbooks", "clothing", "tickets", "furniture", "electronics", "dorm", "lab", "other"];

const schema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short listing title, e.g. 'Norton Anthology of English Lit, 10th ed'" },
    description: { type: "string", description: "1-2 sentences: condition and anything a buyer should know" },
    category: { type: "string", enum: CATEGORIES },
    price_cents: { type: "integer", description: "Fair used price for a college student, in cents" },
    ticket_type: {
      type: "string",
      enum: ["none", "football_general", "football_student", "other"],
      description: "Only if the photo is an event ticket",
    },
    allowed: { type: "boolean", description: "false for weapons, drugs, alcohol, counterfeit goods, or anything not allowed on a campus marketplace" },
  },
  required: ["title", "description", "category", "price_cents", "ticket_type", "allowed"],
  additionalProperties: false,
} as const;

export async function POST(req: Request) {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });

  const { photoUrl } = await req.json();
  // Only our own storage bucket, so this can't be used to fetch arbitrary URLs.
  const bucket = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`;
  if (typeof photoUrl !== "string" || !photoUrl.startsWith(bucket)) {
    return Response.json({ error: "Bad photo URL" }, { status: 400 });
  }

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      system: "You write listings for a college campus marketplace at the University of Alabama. Look at the photo and draft an honest listing. Price for students: used, fair, not retail.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: photoUrl } },
          { type: "text", text: "Draft the listing for this item." },
        ],
      }],
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ error: "Couldn't read that photo. Fill it in by hand." }, { status: 422 });
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text in response");
    const draft = JSON.parse(text.text);
    return Response.json({
      ...draft,
      ticket_type: draft.ticket_type === "none" ? null : draft.ticket_type,
    });
  } catch (e) {
    console.error("ai/listing", e);
    return Response.json({ error: "AI is busy. Fill it in by hand." }, { status: 502 });
  }
}
