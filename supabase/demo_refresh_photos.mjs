// Additive photo update; never changes North Face backpacks or sold/traded/removed rows.
// node --env-file=.env.local supabase/demo_refresh_photos.mjs --apply
// node --env-file=.env.local supabase/demo_refresh_photos.mjs --verify
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { demoPhoto, isPhotoTarget } from "./demo_photo.mjs";

const apply = process.argv.includes("--apply"), verify = process.argv.includes("--verify");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const read = () => db.from("listings").select("id, title, status, photo_url, details");
const before = must(await read());
const eligible = (l) => ["active", "pending"].includes(l.status) && !/north.face.*backpack/i.test(l.title) && isPhotoTarget(l);
const targets = before.filter((l) => eligible(l) && demoPhoto(l.title));
if (apply) {
  for (const row of targets) {
    const photo = demoPhoto(row.title);
    const updated = must(await db.from("listings").update({ photo_url: photo.photo_url, details: { ...row.details, ...photo.details } })
      .eq("id", row.id).eq("title", row.title).eq("status", row.status).select("id"));
    console.log(updated.length ? `Updated: ${row.title}` : `Skipped changed listing: ${row.title}`);
  }
}
if (apply || verify) {
  const after = must(await read());
  for (const old of before.filter((l) => !eligible(l))) {
    const row = after.find((l) => l.id === old.id);
    if (row) assert.equal(row.photo_url, old.photo_url, `Protected photo changed: ${old.title}`);
  }
  const current = after.filter((l) => eligible(l) && demoPhoto(l.title));
  for (const row of current) assert.equal(row.photo_url, demoPhoto(row.title).photo_url, row.title);
  assert.equal(new Set(current.map((l) => l.photo_url)).size, current.length, "Photos must be distinct");
  console.log(`ok: ${current.length} distinct matching photos; backpack and completed listing photos preserved.`);
} else {
  console.log(`${targets.length} eligible listings. Use --apply to update or --verify to check.`);
}
