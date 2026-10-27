# Design notes

## Principles

- **Invasive by design.** Pulls significantly transforms the sites it touches. It
  does not politely hide items; it takes over the feed's navigation.
- **No mindless gestures.** Doomscrolling is driven by the mindless swipe/scroll.
  Native feed navigation (wheel, touch swipe, arrow keys, "next" buttons) is
  disabled. Getting new content takes two deliberate clicks: **Pull**, then
  **Accept / Cancel**.
- **Budget:** N pulls per day (default 10). Day resets at 08:00 local time.
  Going back to content already pulled today is free.
- **Friends' reels are free.** A reel opened from a message a friend sent does not
  cost a pull, so you can still engage with friends. Moving on from it to the
  *next* reel in the feed does cost a pull.

## Consequences / implementation notes

- Navigation blocking: capture-phase listeners for `wheel`, `touchmove`,
  `keydown` (arrows, space, j/k), plus `overflow: hidden` on the feed scroller.
  Pull → programmatic advance to the next item (scroll the scroller, or replay the
  site's own "next" action). Instagram is a React SPA that re-renders and
  re-attaches; the plugin must re-assert itself (MutationObserver,
  `history.pushState`/`popstate` hooks).
- Count a pull when an item becomes the *active* item, not when it is prefetched
  into the DOM (see experiments/001).
- "Opened from a friend" = navigation to `/reel/<code>/` that originates from
  `/direct/…` (click inside a DM thread). Record the code as free for today.
  Known loophole: sending reels to yourself / a throwaway chat. Accepted — the
  tool is for a willing user, not an adversary.
- Platforms: Firefox desktop, Firefox for Android, Chrome desktop. Chrome on
  Android does not support extensions at all, so "mobile" means Firefox only.
  Mobile means touch-first UI: Pull/Accept buttons must be thumb-reachable and
  swipe blocking must be watertight.

- **Pull → Accept is a plain confirmation** ("Use 1 of 7 pulls?"). No preview:
  a preview would itself become something to scroll. Cancel costs nothing.

## The two hard constraints

The user is the adversary *while bored*, and the judge *afterwards*.

1. **No easy cheats.** "Easy" = anything doable *inside the site/browser UI* in
   the craving state: swiping, other Instagram surfaces, direct reel URLs, the
   friend-reel path abused, and so on. Hard cheats (disabling the extension,
   editing code or storage, DevTools, clock changes, other browsers, the native
   app) are out of scope: the user considers them hard enough, already uses
   Instagram only in the browser, and owns the code — found cheats or
   annoyances get fixed as they come up.
2. **Never feel robbed.** If the plugin charges a pull for nothing, it gets
   disabled. Every charge must buy real content.

### In-app cheat vectors (must be closed)

| Vector | Answer |
|---|---|
| Swipe / wheel / keys / site "next" buttons | Blocked in capture phase; plugin re-asserts after every SPA re-render. |
| Other surfaces: home feed, Explore, stories, profile grids, search, `/reel/<code>` typed directly | Every content surface goes through pulls, or is removed. Only DMs, own profile, settings stay native. |
| Friend reel → keep going from there | Only the reel opened from the DM is free; the next one costs a pull. |
| Friend reels sent to self | Free only if sender ≠ viewer. |

### Never charge for

- Ads / sponsored items — skip them automatically, free.
- Load failures, unavailable/deleted reels, stalled video — charge only once the
  item actually plays (e.g. first frames rendered); otherwise refund.
- Duplicates — anything already pulled today is free (re-view). Items seen on
  earlier days: auto-skip, free.
- Double taps — the confirmation step already guards this.

No refunds for "it was boring" — that's a peek-then-refund cheat.

### Surfaces taken over

Two feeds, both algorithmic, both taken over:

- **Home feed** (`instagram.com/`, which the user calls the "For You" page):
  posts — photos, carousels, videos/reels. A pull = one post. Swiping through a
  carousel, reading comments, etc. on a pulled post is free. A pulled post is
  re-viewed via its single-post page `/p/<code>/`.
- **Reels feed** (`/reels/<code>/`): a pull = one reel, re-viewed via `/reel/<code>/`.

These are the feeds the plugin exists for. No "following only" option: that feed is a slow trickle of
mostly already-watched reels and can't be doomscrolled more than once.

## Today's pulls survive reloads

(Verified on the reels feed; assumed the same for the home feed, which
refreshes on reload.)

Instagram's feed forgets its sequence on reload (see experiments/002), so the
plugin owns the sequence, not the site:

- Today's pulls are stored as an ordered list of reel shortcodes.
- Previous/next *within today's pulls* is the plugin's own navigation, free, and
  shows each reel via `/reel/<code>/` — the single-reel page, which has no feed
  attached and so leaks nothing new.
- Only "next" past the end of the list offers **Pull**. Accepting loads the For
  You feed at `/reels/<last code>/`, advances once, and charges when the new reel
  plays. If the advance lands on a code already in today's list, skip on, free.
- Landing on `/reels/` (or a reload of it) never shows Instagram's pick directly:
  it goes to the latest pulled reel, or to the Pull screen if there are none yet.

## Decided

- Friend reels: unlimited, no daily cap (real-world volume is low). Revisit only
  if it becomes a problem.

## Open questions

- One shared daily budget across home feed and reels, and one combined list of
  today's pulls? (Assumed yes.)
- Stories bar on the home page: remove, leave native, or each story = a pull?
