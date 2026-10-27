import { test } from "node:test";
import assert from "node:assert/strict";
import { parseItem, itemPath, neighbours } from "../src/route.js";

test("reads reel and post codes from Instagram paths", () => {
  assert.deepEqual(parseItem("/reels/De4hj6RtfSb/"), {
    kind: "reel",
    code: "De4hj6RtfSb",
    feed: true,
  });
  assert.deepEqual(parseItem("/reel/De4hj6RtfSb/"), {
    kind: "reel",
    code: "De4hj6RtfSb",
    feed: false,
  });
  assert.deepEqual(parseItem("/p/C_x-Y9/"), { kind: "post", code: "C_x-Y9", feed: false });
});

test("tolerates a missing trailing slash", () => {
  assert.deepEqual(parseItem("/reel/ABC"), { kind: "reel", code: "ABC", feed: false });
});

test("pages that are not a single item give null", () => {
  for (const p of ["/", "/reels/", "/direct/inbox/", "/someuser/", "/explore/"])
    assert.equal(parseItem(p), null, p);
});

test("pulled items are re-viewed on their single-item page", () => {
  assert.equal(itemPath({ kind: "reel", code: "A" }), "/reel/A/");
  assert.equal(itemPath({ kind: "post", code: "B" }), "/p/B/");
});

const items = ["A", "B", "C"].map(code => ({ kind: "reel", code }));

test("neighbours in the middle of today's list", () => {
  const n = neighbours(items, "B");
  assert.equal(n.prev.code, "A");
  assert.equal(n.next.code, "C");
});

test("at the end of today's list there is no next: that's where Pull goes", () => {
  const n = neighbours(items, "C");
  assert.equal(n.prev.code, "B");
  assert.equal(n.next, null);
});

test("at the start there is no prev", () => {
  assert.equal(neighbours(items, "A").prev, null);
});

test("an item not in today's list has nothing around it", () => {
  assert.deepEqual(neighbours(items, "Z"), { prev: null, next: null });
});
