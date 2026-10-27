const { chromium } = require("playwright");
const active = p => p.evaluate(() => location.pathname);
// Shortcodes of the reels in DOM order, read from each reel's own links if present.
const order = p =>
  p.evaluate(() =>
    [...document.querySelectorAll('a[href*="/reel"]')]
      .map(a => a.getAttribute("href"))
      .filter((h, i, a) => a.indexOf(h) === i)
      .slice(0, 6),
  );
(async () => {
  const b = await chromium.launch({ channel: "chromium" });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto("https://www.instagram.com/reels/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  const a = await active(p);
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(2500);
  const bb = await active(p);
  console.log("session 1:", a, "->", bb);

  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  const r = await active(p);
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(2500);
  console.log("reload on", bb, "-> active", r, "-> next", await active(p));

  for (const ctxN of [1, 2]) {
    // fresh contexts so the logged-out wall counter resets
    const c2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const q = await c2.newPage();
    const url =
      ctxN === 1
        ? `https://www.instagram.com${a}`
        : `https://www.instagram.com${a.replace("/reels/", "/reel/")}`;
    await q.goto(url, { waitUntil: "domcontentloaded" });
    await q.waitForTimeout(5000);
    const first = await active(q);
    const vids = await q.$$eval("video", v => v.length);
    const hasNav = await q.locator('[aria-label="Navigate to next Reel"]').count();
    await q.keyboard.press("ArrowDown");
    await q.waitForTimeout(2500);
    console.log(
      "direct",
      url.replace("https://www.instagram.com", ""),
      "-> active",
      first,
      "videos",
      vids,
      "nextBtn",
      hasNav,
      "-> after ArrowDown",
      await active(q),
    );
    await q.screenshot({ path: `direct${ctxN}.png` });
    await c2.close();
  }
  await b.close();
})();
