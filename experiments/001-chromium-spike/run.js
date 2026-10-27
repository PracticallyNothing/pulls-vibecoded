// Loads ext/ unpacked into Chromium and drives the mock feed.
const { chromium } = require("playwright");
const http = require("http"),
  fs = require("fs"),
  path = require("path"),
  os = require("os");

(async () => {
  const html = fs.readFileSync(path.join(__dirname, "mock/index.html"));
  const server = http.createServer((_, res) => res.end(html)).listen(0);
  const url = `http://127.0.0.1:${server.address().port}/`;
  const ext = path.join(__dirname, "ext");
  const ctx = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "pulls-")),
    {
      headless: true,
      channel: "chromium", // full Chromium; the default headless shell ignores extensions
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    },
  );
  const page = await ctx.newPage();
  const visible = () =>
    page.$$eval("[data-item-id]", els =>
      els.map(e => `${e.dataset.itemId}:${e.dataset.pullsBlocked ? "blocked" : "shown"}`),
    );

  await page.goto(url);
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => more());
    await page.waitForTimeout(200);
  }
  console.log("first visit:", await visible());

  await page.reload(); // reload: reel-1, reel-2 already pulled, still free
  await page.waitForTimeout(500);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => more());
    await page.waitForTimeout(200);
  }
  console.log("after reload:", await visible());
  await ctx.close();
  server.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
