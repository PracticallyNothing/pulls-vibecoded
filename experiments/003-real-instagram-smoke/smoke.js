// Loads dist/ (production build) and tries it on real, logged-out Instagram.
// Not part of the test suite: depends on the network and on Instagram.
// Usage: npm run build && [BROWSER=firefox] node experiments/003-real-instagram-smoke/smoke.js [outdir]
import os from "node:os";
import path from "node:path";
import { launch, until } from "../../test/e2e/harness.js";

const out = process.argv[2] ?? os.tmpdir();
const { engine, b, close } = await launch(path.resolve("dist"));
const shot = name => b.page.screenshot({ path: path.join(out, `${engine}-${name}.png`) });
const log = async label =>
  console.log(
    engine.padEnd(8),
    label.padEnd(26),
    JSON.stringify({
      path: await b.path(),
      gate: await b.visible("[data-pulls=gate]"),
      left: await b.text("[data-pulls=left]"),
      playing: await b.playing(),
    }),
  );

try {
  await b.goto("https://www.instagram.com/reels/");
  await b.wait(6000);
  await log("landing:");
  await shot("1-landing");

  await b.click("[data-pulls=pull]", { timeout: 10000 });
  await b.click("[data-pulls=accept]");
  await b.wait(4000);
  await log("after pull:");
  await shot("2-pulled");

  await b.press("ArrowDown");
  await b.wheel(900);
  await b.wait(2500);
  await log("after ArrowDown + wheel:");

  await b.click("[data-pulls=next]");
  await b.click("[data-pulls=accept]");
  await b.wait(4000);
  await log("after Next + accept:");
  await shot("3-next");

  await b.click("[data-pulls=prev]");
  // On timeout, log where the page ended up instead of throwing (see experiments/005).
  await until(async () => (await b.path()).startsWith("/reel/"), "/reel/ page", 10000).catch(
    async () => console.log(engine, "Prev did not reach /reel/; now at", await b.path()),
  );
  await b.wait(4000);
  await log("after Prev:");
  await shot("4-prev");
} finally {
  await close();
}
