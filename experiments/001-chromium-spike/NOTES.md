# 001 — What can be prototyped in the cloud container? (2026-10-24)

## Environment findings

| Thing | Status |
|---|---|
| Node 22, npm registry | available |
| Chromium (Playwright 1.64, `/opt/pw-browsers`) | available; loads unpacked MV3 extensions **only with `channel: "chromium"`** — the default headless shell silently ignores `--load-extension` |
| Firefox binary | **not obtainable**: download.mozilla.org, packages.mozilla.org, Launchpad PPA, deb.debian.org, cdn.playwright.dev all denied by network policy; Ubuntu's `firefox` package is a snap stub |
| `web-ext lint` (Mozilla's addons-linter, via npm) | works offline — validates the manifest/code against Firefox rules |
| instagram.com, tiktok.com | **denied** by network policy (403 on CONNECT) |
| Android emulator / Firefox for Android | not available (no SDK, no KVM assumed, no Mozilla downloads) |

## Spike

`ext/` — MV3 extension, content script counts distinct `[data-item-id]` elements as
pulls, stores `{day, pulled[]}` in `chrome.storage.local`, hides items past `LIMIT`
(3 for the test). Day key = local date of `now - 8h`.

`mock/index.html` — endless feed stand-in; `more()` appends an item.

`run.js` — serves the mock, loads the extension into headless Chromium, drives it:

```
NODE_PATH=$(npm root -g) node run.js
first visit:  reel-1..3 shown, reel-4, reel-5 blocked
after reload: reel-1..3 shown (already pulled, free), reel-4 blocked
```

`npx web-ext lint --source-dir ext` → 0 errors, 0 warnings (needed
`browser_specific_settings.gecko.data_collection_permissions`).

## Known weaknesses of the spike (deliberately not addressed)

- Counts items when they hit the DOM, not when viewed. Feeds pre-render/prefetch
  several items ahead, so a real version must count on "becomes the active item"
  (IntersectionObserver / the site's active-reel marker), not on insertion.
- Hiding an element is cosmetic; the site keeps fetching and may autoplay audio of
  hidden items. Needs pausing media and/or blocking scroll past the last allowed item.
- Item identity on real sites = reel shortcode from URL (`/reels/<code>/`) — more
  stable than DOM attributes, which are obfuscated and churn.
- Day boundary only re-evaluated on each new item; fine, but DST days are 23/25h.
- Counting is per-browser-profile; desktop and mobile budgets would not be shared
  without sync (`storage.sync` doesn't sync between Firefox Android and desktop
  reliably — to check).
