import { test } from "node:test";
import assert from "node:assert/strict";
import { forDay, remaining, acceptPull, decide, commitShown } from "../src/ledger.js";

const reel = code => ({ kind: "reel", code });
const fresh = (limit = 2) => forDay(undefined, "2026-10-27", limit);

test("a fresh day has the full budget and nothing pulled", () => {
  const s = fresh(10);
  assert.equal(remaining(s), 10);
  assert.deepEqual(s.items, []);
});

test("a stored state from another day is replaced by a fresh one", () => {
  const old = { ...fresh(), day: "2026-10-26", items: [{ ...reel("A") }] };
  const s = forDay(old, "2026-10-27", 2);
  assert.equal(s.day, "2026-10-27");
  assert.deepEqual(s.items, []);
});

test("a stored state from today is kept", () => {
  const today = commitShown(acceptPull(fresh()).state, reel("A"));
  assert.deepEqual(forDay(today, "2026-10-27", 2), today);
});

test("a new item is blocked unless a pull was accepted", () => {
  assert.equal(decide(fresh(), reel("A")), "block");
});

test("accepting a pull lets the next new item show and charges it once shown", () => {
  const { ok, state } = acceptPull(fresh());
  assert.equal(ok, true);
  assert.equal(decide(state, reel("A")), "show");
  assert.equal(remaining(state), 2, "nothing charged before the item is shown");

  const after = commitShown(state, reel("A"));
  assert.equal(remaining(after), 1);
  assert.equal(decide(after, reel("B")), "block", "one pull buys one item");
});

test("items already pulled today are free to show again", () => {
  const s = commitShown(acceptPull(fresh()).state, reel("A"));
  assert.equal(decide(s, reel("A")), "show");
  assert.deepEqual(commitShown(s, reel("A")), s);
});

test("the same code is the same item regardless of kind", () => {
  // /reels/X/, /reel/X/ and /p/X/ can all point at one post.
  const s = commitShown(acceptPull(fresh()).state, reel("A"));
  assert.equal(decide(s, { kind: "post", code: "A" }), "show");
});

test("a pull cannot be accepted when the budget is spent", () => {
  let s = fresh(1);
  s = commitShown(acceptPull(s).state, reel("A"));
  const r = acceptPull(s);
  assert.equal(r.ok, false);
  assert.equal(decide(r.state, reel("B")), "block");
});

test("accepting twice before anything is shown still buys only one item", () => {
  const s = acceptPull(acceptPull(fresh()).state).state;
  const after = commitShown(s, reel("A"));
  assert.equal(remaining(after), 1);
  assert.equal(decide(after, reel("B")), "block");
});

test("ads are skipped and never charged, even with a pull pending", () => {
  const s = acceptPull(fresh()).state;
  const ad = { ...reel("AD"), ad: true };
  assert.equal(decide(s, ad), "skip");
  assert.deepEqual(commitShown(s, ad), s);
});

test("a reel opened from a friend's message is free and kept in today's list", () => {
  const s = commitShown(fresh(), { ...reel("F"), fromFriend: true });
  assert.equal(remaining(s), 2);
  assert.deepEqual(
    s.items.map(i => i.code),
    ["F"],
  );
  assert.equal(decide(s, reel("F")), "show", "can be re-viewed later");
});

test("the reel after a friend's reel still needs a pull", () => {
  const s = commitShown(fresh(), { ...reel("F"), fromFriend: true });
  assert.equal(decide(s, reel("NEXT")), "block");
});

test("committing an item that was never allowed is refused", () => {
  assert.throws(() => commitShown(fresh(), reel("A")));
});

test("today's list keeps the order items were shown in", () => {
  let s = fresh(3);
  for (const c of ["A", "B", "C"]) s = commitShown(acceptPull(s).state, reel(c));
  assert.deepEqual(
    s.items.map(i => i.code),
    ["A", "B", "C"],
  );
});
