const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ channel: "chromium" });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const gql = [];
  p.on("request", r => {
    const u = new URL(r.url());
    if (/graphql|api\/v1/.test(u.pathname))
      gql.push(
        u.pathname +
          " " +
          (r.postDataJSON?.()?.fb_api_req_friendly_name ??
            (r.postData() || "").match(/fb_api_req_friendly_name=([^&]+)/)?.[1] ??
            ""),
      );
  });
  await p.goto("https://www.instagram.com/reels/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(6000);

  const snap = async label => {
    const info = await p.evaluate(() => {
      const vids = [...document.querySelectorAll("video")];
      const inView = v => {
        const r = v.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0;
      };
      // Find the scrolling ancestor of the first video
      let s = vids[0]?.parentElement;
      while (
        s &&
        !(s.scrollHeight > s.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(s).overflowY))
      )
        s = s.parentElement;
      const links = [
        ...new Set(
          [...document.querySelectorAll('a[href*="/reel/"]')].map(a => a.getAttribute("href")),
        ),
      ];
      return {
        url: location.pathname,
        videos: vids.length,
        playing: vids.filter(v => !v.paused).length,
        inView: vids.filter(inView).length,
        videoSrc: vids.slice(0, 2).map(v => (v.currentSrc || v.src || "").slice(0, 40)),
        scroller: s
          ? {
              tag: s.tagName,
              cls: s.className.slice(0, 60),
              top: s.scrollTop,
              h: s.clientHeight,
              sh: s.scrollHeight,
              snap: getComputedStyle(s).scrollSnapType,
            }
          : null,
        reelLinks: links.slice(0, 8),
        sponsored: [...document.querySelectorAll("span,div")].filter(
          e => e.childElementCount === 0 && /^(Sponsored|Реклама)$/.test(e.textContent.trim()),
        ).length,
        ariaNav: [...document.querySelectorAll("[aria-label]")]
          .map(e => e.getAttribute("aria-label"))
          .filter(l => /next|previous|navigat|down|up/i.test(l))
          .slice(0, 6),
      };
    });
    console.log(label, JSON.stringify(info));
  };
  await snap("initial");
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(2500);
  await snap("after ArrowDown");
  await p.mouse.move(600, 450);
  await p.mouse.wheel(0, 900);
  await p.waitForTimeout(2500);
  await snap("after wheel");
  const down = p.locator('[aria-label*="Next" i], [aria-label*="down" i]').first();
  if (await down.count()) {
    await down.click();
    await p.waitForTimeout(2500);
    await snap("after next button");
  }
  for (let i = 0; i < 8; i++) {
    await p.keyboard.press("ArrowDown");
    await p.waitForTimeout(1500);
  }
  await snap("after 8 more");
  await p.screenshot({ path: "ig-after.png" });
  console.log("api calls:", [...new Set(gql)].slice(0, 20));
  await b.close();
})();
