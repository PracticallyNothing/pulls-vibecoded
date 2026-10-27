// Does an extension background page run under this automation setup?
// BROWSER=firefox EXTRA_EXTENSIONS=$PWD/experiments/004-ublock-origin/control-ext node experiments/004-ublock-origin/control.js
import { start } from "../../test/e2e/harness.js";

const h = await start();
try {
  await h.b.goto(h.base + "/");
  await h.b.wait(3000);
  await h.b.reload(); // content script reads storage after the background had time to write
  await h.b.wait(1500);
  console.log(
    await h.b.page.evaluate(async () => ({
      backgroundRan: document.documentElement.dataset.backgroundRan ?? "content script didn't run",
      blockedScript: await new Promise(r => {
        const s = document.createElement("script");
        s.src = "/blocked-by-control.js";
        s.onload = () => r("loaded (not blocked)");
        s.onerror = () => r("error (blocked)");
        document.head.append(s);
      }),
    })),
  );
} finally {
  await h.close();
}
