// Demo data: a guaranteed 3-way trade loop plus filler listings.
// Re-runnable: deletes earlier demo rows (details.demo = true) first. Real listings are untouched.
//   node --env-file=.env.local supabase/demo_seed.mjs lrgann hlpenick egbarber
// Args = display names (email before @) of 3 signed-up users: A, B, C.
// Loop: A gives Norton -> B, B gives On Cloud shoes -> C, C gives Iron Bowl ticket -> A.
import { createClient } from "@supabase/supabase-js";

const [a, b, c] = process.argv.slice(2);
if (!c) throw new Error("Usage: node --env-file=.env.local supabase/demo_seed.mjs <userA> <userB> <userC>");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

const people = must(await db.from("profiles").select("id, school_id, display_name").in("display_name", [a, b, c]));
const P = Object.fromEntries(people.map((p) => [p.display_name, p]));
for (const n of [a, b, c]) if (!P[n]) throw new Error(`No user "${n}". They need to sign in once first.`);

// Clean up the previous run, but keep completed trades (and their listings/reviews) as real history.
// Unfinished trades on demo listings are deleted (legs and codes cascade) so the listings can go.
const demoIds = must(await db.from("listings").select("id").eq("details->>demo", "true")).map((l) => l.id);
if (demoIds.length) {
  const open = must(await db.from("trade_legs").select("trade_id, trade:trades(status)").in("listing_id", demoIds))
    .filter((l) => l.trade.status !== "done").map((l) => l.trade_id);
  if (open.length) must(await db.from("trades").delete().in("id", [...new Set(open)]));
}
must(await db.from("listings").delete().eq("details->>demo", "true").not("status", "in", "(sold,traded)"));
must(await db.from("wants").delete().like("text", "[demo]%"));

// Freely licensed photos (Wikimedia Commons), copied into our bucket under demo/. Credit shown on the listing page.
const photo = (name, credit, ext = "jpg") => ({ photo_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/demo/${name}.${ext}`, credit });
const withPhoto = (key) => ({ photo_url: PHOTOS[key].photo_url, details: { photo_credit: PHOTOS[key].credit } });
const PHOTOS = {
  shoes: photo("shoes", "Goodreg3, CC BY-SA 4.0, via Wikimedia Commons"),
  calc: photo("calc", "Hayden Schiff, CC BY 4.0, via Wikimedia Commons"),
  lamp: photo("lamp", "Raimond Spekking, CC BY-SA 4.0, via Wikimedia Commons"),
  ride: photo("ride", "Patrick Tomasso, CC0, via Wikimedia Commons"),
  norton: photo("norton", "Lyn Lomasi, BY, via Openverse", "jpg"),
  bedding: photo("bedding", "young shanahan, BY, via Openverse", "jpg"),
  coffee: photo("coffee", "JeepersMedia, BY, via Openverse", "jpg"),
  chair: photo("chair", "Wonderlane, BY, via Openverse", "jpg"),
  shelf: photo("shelf", "mrJiggy, BY-SA, via Openverse", "jpg"),
  bike: photo("bike", "Phil Gradwell, BY, via Openverse", "jpg"),
  earbuds: photo("earbuds", "Image Catalog, CC0, via Openverse", "jpg"),
  hoodie: photo("hoodie", "jollyUK, BY, via Openverse", "jpg"),
  jacket: photo("jacket", "chispita_666, BY, via Openverse", "jpg"),
  labcoat: photo("labcoat", "Mark Ramsay, BY, via Openverse", "jpg"),
  haircut: photo("haircut", "4nitsirk, BY-SA, via Openverse", "jpg"),
  moving: photo("moving", "jchapiewsky, BY-SA, via Openverse", "jpg"),
  nashville: photo("nashville", "FyreMael, BY, via Openverse", "jpg"),
};
const listing = (who, row) => ({ owner_id: P[who].id, school_id: P[who].school_id, kind: "item", ...row, details: { ...row.details, demo: true } });
const rows = must(await db.from("listings").insert([
  // The loop
  listing(a, { title: "Norton Anthology of English Literature, 10th ed, Vol. 1", description: "Some highlighting in the first 100 pages. EN 205.", category: "textbooks", price_cents: 4000, ...withPhoto("norton") }),
  listing(b, { title: "On Cloud running shoes, men's size 10", description: "Worn about 10 times, too small for me.", category: "clothing", price_cents: 4500, photo_url: PHOTOS.shoes.photo_url, details: { photo_credit: PHOTOS.shoes.credit } }),
  listing(c, { title: "Iron Bowl ticket, upper deck", description: "Transfers through the official ticket account.", category: "tickets", ticket_type: "football_general", face_value_cents: 9000, price_cents: 9000 }),
  // Filler so the feed looks alive
  listing(a, { title: "Mini fridge, 3.1 cu ft", description: "Works great, moving out of the dorm.", category: "dorm", price_cents: 6000 }),
  listing(b, { title: "TI-84 Plus graphing calculator", description: "Batteries included.", category: "electronics", price_cents: 5500, photo_url: PHOTOS.calc.photo_url, details: { photo_credit: PHOTOS.calc.credit } }),
  listing(c, { title: "Desk lamp with USB port", description: "LED, three brightness levels.", category: "dorm", price_cents: null, photo_url: PHOTOS.lamp.photo_url, details: { photo_credit: PHOTOS.lamp.credit } }),
  listing(b, { kind: "service", title: "CH 101 tutoring", description: "Got an A last spring. Library or Zoom.", category: "tutoring", price_cents: 2000, details: { unit: "hour", course: "CH 101" } }),
  // More of campus, with photos
  listing(a, { title: "Organic Chemistry, Klein 4th ed", description: "CH 231. Solutions manual included.", category: "textbooks", price_cents: 6000 }),
  listing(b, { title: "Twin XL bedding set", description: "Comforter, sheets, two pillowcases. Washed.", category: "dorm", price_cents: 2500, ...withPhoto("bedding") }),
  listing(c, { title: "Keurig coffee maker", description: "Single cup, descaled last month.", category: "dorm", price_cents: 3000, ...withPhoto("coffee") }),
  listing(a, { title: "Desk chair", description: "Adjustable height, rolls fine.", category: "furniture", price_cents: 3500, ...withPhoto("chair") }),
  listing(b, { title: "5-shelf bookcase", description: "Easy to take apart for moving.", category: "furniture", price_cents: 3000, ...withPhoto("shelf") }),
  listing(c, { title: "Road bike, 54cm", description: "New tires and brake pads. Lock included.", category: "other", price_cents: 16000, ...withPhoto("bike") }),
  listing(a, { title: "Wireless earbuds", description: "Case charges by USB-C. Ear tips cleaned.", category: "electronics", price_cents: 4500, ...withPhoto("earbuds") }),
  listing(b, { title: "27-inch monitor", description: "1440p, HDMI cable included.", category: "electronics", price_cents: 11000 }),
  listing(c, { title: "Crimson hoodie, size M", description: "Worn a few times, no stains.", category: "clothing", price_cents: 2500, ...withPhoto("hoodie") }),
  listing(a, { title: "Rain jacket, men's L", description: "Packs into its own pocket.", category: "clothing", price_cents: 3500, ...withPhoto("jacket") }),
  listing(b, { title: "Lab coat + safety goggles", description: "Used one semester of CH 102 lab.", category: "lab", price_cents: 2000, ...withPhoto("labcoat") }),
  listing(c, { kind: "service", title: "Calc 2 tutoring", description: "MATH 126 A. Library or Zoom.", category: "tutoring", price_cents: 2500, details: { unit: "hour", course: "MATH 126" } }),
  listing(a, { kind: "service", title: "Dorm haircuts", description: "Fades and trims in Paty Hall. 30 min.", category: "haircut", price_cents: 1500, ...withPhoto("haircut"), details: { unit: "session", photo_credit: PHOTOS.haircut.credit } }),
  listing(b, { kind: "service", title: "Move-out help, 2 hours", description: "I have a truck. You pay, I lift.", category: "moving_help", price_cents: 4000, ...withPhoto("moving"), details: { unit: "session", photo_credit: PHOTOS.moving.credit } }),
  listing(c, { kind: "ride", title: "Ride Tuscaloosa → Nashville, Friday", description: "Leaving 3pm, room for bags.", category: "rides", price_cents: 2000, photo_url: PHOTOS.nashville.photo_url, details: { from: "Tuscaloosa", to: "Nashville", depart_at: "2026-10-23T15:00", seats: 3, pickup: "Ferguson Center lot", photo_credit: PHOTOS.nashville.credit } }),
  listing(c, { kind: "ride", title: "Ride Tuscaloosa → Birmingham, Sunday", description: "Leaving after lunch, room for bags.", category: "rides", price_cents: 1000, photo_url: PHOTOS.ride.photo_url, details: { from: "Tuscaloosa", to: "Birmingham", depart_at: "2026-10-18T13:00", seats: 2, pickup: "Ferguson Center lot", photo_credit: PHOTOS.ride.credit } }),
]).select("id, owner_id, title"));

const id = (title) => rows.find((r) => r.title.startsWith(title)).id;
const want = (who, listingTitle) => ({ user_id: P[who].id, school_id: P[who].school_id, text: `[demo] ${listingTitle}`, listing_id: id(listingTitle) });
must(await db.from("wants").insert([
  want(b, "Norton Anthology"),
  want(c, "On Cloud"),
  want(a, "Iron Bowl ticket"),
]));

// Check: the wants really form A -> B -> C -> A (giver -> receiver).
const edges = must(await db.from("wants").select("user_id, listing:listings(owner_id)").like("text", "[demo]%"))
  .map((w) => [w.listing.owner_id, w.user_id]);
const next = Object.fromEntries(edges);
const loop = [P[a].id, next[P[a].id], next[next[P[a].id]], next[next[next[P[a].id]]]];
if (loop[1] !== P[b].id || loop[2] !== P[c].id || loop[3] !== P[a].id) throw new Error("Demo loop is broken");
console.log(`ok: ${rows.length} demo listings, loop ${a} -> ${b} -> ${c} -> ${a}`);
