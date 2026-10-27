# 005 — The one-off Prev timeout (2026-10-27)

## Symptom

One real-Instagram smoke run in Chromium (experiment 003) timed out after
clicking Prev: the page did not reach `/reel/<code>/` within 10 s. The click
itself succeeded (a disabled or covered button makes the harness throw "not
clickable", which is a different error).

## Attempts to reproduce

`repro.js` repeats pull → next → prev on real logged-out Instagram, and on
failure records what is under the Prev button (`elementFromPoint`), open
dialogs / top-layer elements, the final path, and a screenshot.

| Batch                                 | Runs | Failures |
| ------------------------------------- | ---- | -------- |
| repro.js                              | 10   | 0        |
| repro.js                              | 20   | 0        |
| smoke.js, Chromium (plain + uBO Lite) | 5    | 0        |
| smoke.js, Firefox (plain + uBO)       | 2    | 0        |

In every run the Prev button's centre hit Pulls' own `<pulls-ui>` host, and no
Instagram dialog or top-layer element was open.

## What the code says

`onPrev` reads today's list from memory and calls `location.assign()` — a hard
navigation the page can't intercept. Prev is only disabled when there is
nothing before the current item, and that produces a harness error, not a URL
timeout. So the click worked and _something about the navigation_ didn't:
slow load (> 10 s) or a redirect elsewhere (e.g. Instagram sending a
logged-out visitor to a login page). Neither is shown by evidence; the failing
run happened before repro.js existed and recorded only the timeout.

## Status

Not reproduced in ~37 runs; cause unknown. Not called a flake. `smoke.js` now
logs the path it ended on instead of throwing, so a recurrence identifies
itself. Worth keeping an eye on in real use: if Prev ever seems to "do nothing",
note the URL.

Possible product follow-up independent of this: Pulls' UI uses a max z-index,
which does **not** beat elements in the browser's top layer (`<dialog>` opened
with `showModal()`, popovers). If Instagram ever shows a top-layer dialog, it
would cover the Pulls panel. Not observed so far; moving the UI into the top
layer itself (popover API) would rule it out.
