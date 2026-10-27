// Serves the mock Instagram and opens Chromium with the test build loaded.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const ext = path.resolve(here, "../../dist-test");

export async function start() {
  const html = fs.readFileSync(path.join(here, "mock/index.html"));
  const clip = fs.readFileSync(path.join(here, "mock/clip.webm"));
  const server = http
    .createServer((req, res) => {
      if (req.url === "/clip.webm") {
        res.writeHead(200, { "content-type": "video/webm" });
        return res.end(clip);
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html);
    })
    .listen(0, "127.0.0.1");
  await new Promise(r => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const ctx = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "pulls-e2e-")),
    {
      channel: "chromium", // the default headless shell can't load extensions
      headless: true,
      viewport: { width: 1000, height: 800 },
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    },
  );
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);

  return {
    page,
    base,
    async close() {
      await ctx.close();
      server.closeAllConnections();
      server.close();
    },
  };
}
