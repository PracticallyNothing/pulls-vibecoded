import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { start, until } from "./harness.js";

// The test build allows 3 pulls per day.
let h, b;
beforeEach(async () => {
  h = await start();
  b = h.b;
});
afterEach(() => h.close());

const code = async () => (await b.path()).split("/")[2];
const left = async () => Number(await b.text("[data-pulls=left]"));
const untilLeft = n => until(async () => (await left()) === n, `${n} pulls left`);
const untilPlaying = () => until(async () => (await b.playing()) > 0, "a video playing");
const gateShown = () => b.visible("[data-pulls=gate]");

async function pull(button = "[data-pulls=pull]") {
  await b.click(button);
  await b.click("[data-pulls=accept]");
}

test("landing on the reels feed shows the Pull screen, not a reel", async () => {
  await b.goto(h.base + "/reels/");
  await until(gateShown, "Pull screen");
  await b.wait(500);
  assert.equal(await b.playing(), 0, "nothing plays behind the Pull screen");
  assert.equal(await left(), 3);
});

test("cancelling a pull changes nothing", async () => {
  await b.goto(h.base + "/reels/");
  await b.click("[data-pulls=pull]");
  await b.click("[data-pulls=cancel]");
  await b.wait(300);
  assert.ok(await gateShown());
  assert.equal(await left(), 3);
});

test("accepting a pull reveals the reel and charges once it plays", async () => {
  await b.goto(h.base + "/reels/");
  await pull();
  await until(async () => !(await gateShown()), "Pull screen gone");
  await untilLeft(2);
  assert.equal(await b.playing(), 1);
});

test("arrow keys, wheel and the site's next button don't advance the feed", async () => {
  await b.goto(h.base + "/reels/");
  await pull();
  await untilLeft(2);
  const before = await code();

  await b.press("ArrowDown");
  await b.wheel(900);
  await b.click('[aria-label="Navigate to next Reel"]', { timeout: 500 }).catch(() => {}); // hidden is fine too
  await b.wait(800);

  assert.equal(await code(), before);
});

test("Next at the end of today's pulls asks for a pull, then moves to a new reel", async () => {
  await b.goto(h.base + "/reels/");
  await pull();
  await untilLeft(2);
  const first = await code();

  await pull("[data-pulls=next]");
  await untilLeft(1);
  assert.notEqual(await code(), first);
});

test("going back to an earlier pull is free and plays it on its own page", async () => {
  await b.goto(h.base + "/reels/");
  await pull();
  await untilLeft(2);
  const first = await code();
  await pull("[data-pulls=next]");
  await untilLeft(1);

  await b.click("[data-pulls=prev]");
  await until(async () => (await b.path()) === `/reel/${first}/`, `/reel/${first}/`);
  await untilPlaying();
  assert.equal(await left(), 1);
  assert.ok(!(await gateShown()));
});

test("reloading on a pulled reel shows it again for free", async () => {
  await b.goto(h.base + "/reels/");
  await pull();
  await untilLeft(2);
  await b.reload();
  await untilPlaying();
  assert.ok(!(await gateShown()));
  assert.equal(await left(), 2);
});

test("with no pulls left the Pull button is disabled", async () => {
  await b.goto(h.base + "/reels/");
  await pull();
  await untilLeft(2);
  await pull("[data-pulls=next]");
  await untilLeft(1);
  await pull("[data-pulls=next]");
  await untilLeft(0);
  assert.ok(await b.disabled("[data-pulls=next]"));
  assert.equal(await b.count("[data-pulls=accept]"), 0, "no confirmation offered");
});
