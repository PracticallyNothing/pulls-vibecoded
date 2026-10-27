process.env.TZ = "Europe/Sofia"; // fixed zone with DST, so results don't depend on the machine

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey } from "../src/day.js";

// Local-time constructor: new Date(y, monthIndex, d, h, m)
test("a pull day starts at 08:00 local time", () => {
  assert.equal(dayKey(new Date(2026, 9, 27, 8, 0)), "2026-10-27");
});

test("just before 08:00 still belongs to the previous day", () => {
  assert.equal(dayKey(new Date(2026, 9, 27, 7, 59)), "2026-10-26");
});

test("late evening belongs to the same day", () => {
  assert.equal(dayKey(new Date(2026, 9, 27, 23, 30)), "2026-10-27");
});

test("previous-day rollover crosses month and year boundaries", () => {
  assert.equal(dayKey(new Date(2027, 0, 1, 3, 0)), "2026-12-31");
});

test("DST change night: 07:30 after clocks went back is still the previous day", () => {
  // Europe/Sofia leaves summer time on 2026-10-25 at 04:00 -> 03:00.
  assert.equal(dayKey(new Date(2026, 9, 25, 7, 30)), "2026-10-24");
  assert.equal(dayKey(new Date(2026, 9, 25, 8, 0)), "2026-10-25");
});
