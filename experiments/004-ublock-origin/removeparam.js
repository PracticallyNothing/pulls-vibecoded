// Proof that uBO is active on instagram.com: its bundled rule
// `||instagram.com^$removeparam=ig_rid` strips ig_rid from Instagram URLs.
import path from "node:path";
import { launch } from "../../test/e2e/harness.js";

const { b, close } = await launch(path.resolve("dist"));
try {
  await b.wait(Number(process.env.WARMUP_MS ?? 15000));
  await b.goto("https://www.instagram.com/reel/De4yWx-ge07/?ig_rid=pulls-test");
  await b.wait(4000);
  const url = await b.page.evaluate(() => location.href);
  console.log(
    url.includes("ig_rid") ? "ig_rid kept (uBO not filtering)" : "ig_rid stripped (uBO active)",
    url,
  );
} finally {
  await close();
}
