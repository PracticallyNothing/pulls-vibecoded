import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { start } from "./harness.js";

// The test build allows 3 pulls per day.
let h, page;
beforeEach(async () => {
  h = await start();
  page = h.page;
});
afterEach(() => h.close());

const code = () => page.evaluate(() => location.pathname.split("/")[2]);
const playing = () =>
  page.evaluate(() => [...document.querySelectorAll("video")].filter(v => !v.paused).length);
const pullScreen = () => page.locator("[data-pulls=gate]");
const left = async () => Number(await page.locator("[data-pulls=left]").first().textContent());

// The counter lives in the extension's shadow root, which page-side
// document.querySelector can't see; Playwright locators can.
async function untilLeft(n, timeout = 5000) {
  const end = Date.now() + timeout;
  while ((await left()) !== n) {
    if (Date.now() > end) assert.equal(await left(), n, "pulls left");
    await page.waitForTimeout(100);
  }
}

async function pull() {
  await page.locator("[data-pulls=pull]").click();
  await page.locator("[data-pulls=accept]").click();
}

test("landing on the reels feed shows the Pull screen, not a reel", async () => {
  await page.goto(h.base + "/reels/");
  await pullScreen().waitFor();
  await page.waitForTimeout(500);
  assert.equal(await playing(), 0, "nothing plays behind the Pull screen");
  assert.equal(await left(), 3);
});

test("cancelling a pull changes nothing", async () => {
  await page.goto(h.base + "/reels/");
  await page.locator("[data-pulls=pull]").click();
  await page.locator("[data-pulls=cancel]").click();
  await page.waitForTimeout(300);
  assert.ok(await pullScreen().isVisible());
  assert.equal(await left(), 3);
});

test("accepting a pull reveals the reel and charges once it plays", async () => {
  await page.goto(h.base + "/reels/");
  await pull();
  await pullScreen().waitFor({ state: "hidden" });
  await untilLeft(2);
  assert.equal(await playing(), 1);
});

test("arrow keys, wheel and the site's next button don't advance the feed", async () => {
  await page.goto(h.base + "/reels/");
  await pull();
  await pullScreen().waitFor({ state: "hidden" });
  const before = await code();

  await page.keyboard.press("ArrowDown");
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 900);
  await page
    .locator('[aria-label="Navigate to next Reel"]')
    .click({ force: true, timeout: 1000 })
    .catch(() => {}); // hidden is fine too
  await page.waitForTimeout(800);

  assert.equal(await code(), before);
});

test("Next at the end of today's pulls asks for a pull, then moves to a new reel", async () => {
  await page.goto(h.base + "/reels/");
  await pull();
  await pullScreen().waitFor({ state: "hidden" });
  const first = await code();

  await page.locator("[data-pulls=next]").click();
  await page.locator("[data-pulls=accept]").click();
  await page.waitForFunction(f => location.pathname !== `/reels/${f}/`, first);
  await untilLeft(1);
  assert.notEqual(await code(), first);
});

test("going back to an earlier pull is free and plays it on its own page", async () => {
  await page.goto(h.base + "/reels/");
  await pull();
  await pullScreen().waitFor({ state: "hidden" });
  const first = await code();
  await page.locator("[data-pulls=next]").click();
  await page.locator("[data-pulls=accept]").click();
  await untilLeft(1);

  await page.locator("[data-pulls=prev]").click();
  await page.waitForURL(`**/reel/${first}/`);
  await page.waitForFunction(() => [...document.querySelectorAll("video")].some(v => !v.paused));
  assert.equal(await left(), 1);
  assert.ok(!(await pullScreen().isVisible()));
});

test("reloading on a pulled reel shows it again for free", async () => {
  await page.goto(h.base + "/reels/");
  await pull();
  await untilLeft(2);
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll("video")].some(v => !v.paused));
  assert.ok(!(await pullScreen().isVisible()));
  assert.equal(await left(), 2);
});

test("with no pulls left the Pull button is disabled", async () => {
  await page.goto(h.base + "/reels/");
  for (let n = 2; n >= 0; n--) {
    await (n === 2 ? page.locator("[data-pulls=pull]") : page.locator("[data-pulls=next]")).click();
    await page.locator("[data-pulls=accept]").click();
    await untilLeft(n);
  }
  assert.ok(await page.locator("[data-pulls=next]").isDisabled());
  assert.equal(await page.locator("[data-pulls=accept]").count(), 0, "no confirmation offered");
});
