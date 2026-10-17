import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";

// Chat agent: turns "trade my shoes for a Norton Anthology or sell for $25" into
// listings (haves) and wants. Tools run as the signed-in user, so RLS applies.
// The client sends back the full message history unchanged each turn (thinking
// blocks included): Opus 5.5 rejects edited history, so this must stay append-only.
const client = new Anthropic();

const SYSTEM = `You are Loop's trade assistant for college students. Loop finds multi-way trade loops (A gives B, B gives C, C gives A) and also does plain buying and selling.

Your job: turn what the student says into
- haves: things they're offering, saved with create_listing (check my_listings first so you don't duplicate one they already posted)
- wants: things they're looking for, saved with add_want. Always search_listings first; if a matching listing exists, pass its listing_id so the loop matcher can use it. If nothing matches, save the want without a listing_id.

Rules:
- Ask a short follow-up only when you truly can't tell what they mean (e.g. which edition). Otherwise act.
- Prices are in cents. "sell for $25" = price_cents 2500. "trade only" = price_cents null.
- Tickets must be posted with the photo form (ticket rules apply), not here. Say so.
- Services (tutoring, haircut, nails, moving help) and rides are listings too (kind "service" or "ride").
- After saving, confirm in one or two plain sentences what you saved. No markdown headers.`;

const nullable = (type: string) => ({ type: [type, "null"] });

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_listings",
    description: "Search active listings from other students across all campuses by keyword.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "1-3 keywords, e.g. 'norton anthology'" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "my_listings",
    description: "List the student's own active listings.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "create_listing",
    description: "Post something the student is offering (a have).",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        kind: { type: "string", enum: ["item", "service", "ride"] },
        category: {
          type: "string",
          enum: ["textbooks", "clothing", "furniture", "electronics", "dorm", "lab", "tutoring", "haircut", "nails", "moving_help", "rides", "other"],
        },
        price_cents: { ...nullable("integer"), description: "null = trade only" },
      },
      required: ["title", "description", "kind", "category", "price_cents"],
      additionalProperties: false,
    },
  },
  {
    name: "add_want",
    description: "Save something the student wants.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What they want, e.g. 'Norton Anthology of English Lit, 10th ed'" },
        listing_id: { ...nullable("string"), description: "id from search_listings if a listing matches, else null" },
        max_cash_cents: { type: "integer", description: "Cash they'd add on top of a trade, 0 if none said" },
      },
      required: ["text", "listing_id", "max_cash_cents"],
      additionalProperties: false,
    },
  },
];

const STATUS: Record<string, string> = {
  search_listings: "Searching listings on every campus…",
  my_listings: "Checking what you've already posted…",
  create_listing: "Posting your listing…",
  add_want: "Saving what you want…",
};

export const maxDuration = 60;

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;
type Profile = { id: string; school_id: string };

async function runTool(name: string, input: Record<string, unknown>, db: Supabase, me: Profile) {
  switch (name) {
    case "search_listings": {
      const words = String(input.query).split(/\s+/).filter(Boolean).slice(0, 3);
      let q = db.from("listings").select("id, title, price_cents, kind, school:schools(name)")
        .eq("status", "active").neq("owner_id", me.id).limit(8);
      for (const w of words) q = q.ilike("title", `%${w.replace(/[%_]/g, "")}%`);
      const { data, error } = await q;
      return error ? { error: error.message } : { results: data };
    }
    case "my_listings": {
      const { data, error } = await db.from("listings").select("id, title, price_cents, kind")
        .eq("owner_id", me.id).eq("status", "active");
      return error ? { error: error.message } : { results: data };
    }
    case "create_listing": {
      const { data, error } = await db.from("listings").insert({ ...input, owner_id: me.id, school_id: me.school_id })
        .select("id, title").single();
      return error ? { error: error.message } : { saved: data };
    }
    case "add_want": {
      const { data, error } = await db.from("wants").insert({ ...input, user_id: me.id, school_id: me.school_id })
        .select("id, text, listing_id").single();
      return error ? { error: error.message } : { saved: data };
    }
  }
  return { error: `Unknown tool ${name}` };
}

export async function POST(req: Request) {
  const db = await supabaseServer();
  const { data: me } = await db.from("profiles").select("id, school_id").single();
  if (!me) return Response.json({ error: "Sign in first" }, { status: 401 });

  const { messages } = (await req.json()) as { messages: Anthropic.Beta.BetaMessageParam[] };
  if (!Array.isArray(messages) || !messages.length) return Response.json({ error: "No message" }, { status: 400 });

  // Streams newline-delimited JSON: {status} lines while working, then {messages} or {error}.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: object) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        send({ status: "Reading your message…" });
        // ponytail: cap of 8 model calls per user message; raise if it gives up early.
        for (let i = 0; i < 8; i++) {
          const response = await client.beta.messages.create({
            model: "claude-opus-5-5",
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "low" },
            system: SYSTEM,
            tools,
            messages,
          });
          messages.push({ role: "assistant", content: response.content });
          if (response.stop_reason !== "tool_use") break; // also covers "refusal"

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type !== "tool_use") continue;
            send({ status: STATUS[block.name] ?? "Working…" });
            const out = await runTool(block.name, block.input as Record<string, unknown>, db, me);
            results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out), is_error: "error" in out });
          }
          messages.push({ role: "user", content: results });
          send({ status: "Writing a reply…" });
        }
        send({ messages });
      } catch (e) {
        console.error("ai/chat", e);
        send({ error: "AI is busy, try again." });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
