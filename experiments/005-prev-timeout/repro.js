// Repeats the smoke flow (pull, next, prev) on real Instagram and, when Prev
// doesn't reach /reel/<code>/, records what is under the Prev button.
// Usage: npm run build && [BROWSER=...] node experiments/005-prev-timeout/repro.js <runs> <outdir>
import path from "node:path";
import { launch, until } from "../../test/e2e/harness.js";

const runs = Number(process.argv[2] ?? 5);
const out = process.argv[3] ?? ".";

// What the mouse would hit at the centre of the Prev button.
const underPrev = b =>
  b.page.evaluate(() => {
    const host = document.querySelector("pulls-ui");
    const btn = host?.shadowRoot?.querySelector("[data-pulls=prev]");
    if (!btn) return { error: "no prev button" };
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    const describe = el =>
      el &&
      `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""}`;
    return {
      disabled: btn.disabled,
      hit: describe(hit),
      hitIsOurs: hit === host,
      topLayer: [...document.querySelectorAll("dialog[open], :popover-open")].map(describe),
      dialogs: [...document.querySelectorAll("[role=dialog]")].map(describe),
    };
  });

let failures = 0;
for (let i = 1; i <= runs; i++) {
  const { engine, b, close } = await launch(path.resolve("dist"));
  try {
    await b.goto("https://www.instagram.com/reels/");
    await b.wait(6000);
    await b.click("[data-pulls=pull]", { timeout: 10000 });
    await b.click("[data-pulls=accept]");
    await b.wait(4000);
    const first = await b.path();
    await b.click("[data-pulls=next]");
    await b.click("[data-pulls=accept]");
    await b.wait(4000);
    const before = await underPrev(b);
    await b.click("[data-pulls=prev]");
    const ok = await until(async () => (await b.path()).startsWith("/reel/"), "/reel/", 10000)
      .then(() => true)
      .catch(() => false);
    console.log(
      engine,
      `run ${i}:`,
      ok ? "ok" : "FAILED",
      JSON.stringify({
        first,
        before,
        after: ok ? undefined : await underPrev(b),
        path: await b.path(),
      }),
    );
    if (!ok) {
      failures++;
      await b.page.screenshot({ path: path.join(out, `${engine}-prev-fail-${i}.png`) });
    }
  } catch (e) {
    console.log(`run ${i}: error`, e.message.split("\n")[0]);
  } finally {
    await close();
  }
}
console.log(`${failures}/${runs} failed`);
