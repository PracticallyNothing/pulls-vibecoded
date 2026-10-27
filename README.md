# pulls

Browser extension: a daily budget of "pulls" (new pieces of content) on
Instagram's home feed and reels. 10 pulls/day, the day resets at 08:00 local
time. Re-viewing today's pulls is free; only new content costs a pull, and
getting it takes two deliberate clicks (Pull → Accept) instead of a swipe.

- Design: `docs/design.md`
- Experiments and findings: `experiments/`

## Development

```sh
npm install
npm test            # unit tests (node:test, no browser)
npm run test:e2e    # builds dist-test/ and drives it in Chromium against a mock Instagram
npm run build       # builds dist/ — load as an unpacked extension
npm run format      # prettier
```

The e2e tests need Playwright's Chromium (`npx playwright install chromium` on a
new machine). They use full Chromium (`channel: "chromium"`): Playwright's
default headless shell can't load extensions.

Loading `dist/`:
- Chrome: `chrome://extensions` → Developer mode → Load unpacked.
- Firefox desktop: `npx web-ext run --source-dir dist`, or `about:debugging` →
  Load Temporary Add-on → `dist/manifest.json`.
- Firefox for Android: `npx web-ext run -t firefox-android --source-dir dist`
  with the phone connected over adb.

## Status

Done (tested against the mock): reels feed takeover — Pull screen, Pull → Accept,
native navigation blocked, free re-viewing of today's pulls via `/reel/<code>/`,
budget and 08:00 reset.

Smoke-tested on real logged-out Instagram (experiments/003).

Not yet: hide "More posts from …" on single-item pages, move the panel off the
caption, home feed and `/p/<code>/` posts, friend reels from DMs, ads, skipping
already-pulled items, items seen on earlier days. Not tested in Firefox (it
can't be installed in the cloud environment; `web-ext lint` passes).
