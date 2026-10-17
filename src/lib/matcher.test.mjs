import assert from "node:assert/strict";
import { findLoops } from "./matcher.ts";

const edge = (from, to, listingId = `${from}-item`, cashCents = 0) =>
  ({ from, to, listingId, cashCents });
const ids = (loops) => loops.map((loop) => loop.map((leg) => leg.listingId));
let passed = 0;

function test(name, run) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

const swap = [edge("alex", "bri"), edge("bri", "alex")];
const triangle = [
  edge("alex", "bri", "textbook"),
  edge("bri", "cam", "shoes"),
  edge("cam", "alex", "ticket"),
];

test("finds a two-person swap", () => {
  assert.deepEqual(findLoops(swap, "alex"), [swap]);
});

test("finds a three-person loop in giver-to-receiver order", () => {
  assert.deepEqual(findLoops(triangle, "alex"), [triangle]);
});

test("returns no loops for an empty graph or an open chain", () => {
  assert.deepEqual(findLoops([], "alex"), []);
  assert.deepEqual(findLoops(triangle.slice(0, 2), "alex"), []);
});

test("ignores a five-person loop at the default limit; allows it at five", () => {
  const people = ["a", "b", "c", "d", "e"];
  const five = people.map((person, index) =>
    edge(person, people[(index + 1) % people.length]));
  assert.deepEqual(findLoops(five, "a"), []);
  assert.deepEqual(findLoops(five, "a", 5), [five]);
});

test("a student who only buys has no loop", () => {
  assert.deepEqual(findLoops([edge("seller", "buyer")], "buyer"), []);
});

test("includes a cycle exactly at the maximum length", () => {
  const four = [edge("a", "b"), edge("b", "c"), edge("c", "d"), edge("d", "a")];
  assert.deepEqual(findLoops(four, "a", 4), [four]);
  assert.deepEqual(findLoops(four, "a", 3), []);
});

test("deduplicates identical legs without losing listing alternatives", () => {
  const alternatives = [
    ...swap, ...swap,
    edge("alex", "bri", "alex-other-item"),
  ];
  assert.deepEqual(ids(findLoops(alternatives, "alex")), [
    ["alex-item", "bri-item"],
    ["alex-other-item", "bri-item"],
  ]);
});

test("finds the same cycle from each participant, rotated to that person", () => {
  for (let index = 0; index < triangle.length; index++) {
    const rotated = [...triangle.slice(index), ...triangle.slice(0, index)];
    assert.deepEqual(findLoops(triangle, triangle[index].from), [rotated]);
  }
});

test("excludes self-trades and cycles that omit the requested student", () => {
  const graph = [edge("alex", "alex"), edge("alex", "bri"), edge("bri", "cam"), edge("cam", "bri")];
  assert.deepEqual(findLoops(graph, "alex"), []);
  assert.deepEqual(findLoops(graph, "missing"), []);
});

test("never revisits a participant inside a loop", () => {
  const graph = [
    ...triangle,
    edge("bri", "dan", "bri-second-item"),
    edge("dan", "bri", "dan-item"),
  ];
  assert.deepEqual(findLoops(graph, "alex"), [triangle]);
});

test("sorts shorter loops first, then lower total cash", () => {
  const graph = [
    ...triangle,
    edge("alex", "dan", "expensive", 200), edge("dan", "alex", "dan-item"),
    edge("alex", "eve", "cheaper", 50), edge("eve", "alex", "eve-item"),
  ];
  assert.deepEqual(ids(findLoops(graph, "alex")), [
    ["cheaper", "eve-item"],
    ["expensive", "dan-item"],
    ["textbook", "shoes", "ticket"],
  ]);
});

test("has deterministic results without mutating the input", () => {
  const graph = Object.freeze([...swap, ...triangle].map((leg) => Object.freeze(leg)));
  const before = JSON.stringify(graph);
  assert.deepEqual(findLoops(graph, "alex"), findLoops([...graph].reverse(), "alex"));
  assert.equal(JSON.stringify(graph), before);
});

test("returns no loops for an invalid length limit", () => {
  for (const maxLen of [0, 1, -1, 2.5, NaN, Infinity]) {
    assert.deepEqual(findLoops(swap, "alex", maxLen), []);
  }
});

console.log(`${passed} tests passed`);
console.log("ok");
