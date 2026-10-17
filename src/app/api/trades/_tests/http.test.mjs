import assert from "node:assert/strict";
import { test } from "node:test";
import { handleTradeRequest, TradeError } from "../_lib/http.ts";

const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const alex = id(1), bri = id(2), cam = id(3), dan = id(4);
const tradeId = id(20), legId = id(30);
const legs = [
  { from: alex, to: bri, listingId: id(101), cashCents: 0 },
  { from: bri, to: cam, listingId: id(102), cashCents: 0 },
  { from: cam, to: alex, listingId: id(103), cashCents: 0 },
];
function request(body, extra = {}) {
  return new Request("https://loop.example/api/trades", {
    method: "POST", headers: { "content-type": "application/json", ...extra.headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function fixture(overrides = {}) {
  const calls = [];
  return { calls, dependencies: {
    authenticate: async () => alex,
    read: async (...args) => { calls.push(args); return { loops: [] }; },
    mutate: async (...args) => { calls.push(args); return { trade: { id: tradeId } }; },
    ...overrides,
  } };
}

test("all actions require a verified session before reads or writes", async () => {
  for (const action of ["find", "list", "detail", "create", "accept", "meetup", "confirm", "cancel"]) {
    const f = fixture({ authenticate: async () => null });
    const response = await handleTradeRequest(request({ legs }), action, f.dependencies, { id: tradeId, legId });
    assert.equal(response.status, 401);
    assert.equal(f.calls.length, 0);
  }
});

test("rejects cross-origin requests", async () => {
  const f = fixture();
  assert.equal((await handleTradeRequest(request({ legs }, { headers: { origin: "https://other.example" } }), "create", f.dependencies)).status, 403);
  assert.equal(f.calls.length, 0);
});

test("orders a valid proposal and passes only allowed fields with the session actor", async () => {
  const f = fixture();
  const response = await handleTradeRequest(request({ legs: [legs[2], legs[1], legs[0]], p_actor: dan, status: "done" }), "create", f.dependencies);
  assert.equal(response.status, 201);
  assert.deepEqual(f.calls[0], ["create", alex, { legs: [legs[2], legs[0], legs[1]] }]);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects a proposal that omits the signed-in student", async () => {
  const f = fixture({ authenticate: async () => dan });
  assert.equal((await handleTradeRequest(request({ legs }), "create", f.dependencies)).status, 403);
  assert.equal(f.calls.length, 0);
});

test("rejects disconnected swaps passed as one four-person loop", async () => {
  const f = fixture();
  const split = [legs[0], { ...legs[1], to: alex }, { ...legs[2], to: dan }, { from: dan, to: cam, listingId: id(104), cashCents: 0 }];
  assert.equal((await handleTradeRequest(request({ legs: split }), "create", f.dependencies)).status, 400);
  assert.equal(f.calls.length, 0);
});

test("rejects self-trades, repeated listings, broken paths, and empty/oversized loops", async () => {
  const invalid = [[], [...legs, ...legs], [{ ...legs[0], to: alex }],
    [legs[0], { ...legs[1], listingId: legs[0].listingId }, legs[2]],
    [legs[0], { ...legs[1], to: dan }, legs[2]],
    [legs[0], { ...legs[1], from: alex }, legs[2]],
  ];
  for (const candidate of invalid) {
    const f = fixture();
    assert.equal((await handleTradeRequest(request({ legs: candidate }), "create", f.dependencies)).status, 400);
    assert.equal(f.calls.length, 0);
  }
});

test("allows one-leg sales but rejects negative, fractional, excessive, or missing cash", async () => {
  const f = fixture();
  assert.equal((await handleTradeRequest(request({ legs: [{ ...legs[0], cashCents: 2500 }] }), "create", f.dependencies)).status, 201);
  for (const cashCents of [-1, 1.5, 2_147_483_648, "100", null, undefined]) {
    const f = fixture();
    assert.equal((await handleTradeRequest(request({ legs: [{ ...legs[0], cashCents }] }), "create", f.dependencies)).status, 400);
    assert.equal(f.calls.length, 0);
  }
});

test("does not enable loop cash top-ups", async () => {
  const f = fixture();
  assert.equal((await handleTradeRequest(request({ legs: [{ ...legs[0], cashCents: 5 }, ...legs.slice(1)] }), "create", f.dependencies)).status, 400);
});

test("rejects malformed JSON, nonobjects, non-JSON content, and invalid UUIDs", async () => {
  const requests = [
    new Request("https://loop.example", { method: "POST", body: "{", headers: { "content-type": "application/json" } }),
    request([]), request(null), request({ legs: [{ ...legs[0], listingId: "not-an-id" }] }),
  ];
  for (const input of requests) {
    const f = fixture();
    assert.equal((await handleTradeRequest(input, "create", f.dependencies)).status, 400);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  assert.equal((await handleTradeRequest(new Request("https://loop.example", { method: "POST", body: "{}" }), "create", f.dependencies)).status, 415);
});

test("caps request bodies before invoking the database", async () => {
  const f = fixture();
  assert.equal((await handleTradeRequest(request({ padding: "x".repeat(17000) }), "create", f.dependencies)).status, 413);
  assert.equal(f.calls.length, 0);
});

test("validates future meetup times and requires a timezone", async () => {
  for (const at of ["bad", "2020-01-01T12:00:00Z", "2099-01-01T12:00:00"]) {
    const f = fixture();
    assert.equal((await handleTradeRequest(request({ spot: "Library", at }), "meetup", f.dependencies, { id: tradeId })).status, 400);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  assert.equal((await handleTradeRequest(request({ spot: " Library ", at: "2099-01-01T12:00:00-05:00" }), "meetup", f.dependencies, { id: tradeId })).status, 200);
  assert.deepEqual(f.calls[0], ["meetup", alex, { id: tradeId, spot: "Library", at: "2099-01-01T17:00:00.000Z" }]);
});

test("preserves leading zeroes and refuses malformed handoff codes", async () => {
  const f = fixture();
  assert.equal((await handleTradeRequest(request({ code: "0042" }), "confirm", f.dependencies, { id: tradeId, legId })).status, 200);
  assert.deepEqual(f.calls[0], ["confirm", alex, { id: tradeId, legId, code: "0042" }]);
  for (const code of [42, "042", "00000", "abcd", " 0042"]) {
    const f = fixture();
    assert.equal((await handleTradeRequest(request({ code }), "confirm", f.dependencies, { id: tradeId, legId })).status, 400);
  }
});

test("accept and cancel pass verified identity and validated route IDs", async () => {
  for (const action of ["accept", "cancel"]) {
    const f = fixture();
    assert.equal((await handleTradeRequest(request(), action, f.dependencies, { id: tradeId })).status, 200);
    assert.deepEqual(f.calls[0], [action, alex, { id: tradeId }]);
    assert.equal((await handleTradeRequest(request(), action, f.dependencies, { id: "bad" })).status, 400);
  }
});

test("passes participant reads through with the session identity", async () => {
  for (const action of ["find", "list", "detail"]) {
    const f = fixture();
    assert.equal((await handleTradeRequest(request(), action, f.dependencies, { id: tradeId })).status, 200);
    assert.deepEqual(f.calls[0], [action, alex, action === "detail" ? tradeId : undefined]);
  }
});

test("preserves known permission, conflict, setup, and retry-limit errors", async () => {
  for (const status of [400, 403, 404, 409, 429, 503]) {
    const f = fixture({ mutate: async () => { throw new TradeError(status, "Safe message"); } });
    const response = await handleTradeRequest(request(), "accept", f.dependencies, { id: tradeId });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: "Safe message" });
  }
});

test("never exposes unexpected backend exceptions", async () => {
  const f = fixture({ mutate: async () => { throw new Error("private-backend-data"); } });
  const response = await handleTradeRequest(request(), "cancel", f.dependencies, { id: tradeId });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes("private-backend-data"), false);
});
