// Demo data: a guaranteed 3-way trade loop plus filler listings.
// Re-runnable: deletes earlier demo rows (details.demo = true) first. Real listings are untouched.
//   node --env-file=.env.local supabase/demo_seed.mjs lrgann hlpenick egbarber
// Args = display names (email before @) of 3 signed-up users: A, B, C.
// Loop: A gives Norton -> B, B gives shoes -> C, C gives Iron Bowl ticket -> A.
import { createClient } from "@supabase/supabase-js";

const [a, b, c] = process.argv.slice(2);
if (!c) throw new Error("Usage: node --env-file=.env.local supabase/demo_seed.mjs <userA> <userB> <userC>");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

const people = must(await db.from("profiles").select("id, school_id, display_name").in("display_name", [a, b, c]));
const P = Object.fromEntries(people.map((p) => [p.display_name, p]));
for (const n of [a, b, c]) if (!P[n]) throw new Error(`No user "${n}". They need to sign in once first.`);

// Clean up the previous run. Wants cascade when their listing is deleted; also drop demo fuzzy wants.
must(await db.from("listings").delete().eq("details->>demo", "true"));
must(await db.from("wants").delete().like("text", "[demo]%"));

const listing = (who, row) => ({ owner_id: P[who].id, school_id: P[who].school_id, kind: "item", ...row, details: { ...row.details, demo: true } });
const rows = must(await db.from("listings").insert([
  // The loop
  listing(a, { title: "Norton Anthology of English Literature, 10th ed, Vol. 1", description: "Some highlighting in the first 100 pages. EN 205.", category: "textbooks", price_cents: 4000 }),
  listing(b, { title: "Nike Pegasus running shoes, men's size 10", description: "Worn about 10 times, too small for me.", category: "clothing", price_cents: 4500 }),
  listing(c, { title: "Iron Bowl ticket, upper deck", description: "Transfers through the official ticket account.", category: "tickets", ticket_type: "football_general", face_value_cents: 9000, price_cents: 9000 }),
  // Filler so the feed looks alive
  listing(a, { title: "Mini fridge, 3.1 cu ft", description: "Works great, moving out of the dorm.", category: "dorm", price_cents: 6000 }),
  listing(b, { title: "TI-84 Plus graphing calculator", description: "Batteries included.", category: "electronics", price_cents: 5500 }),
  listing(c, { title: "Desk lamp with USB port", description: "LED, three brightness levels.", category: "dorm", price_cents: null }),
  listing(b, { kind: "service", title: "CH 101 tutoring", description: "Got an A last spring. Library or Zoom.", category: "tutoring", price_cents: 2000, details: { unit: "hour", course: "CH 101" } }),
  listing(c, { kind: "ride", title: "Ride Tuscaloosa → Birmingham, Sunday", description: "Leaving after lunch, room for bags.", category: "rides", price_cents: 1000, details: { from: "Tuscaloosa", to: "Birmingham", depart_at: "2026-10-18T13:00", seats: 2, pickup: "Ferguson Center lot" } }),
]).select("id, owner_id, title"));

const id = (title) => rows.find((r) => r.title.startsWith(title)).id;
const want = (who, listingTitle) => ({ user_id: P[who].id, school_id: P[who].school_id, text: `[demo] ${listingTitle}`, listing_id: id(listingTitle) });
must(await db.from("wants").insert([
  want(b, "Norton Anthology"),
  want(c, "Nike Pegasus"),
  want(a, "Iron Bowl ticket"),
]));

// Check: the wants really form A -> B -> C -> A (giver -> receiver).
const edges = must(await db.from("wants").select("user_id, listing:listings(owner_id)").like("text", "[demo]%"))
  .map((w) => [w.listing.owner_id, w.user_id]);
const next = Object.fromEntries(edges);
const loop = [P[a].id, next[P[a].id], next[next[P[a].id]], next[next[next[P[a].id]]]];
if (loop[1] !== P[b].id || loop[2] !== P[c].id || loop[3] !== P[a].id) throw new Error("Demo loop is broken");
console.log(`ok: ${rows.length} demo listings, loop ${a} -> ${b} -> ${c} -> ${a}`);
