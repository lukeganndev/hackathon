// Requires the separately approved temporary PGlite installation; no live credentials.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, beforeEach, test } from "node:test";

const modulePath = process.env.LOOP_PGLITE_MODULE ?? resolve("../.trade-db-tests/node_modules/@electric-sql/pglite/dist/index.js");
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const alex = id(1), bri = id(2), cam = id(3), dan = id(4), school = id(200);
const legs = [
  { from: alex, to: bri, listingId: id(101), cashCents: 0 },
  { from: bri, to: cam, listingId: id(102), cashCents: 0 },
  { from: cam, to: alex, listingId: id(103), cashCents: 0 },
];
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
const one = async (sql, params = []) => (await rows(sql, params))[0];
async function action(actor, operation, payload) {
  const result = await one("select public.loop_trade_action($1::uuid, $2::text, $3::jsonb) as result", [actor, operation, JSON.stringify(payload)]);
  return result.result;
}
async function propose() { return (await action(alex, "create", { legs })).trade; }
async function acceptAll(trade) {
  await action(bri, "accept", { id: trade.id });
  return (await action(cam, "accept", { id: trade.id })).trade;
}
const meetupAt = "2099-01-01T18:00:00Z";
async function schedule(trade) {
  await acceptAll(trade);
  return action(alex, "meetup", { id: trade.id, spot: "Library", at: meetupAt });
}
const tradeLegs = (trade) => rows("select * from trade_legs where trade_id=$1 order by listing_id", [trade.id]);
async function confirm(trade, leg) {
  const { code } = await one("select code from trade_leg_codes where leg_id=$1", [leg.id]);
  return action(leg.giver_id, "confirm", { id: trade.id, legId: leg.id, code });
}

before(async () => {
  // Minimal Supabase platform scaffolding; the application's actual schema is loaded below.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text not null);
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1, '/') $$;
    create publication supabase_realtime;
  `);
  await db.exec(await readFile(new URL("../../../../../supabase/migrations/0001_init.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../_database/REVIEW_REQUIRED.sql", import.meta.url), "utf8"));
  await db.exec("grant usage on schema public to anon, authenticated, service_role; grant all on all tables in schema public to service_role; grant select, insert, update, delete on schools, profiles, listings, wants, trades, trade_legs, trade_leg_codes to authenticated;");
});

beforeEach(async () => {
  await db.exec("reset role; reset request.jwt.claim.sub; truncate schools, auth.users, profiles, listings, wants, trades, trade_legs, trade_leg_codes, loop_code_attempts cascade;");
  await db.query("insert into schools(id,slug,name,email_domains,meetup_spots) values ($1,'alabama','Alabama','{ua.edu}', $2)", [school, JSON.stringify([{ name: "Library" }, { name: "Student Center" }])]);
  for (const [user, name] of [[alex, "alex"], [bri, "bri"], [cam, "cam"], [dan, "dan"]]) {
    await db.query("insert into auth.users(id,email) values ($1,$2)", [user, `${name}@ua.edu`]);
  }
  for (const leg of legs) {
    await db.query("insert into listings(id,school_id,owner_id,title,price_cents) values ($1,$2,$3,'Demo item',2500)", [leg.listingId, school, leg.from]);
    await db.query("insert into wants(school_id,user_id,listing_id,text) values ($1,$2,$3,'Demo want')", [school, leg.to, leg.listingId]);
  }
});
after(async () => { await db.close(); });

test("proposal reserves all items and auto-accepts only the creator's received leg", async () => {
  const trade = await propose();
  assert.equal(trade.status, "proposed");
  const created = await tradeLegs(trade);
  assert.equal(created.length, 3);
  for (const leg of created) assert.equal(Boolean(leg.accepted_at), leg.receiver_id === alex);
  assert.equal((await one("select count(*)::int as n from listings where status='pending'")).n, 3);
});

test("trade becomes accepted only after every receiver accepts; retries are safe", async () => {
  const trade = await propose();
  assert.equal((await action(bri, "accept", { id: trade.id })).trade.status, "proposed");
  assert.equal((await action(cam, "accept", { id: trade.id })).trade.status, "accepted");
  assert.equal((await action(cam, "accept", { id: trade.id })).trade.status, "accepted");
});

test("enforces trade membership and the giver's role", async () => {
  const trade = await propose();
  await assert.rejects(action(dan, "accept", { id: trade.id }), /TRADE:403/);
  await assert.rejects(action(null, "cancel", { id: trade.id }), /TRADE:403/);
  await schedule(trade);
  const [leg] = await tradeLegs(trade);
  await assert.rejects(action(leg.receiver_id, "confirm", { id: trade.id, legId: leg.id, code: "0000" }), /Only the giver/);
  await assert.rejects(action(leg.giver_id, "confirm", { id: trade.id, legId: id(999), code: "0000" }), /Handoff not found/);
});

test("requires all acceptance, a future time, and an approved meetup spot", async () => {
  const trade = await propose();
  await assert.rejects(action(alex, "meetup", { id: trade.id, spot: "Library", at: meetupAt }), /Everyone must accept/);
  await acceptAll(trade);
  await assert.rejects(action(alex, "meetup", { id: trade.id, spot: "Unknown", at: meetupAt }), /approved campus/);
  await assert.rejects(action(alex, "meetup", { id: trade.id, spot: "Library", at: "2020-01-01T12:00:00Z" }), /future meetup/);
  assert.equal((await action(alex, "meetup", { id: trade.id, spot: "Library", at: meetupAt })).trade.status, "meetup_set");
});

test("creates four-digit codes, preserves them on retries, and completes only after all handoffs", async () => {
  const trade = await propose();
  await schedule(trade);
  const codes = await rows("select * from trade_leg_codes order by leg_id");
  assert.equal(codes.length, 3);
  for (const code of codes) assert.match(code.code, /^\d{4}$/);
  await action(alex, "meetup", { id: trade.id, spot: "Library", at: meetupAt });
  assert.deepEqual(await rows("select * from trade_leg_codes order by leg_id"), codes);
  const created = await tradeLegs(trade);
  await db.query("update trade_leg_codes set code='0042' where leg_id=$1", [created[0].id]);
  assert.equal((await confirm(trade, created[0])).trade.status, "meetup_set");
  assert.equal((await one("select count(*)::int as n from listings where status='pending'")).n, 3);
  assert.equal((await confirm(trade, created[1])).trade.status, "meetup_set");
  assert.equal((await confirm(trade, created[2])).trade.status, "done");
  assert.equal((await one("select count(*)::int as n from listings where status='traded'")).n, 3);
  assert.equal((await one("select count(*)::int as n from wants where active")).n, 0);
  assert.equal((await one("select count(*)::int as n from trade_leg_codes")).n, 0);
  assert.equal((await action(created[0].giver_id, "confirm", { id: trade.id, legId: created[0].id, code: "0042" })).trade.status, "done");
  await assert.rejects(action(alex, "cancel", { id: trade.id }), /completed trade/);
});

test("wrong codes do not advance a leg; five failures trigger a durable retry limit", async () => {
  const trade = await propose();
  await schedule(trade);
  const [leg] = await tradeLegs(trade);
  await db.query("update trade_leg_codes set code='0042' where leg_id=$1", [leg.id]);
  for (let index = 0; index < 5; index++) assert.equal((await action(leg.giver_id, "confirm", { id: trade.id, legId: leg.id, code: "9999" })).httpStatus, 400);
  assert.equal((await one("select confirmed_at from trade_legs where id=$1", [leg.id])).confirmed_at, null);
  assert.equal((await action(leg.giver_id, "confirm", { id: trade.id, legId: leg.id, code: "0042" })).httpStatus, 429);
  await db.query("update loop_code_attempts set window_started=now()-interval '16 minutes' where leg_id=$1", [leg.id]);
  assert.equal((await confirm(trade, leg)).trade.status, "meetup_set");
});

test("a missing code cannot confirm a handoff even if HTTP validation is bypassed", async () => {
  const trade = await propose();
  await schedule(trade);
  const [leg] = await tradeLegs(trade);
  assert.equal((await action(leg.giver_id, "confirm", { id: trade.id, legId: leg.id })).httpStatus, 400);
  assert.equal((await one("select confirmed_at from trade_legs where id=$1", [leg.id])).confirmed_at, null);
});

test("cancellation restores items, deletes codes, and remains safe to repeat", async () => {
  const trade = await propose();
  await schedule(trade);
  assert.equal((await action(bri, "cancel", { id: trade.id })).trade.status, "cancelled");
  assert.equal((await one("select count(*)::int as n from listings where status='active'")).n, 3);
  assert.equal((await one("select count(*)::int as n from trade_leg_codes")).n, 0);
  assert.equal((await action(bri, "cancel", { id: trade.id })).trade.status, "cancelled");
  await assert.rejects(action(cam, "accept", { id: trade.id }), /cannot be accepted/);
});

test("refuses cancellation once a physical handoff has been confirmed", async () => {
  const trade = await propose();
  await schedule(trade);
  await confirm(trade, (await tradeLegs(trade))[0]);
  await assert.rejects(action(bri, "cancel", { id: trade.id }), /handoff already happened/);
  assert.equal((await one("select status from trades where id=$1", [trade.id])).status, "meetup_set");
});

test("rejects a stale proposal without creating orphan trades or reserving other items", async () => {
  await db.query("update listings set status='sold' where id=$1", [legs[1].listingId]);
  await assert.rejects(propose(), /no longer available/);
  assert.equal((await one("select count(*)::int as n from trades")).n, 0);
  assert.equal((await one("select count(*)::int as n from listings where status='pending'")).n, 0);
});

test("validates actual owners, active wants, loop shape, and cash inside the transaction", async () => {
  await assert.rejects(action(dan, "create", { legs: [{ ...legs[0], from: dan }] }), /owner/);
  await assert.rejects(action(alex, "create", { legs: [{ ...legs[0], cashCents: 1 }, ...legs.slice(1)] }), /pure-swap/);
  await assert.rejects(action(alex, "create", { legs: [legs[0], { ...legs[1], to: dan }, legs[2]] }), /connected loop/);
  await db.query("update wants set active=false where listing_id=$1", [legs[1].listingId]);
  await assert.rejects(propose(), /active want/);
  assert.equal((await one("select count(*)::int as n from trades")).n, 0);
});

test("does not double-book an item even if its owner manually resets its status", async () => {
  const trade = await propose();
  await db.exec("update listings set status='active'");
  await assert.rejects(propose(), /already reserved/);
  await assert.rejects(action(bri, "accept", { id: trade.id }), /changed availability/);
  assert.equal((await one("select count(*)::int as n from trades")).n, 1);
});

test("services and rides stay active after completion", async () => {
  await db.query("update listings set kind='service' where id=$1", [legs[0].listingId]);
  await db.query("update listings set kind='ride' where id=$1", [legs[1].listingId]);
  const trade = await propose();
  assert.equal((await one("select count(*)::int as n from listings where status='pending'")).n, 1);
  await schedule(trade);
  for (const leg of await tradeLegs(trade)) await confirm(trade, leg);
  const statuses = await rows("select kind,status from listings order by id");
  assert.deepEqual(statuses, [{ kind: "service", status: "active" }, { kind: "ride", status: "active" }, { kind: "item", status: "traded" }]);
});

test("deduplicates active all-service loops and allows a fresh one after cancellation", async () => {
  await db.exec("update listings set kind='service'");
  const trade = await propose();
  await assert.rejects(propose(), /already been proposed/);
  await action(alex, "cancel", { id: trade.id });
  assert.equal((await propose()).status, "proposed");
});

test("one-leg sales validate the server price and cannot hand off before Stripe is added", async () => {
  const sale = [{ ...legs[0], cashCents: 2500 }];
  await assert.rejects(action(bri, "create", { legs: [{ ...sale[0], cashCents: 1 }] }), /current listing price/);
  const trade = (await action(bri, "create", { legs: sale })).trade;
  assert.equal(trade.status, "accepted");
  await assert.rejects(action(bri, "meetup", { id: trade.id, spot: "Library", at: meetupAt }), /Stripe checkpoint/);
});

test("browsers cannot execute the RPC or read attempt counters; service role can", async () => {
  for (const role of ["anon", "authenticated"]) {
    const result = await one("select has_function_privilege($1,'public.loop_trade_action(uuid,text,jsonb)','execute') as allowed", [role]);
    assert.equal(result.allowed, false);
  }
  assert.equal((await one("select has_function_privilege('service_role','public.loop_trade_action(uuid,text,jsonb)','execute') as allowed")).allowed, true);
  const trade = await propose();
  await schedule(trade);
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${alex}';`);
  const visible = await rows("select c.* from trade_leg_codes c");
  assert.equal(visible.length, 1);
  await assert.rejects(rows("select * from loop_code_attempts"), /permission denied/);
  await db.exec("reset role; reset request.jwt.claim.sub;");
});

test("service role can execute a proposal through the restricted function", async () => {
  await db.exec("set role service_role");
  assert.equal((await propose()).status, "proposed");
  await db.exec("reset role");
});
