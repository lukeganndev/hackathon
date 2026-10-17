// Additive, repeatable cross-campus fixtures. No emails are sent, and demo sellers cannot sign in.
// Preview: node --env-file=.env.local supabase/demo_campuses.mjs
// Install: node --env-file=.env.local supabase/demo_campuses.mjs --apply
// Check:   node --env-file=.env.local supabase/demo_campuses.mjs --verify
// These rows use a separate demo tag so demo_seed.mjs leaves them alone.
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { demoPhoto } from "./demo_photo.mjs";

const TAG = "cross-campus-parody-v1";
const fiction = "Fictional Loop demo listing; not posted by the named person. ";
const campuses = [
  { slug: "lsu", sellers: ["Lane Kiffin"], items: [
    [0, "Purple quarter-zip, lightly recruited", "clothing", 2500, "hoodie", "Trying a new color palette. Open to trades, especially a better closet."],
    [0, "Desk chair with elite swivel speed", "furniture", 3500, "chair", "Perfect for changing direction without leaving your office."],
    [0, "Coffee maker for very early press conferences", "dorm", 2000, "coffee", "Makes strong coffee and absolutely no comments about next season."],
    [0, "Moving boxes, suspiciously well traveled", "dorm", 800, null, "Only used a few times. Please do not ask for the full address history."],
  ] },
  { slug: "uga", sellers: ["Kirby Smart", "Gunnar Stockton"], items: [
    [0, "Whiteboard: draw up your next A", "dorm", 1800, null, "Great for study plans. Already has a very intense third-down diagram."],
    [0, "Red rain jacket, championship weatherproofing", "clothing", 3000, "jacket", "Keeps the rain out. Does not keep the expectations out."],
    [1, "Mini fridge with room for the whole huddle", "dorm", 5500, null, "Cold drinks, quiet motor. The snacks are already in the transfer portal."],
    [1, "Wireless earbuds, sideline noise optional", "electronics", 3500, "earbuds", "For when the group project needs a silent count."],
  ] },
  { slug: "olemiss", sellers: ["Archie Manning"], items: [
    [0, "Oxford button-down, Grove ready", "clothing", 2200, null, "Smart enough for class. Somehow even smarter at a tailgate."],
    [0, "Desk lamp for late-night film study", "dorm", 1500, "lamp", "Three brightness levels: homework, overtime, and final exam week."],
    [0, "Bookshelf for a very long family history", "furniture", 2800, "shelf", "Plenty of space for textbooks and an unreasonable number of family photos."],
  ] },
  { slug: "utk", sellers: ["Peyton Manning"], items: [
    [0, "Omaha orange hoodie, size L", "clothing", 2500, "hoodie", "Comfortable enough to call an audible on going to class."],
    [0, "TI-84 calculator, pre-snap calculations", "electronics", 4500, "calc", "For checking the numbers before you change the entire study plan."],
    [0, "Coffee maker with a no-huddle setting", "dorm", 2500, "coffee", "The no-huddle setting is just pressing the button twice. Please don't."],
  ] },
  { slug: "utexas", sellers: ["Arch Manning"], items: [
    [0, "Burnt orange hoodie, family-approved", "clothing", 2800, "hoodie", "Very comfortable. Comes with absolutely no quarterback advice."],
    [0, "Desk chair, five-star sitting experience", "furniture", 4000, "chair", "Excellent support for reading every comment about your group project."],
    [0, "Bike for beating the campus blitz", "other", 9000, "bike", "Two wheels, no playbook. Bring your own helmet and parking strategy."],
  ] },
  { slug: "ufl", sellers: ["Tim Tebow"], items: [
    [0, "Blue workout hoodie, motivational edition", "clothing", 2000, "hoodie", "Will not do your morning workout for you. Might make you feel bad about skipping it."],
    [0, "Desk lamp for one more chapter", "dorm", 1200, "lamp", "For when the study group needs a very sincere halftime speech."],
    [0, "Twin XL bedding, fourth-quarter recovery", "dorm", 2500, "bedding", "Clean sheets. Big dreams. Alarm clock sold separately."],
  ] },
  { slug: "vanderbilt", sellers: ["Diego Pavia"], items: [
    [0, "Calculator for upsetting the curve", "electronics", 4000, "calc", "Adds, subtracts, and refuses to acknowledge the projected score."],
    [0, "Coffee maker, underdog fuel", "dorm", 2200, "coffee", "Small machine. Unreasonably confident performance."],
    [0, "Study chair, ranked opponents welcome", "furniture", 3200, "chair", "Stable legs, comfortable seat, absolutely no respect for your rankings."],
  ] },
];

const credits = {
  hoodie: "jollyUK, BY, via Openverse",
  chair: "Wonderlane, BY, via Openverse",
  coffee: "JeepersMedia, BY, via Openverse",
  jacket: "chispita_666, BY, via Openverse",
  earbuds: "Image Catalog, CC0, via Openverse",
  lamp: "Raimond Spekking, CC BY-SA 4.0, via Wikimedia Commons",
  shelf: "mrJiggy, BY-SA, via Openverse",
  calc: "Hayden Schiff, CC BY 4.0, via Wikimedia Commons",
  bike: "Phil Gradwell, BY, via Openverse",
  bedding: "young shanahan, BY, via Openverse",
};

function stableId(key) {
  const hex = createHash("sha256").update(`${TAG}:${key}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = "8";
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
assert.equal(campuses.length, 7);
for (const campus of campuses) {
  assert.ok(campus.items.length >= 3 && campus.items.length <= 4);
  for (const [seller, title, , price, image] of campus.items) {
    assert.ok(campus.sellers[seller] && title.length <= 120);
    assert.ok(Number.isInteger(price) && price >= 0);
    assert.ok(!image || credits[image]);
  }
}

const apply = process.argv.includes("--apply"), verify = process.argv.includes("--verify");
assert.ok(!(apply && verify), "Choose --apply or --verify, not both");
if (!apply && !verify) {
  for (const campus of campuses) console.log(`${campus.slug}: ${campus.items.length} listings (${campus.sellers.join(", ")})`);
  console.log("Preview only. Use --apply to add these fictional demo listings.");
} else {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const schools = must(await db.from("schools").select("id, slug, email_domains").in("slug", campuses.map((c) => c.slug)));
  assert.equal(schools.length, 7, "All seven schools must already exist; no schema or school changes are made");
  const ids = campuses.flatMap((c) => c.items.map((_, i) => stableId(`${c.slug}:listing:${i}`)));
  const existing = must(await db.from("listings").select("id, school_id, owner_id, details, status").in("id", ids));
  for (const row of existing) assert.equal(row.details.demo, TAG, "Refusing to modify an unrelated listing");
  let added = 0;
  for (const campus of campuses) {
    const school = schools.find((s) => s.slug === campus.slug);
    const owners = [];
    for (const [index, name] of campus.sellers.entries()) {
      const id = stableId(`${campus.slug}:seller:${index}`);
      if (apply) {
        const { data: { user }, error } = await db.auth.admin.getUserById(id);
        if (error && error.status !== 404 && error.code !== "user_not_found") throw new Error(error.message);
        if (user) {
          assert.equal(user.app_metadata.demo_seed, TAG, "Refusing to modify an unrelated user");
        } else {
          must(await db.auth.admin.createUser({
            id, email: `loop-demo-${id.slice(0, 8)}@demo.invalid.${school.email_domains[0]}`,
            password: randomBytes(32).toString("base64url"), email_confirm: false,
            ban_duration: "876000h", app_metadata: { demo_seed: TAG, fictional: true },
          }));
        }
        must(await db.from("profiles").update({ display_name: name }).eq("id", id).eq("school_id", school.id));
      }
      const profile = must(await db.from("profiles").select("id, school_id, display_name").eq("id", id).single());
      assert.equal(profile.school_id, school.id);
      assert.equal(profile.display_name, name);
      owners.push(id);
    }
    const rows = campus.items.map(([seller, title, category, price_cents, image, joke], index) => ({
      id: stableId(`${campus.slug}:listing:${index}`), school_id: school.id, owner_id: owners[seller],
      title, description: fiction + joke, kind: "item", category, price_cents,
      photo_url: demoPhoto(title)?.photo_url ?? (image ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/demo/${image}.jpg` : null),
      details: { demo: TAG, fictional: true, ...(image ? { photo_credit: credits[image] } : {}), ...demoPhoto(title)?.details },
    }));
    const missing = rows.filter((row) => !existing.some((old) => old.id === row.id));
    if (apply && missing.length) {
      must(await db.from("listings").insert(missing));
      added += missing.length;
    }
    const stored = must(await db.from("listings").select("id, school_id, owner_id, details").in("id", rows.map((r) => r.id)));
    assert.equal(stored.length, rows.length);
    for (const row of stored) {
      assert.equal(row.school_id, school.id);
      assert.ok(owners.includes(row.owner_id));
      assert.equal(row.details.demo, TAG);
    }
    console.log(`ok: ${campus.slug}, ${stored.length} listings in the correct campus`);
  }
  console.log(`ok: ${ids.length} fictional listings across 7 campuses; ${added} added. Existing listings and trades preserved.`);
}
