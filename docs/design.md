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

1. **No easy cheats.** In the craving state, any low-friction bypass will be
   used. Effortful bypasses (editing code, root access) are acceptable residual
   risk — the craving usually passes before they're done.
2. **Never feel robbed.** If the plugin charges a pull for nothing, it gets
   disabled. Every charge must buy real content.

### Cheat vectors and answers

| Vector | Answer |
|---|---|
| Native Instagram app on the phone | Out of the plugin's reach. Uninstall the app; use Firefox for Android only. **Precondition, not a feature.** |
| Disable / remove the extension | Desktop: install via enterprise policy (`policies.json` / Chrome managed policy, `force_installed`), root-owned → not removable from the UI. Firefox Android has no policy support → residual risk. |
| Private window / other profile / other browser | Policy: force-allow in private browsing. Other browsers: block instagram.com there by policy or hosts. Per-profile budgets otherwise. |
| Change system clock | Take time from the HTTP `Date` header of Instagram's own responses, not the local clock. Never let the stored day go backwards. |
| Clear extension storage / reinstall | Covered by forced install; storage survives updates. |
| Swipe / wheel / keys / site "next" buttons | Blocked in capture phase; plugin re-asserts after every SPA re-render. |
| Other surfaces: home feed, Explore, stories, profile grids, search, `/reel/<code>` typed directly | Every content surface goes through pulls, or is removed. Only DMs, own profile, settings stay native. |
| "Friend" reels sent to self, alt account, group chat | Free only if sender ≠ viewer. Alt/group abuse: open question (cap?). |
| DevTools editing storage | Accepted residual risk (effortful). |

### Never charge for

- Ads / sponsored items — skip them automatically, free.
- Load failures, unavailable/deleted reels, stalled video — charge only once the
  item actually plays (e.g. first frames rendered); otherwise refund.
- Duplicates — anything already pulled today is free (re-view). Items seen on
  earlier days: auto-skip, free.
- Double taps — the confirmation step already guards this.

No refunds for "it was boring" — that's a peek-then-refund cheat.

### Quality lever (idea)

The plugin can't fix the recommendation algorithm, but it can choose the
*source* of the next pull: e.g. "reels from accounts I follow" vs "suggested".
Better hit rate per pull = less feeling robbed.

## Open questions

- Friend reels: unlimited, or capped per day to close the alt-account/group loophole?
- Pull sources: algorithmic feed only, or a "following only" option?
