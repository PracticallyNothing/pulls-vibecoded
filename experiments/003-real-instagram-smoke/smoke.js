// Loads dist/ (production build) into Chromium and tries it on real, logged-out
// Instagram. Not part of the test suite: depends on the network and on Instagram.
// Usage: npm run build && node experiments/003-real-instagram-smoke/smoke.js [outdir]
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ext = path.resolve("dist");
const out = process.argv[2] ?? os.tmpdir();
const ctx = await chromium.launchPersistentContext(
  fs.mkdtempSync(path.join(os.tmpdir(), "pulls-")),
  {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 900 },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  },
);
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
const log = async label =>
  console.log(
    label,
    JSON.stringify({
      path: await page.evaluate(() => location.pathname),
      gate: await page.locator("[data-pulls=gate]").isVisible(),
      left: await page.locator("[data-pulls=left]").first().textContent(),
      playing: await page.evaluate(
        () => [...document.querySelectorAll("video")].filter(v => !v.paused).length,
      ),
    }),
  );

await page.goto("https://www.instagram.com/reels/");
await page.waitForTimeout(6000);
await log("landing:");
await page.screenshot({ path: path.join(out, "1-landing.png") });

await page.locator("[data-pulls=pull]").click();
await page.locator("[data-pulls=accept]").click();
await page.waitForTimeout(4000);
await log("after pull:");
await page.screenshot({ path: path.join(out, "2-pulled.png") });

await page.keyboard.press("ArrowDown");
await page.mouse.move(640, 450);
await page.mouse.wheel(0, 900);
await page.waitForTimeout(2500);
await log("after ArrowDown + wheel:");

await page.locator("[data-pulls=next]").click();
await page.locator("[data-pulls=accept]").click();
await page.waitForTimeout(4000);
await log("after Next + accept:");
await page.screenshot({ path: path.join(out, "3-next.png") });

await page.locator("[data-pulls=prev]").click();
await page.waitForTimeout(5000);
await log("after Prev:");
await page.screenshot({ path: path.join(out, "4-prev.png") });
await ctx.close();
