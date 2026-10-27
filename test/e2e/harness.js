// Serves the mock Instagram and opens a browser with the test build loaded.
// BROWSER=chromium (default, Playwright) or BROWSER=firefox (Puppeteer over
// WebDriver BiDi; FIREFOX_BIN points at the binary, default /opt/firefox/firefox).
//
// Tests talk to a small driver interface so the same tests run in both:
//   goto(url) reload() path() playing() press(key) wheel(dy) wait(ms)
//   visible(sel) text(sel) count(sel) disabled(sel) click(sel)
// Selectors are looked up in the plugin's shadow root first, then the document.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const testBuild = path.resolve(here, "../../dist-test");
const VIEWPORT = { width: 1000, height: 800 };
const TIMEOUT = 5000;

function serveMock() {
  const html = fs.readFileSync(path.join(here, "mock/index.html"));
  const clip = fs.readFileSync(path.join(here, "mock/clip.webm"));
  const server = http.createServer((req, res) => {
    if (req.url === "/clip.webm") {
      res.writeHead(200, { "content-type": "video/webm" });
      return res.end(clip);
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(html);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function launchChromium(ext) {
  const { chromium } = await import("playwright");
  const ctx = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "pulls-e2e-")),
    {
      channel: "chromium", // the default headless shell can't load extensions
      headless: true,
      viewport: VIEWPORT,
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    },
  );
  return { page: await ctx.newPage(), close: () => ctx.close() };
}

async function launchFirefox(ext) {
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    browser: "firefox",
    executablePath: process.env.FIREFOX_BIN ?? "/opt/firefox/firefox",
    headless: true,
  });
  await browser.installExtension(ext);
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  return { page, close: () => browser.close() };
}

// Runs in the page: find an element in the plugin's shadow root or the document.
const FIND = `sel => document.querySelector("pulls-ui")?.shadowRoot?.querySelector(sel) ?? document.querySelector(sel)`;

function driver(page, engine) {
  const inPage = (body, ...args) => page.evaluate(`(${body})(...${JSON.stringify(args)})`);
  const probe = sel =>
    inPage(
      `sel => {
        const el = (${FIND})(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const shown = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
        return { shown, disabled: Boolean(el.disabled), text: el.textContent,
                 x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }`,
      sel,
    );
  const wait = ms => new Promise(r => setTimeout(r, ms));

  return {
    page,
    wait,
    goto: url => page.goto(url),
    reload: () => page.reload(),
    path: () => inPage(`() => location.pathname`),
    playing: () =>
      inPage(`() => [...document.querySelectorAll("video")].filter(v => !v.paused).length`),
    count: sel => inPage(`sel => ((${FIND})(sel) ? 1 : 0)`, sel),
    visible: async sel => Boolean((await probe(sel))?.shown),
    text: async sel => (await probe(sel))?.text ?? null,
    disabled: async sel => Boolean((await probe(sel))?.disabled),
    // A real mouse click, once the element is visible and enabled.
    async click(sel, { timeout = TIMEOUT } = {}) {
      const end = Date.now() + timeout;
      for (;;) {
        const p = await probe(sel);
        if (p?.shown && !p.disabled) return page.mouse.click(p.x, p.y);
        if (Date.now() > end) throw new Error(`click: ${sel} not clickable (${JSON.stringify(p)})`);
        await wait(100);
      }
    },
    press: key => page.keyboard.press(key),
    async wheel(dy) {
      await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
      // Playwright: wheel(deltaX, deltaY); Puppeteer: wheel({ deltaX, deltaY }).
      if (engine === "firefox") await page.mouse.wheel({ deltaY: dy });
      else await page.mouse.wheel(0, dy);
    },
  };
}

// Opens the browser chosen by BROWSER with the extension in `extDir` loaded.
export async function launch(extDir) {
  const engine = process.env.BROWSER === "firefox" ? "firefox" : "chromium";
  const opened = engine === "firefox" ? await launchFirefox(extDir) : await launchChromium(extDir);
  return { engine, b: driver(opened.page, engine), close: opened.close };
}

export async function start() {
  const server = await serveMock();
  const base = `http://127.0.0.1:${server.address().port}`;
  const { engine, b, close } = await launch(testBuild);
  return {
    engine,
    b,
    base,
    async close() {
      await close();
      server.closeAllConnections();
      server.close();
    },
  };
}

// Polls an async predicate until it's true; throws with `label` after timeout.
// A check that throws (e.g. the page is mid-navigation) counts as "not yet".
export async function until(check, label, timeout = TIMEOUT) {
  const end = Date.now() + timeout;
  while (!(await check().catch(() => false))) {
    if (Date.now() > end) throw new Error(`timed out waiting for: ${label}`);
    await new Promise(r => setTimeout(r, 100));
  }
}
