const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chromium" });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(6000);
  console.log(p.url(), JSON.stringify(await p.title()),
    "password inputs:", await p.$$eval("input[name=password]", v => v.length),
    "articles:", await p.$$eval("article", v => v.length),
    "post links:", await p.$$eval('a[href*="/p/"]', v => v.length));
  await p.screenshot({ path: "home.png" });
  await b.close();
})();
