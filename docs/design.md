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

## Open questions

- What exactly happens between Pull and Accept? (Options: a plain confirmation
  "Use 1 of 7 pulls?"; or a preview — author/caption/thumbnail — and Cancel
  doesn't cost a pull; or Cancel still costs the pull.)
