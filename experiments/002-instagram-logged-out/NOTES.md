# 002 — Logged-out Instagram reels feed (2026-10-27)

Network policy now allows instagram.com, cdninstagram.com, fbcdn.net.
Probe: `NODE_PATH=$(npm root -g) node probe.js` (headless Chromium, desktop
viewport 1280×900, not logged in).

## Findings

- `/reels/` works logged out — no login wall up front. It redirects to
  `/reels/<shortcode>/` of the first reel.
- **The URL tracks the active reel.** Every advance (ArrowDown, mouse wheel, the
  "Navigate to next Reel" button) changes the path to `/reels/<shortcode>/` via
  `history` API. → The shortcode in `location.pathname` is the natural pull id
  and the "this reel is now active" signal. No need to depend on DOM classes.
- Feed = one scrolling `<div>` with `scroll-snap-type: y mandatory`, ~900px per
  reel. Class names are atomic/obfuscated (`x1pq812k …`) — don't select on them.
- ~4 `<video>` elements in the DOM at once (prefetch), sources are `blob:` (MSE).
  Exactly one plays. → Confirms: counting on DOM insertion would overcharge.
- Stable-looking hooks: `aria-label="Reels navigation controls"`,
  `"Navigate to previous Reel"`, `"Navigate to next Reel"`.
- Three ways to advance seen so far: keyboard ArrowDown, wheel, the next button.
  (Touch swipe not tested — desktop viewport.)
- **Logged out, the feed stops after ~4 reels** with a "See what you're missing"
  sign-up modal. So logged-out access is enough to build and test navigation
  blocking on the first few reels, not more.
- No "Sponsored" items seen in 4 logged-out reels.

## Not observable logged out

- Behaviour past 4 reels, ads in the feed, DMs/friend-shared reels, the home feed
  and Explore as a logged-in user sees them. Those need a logged-in browser on
  the user's own machine, or DOM captures from it.

## Reload and direct URLs (`reload.js`)

- **Reload on `/reels/<X>/`** keeps X as the active reel, but the reels after it
  are freshly recommended. The sequence watched before the reload is gone from
  the page.
- **Opening `/reels/<X>/` directly** (fresh context): X first, then ArrowDown goes
  to a _new_ recommendation — not to whatever followed X originally.
- **Opening `/reel/<X>/`** (singular): just that one reel, 1 `<video>`, no
  next/previous buttons, ArrowDown does nothing. A dead end — no feed attached.
- `/reels/` with no code redirects to some reel and shows it immediately — i.e.
  landing on the feed reveals content without a pull.

## Home feed

`instagram.com/` logged out = login page. The home feed can't be studied from
here at all; it needs a logged-in browser or DOM captures.

> Correction (see 003): on real Instagram `/reel/<code>/` also shows a "More
> posts from <author>" grid under the reel. "Dead end" holds for navigation,
> not for content.
