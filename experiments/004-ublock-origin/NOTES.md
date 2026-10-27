# 004 — Pulls alongside uBlock Origin (Firefox) and uBO Lite (Chromium) (2026-10-27)

uBlock Origin 1.75.0 (signed, from addons.mozilla.org), Firefox 158.0.1, headless,
driven by Puppeteer over WebDriver BiDi.

## Result

With uBO **verified active**, everything behaves exactly as without it:

| Run                        | uBO install                                           | Result                                                                   |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| e2e suite (mock)           | temporary (BiDi `webExtension.install`, unpacked dir) | 8/8 pass                                                                 |
| e2e suite (mock)           | permanent (enterprise policy `force_installed`)       | 8/8 pass                                                                 |
| real Instagram smoke (003) | permanent                                             | same flow as without uBO: gate → pull → navigation blocked → next → prev |

Expected: none of uBO's bundled filters target the reels feed.

## uBO and Instagram — matters for the home feed (not built yet)

The bundled lists have 43 rules mentioning instagram.com. Relevant ones:

- `instagram.com##main … article > div:has(… span:has-text(/Ad$|Sponsored|…/))`
  and `instagram.com##article:has(a[href^="https://www.facebook.com/ads/"]):style(height: 0 !important; …)`
  — hide sponsored posts in the home feed (`display:none` / collapsed to 0 height).
- `instagram.com##+js(json-prune, data.xdt_injected_story_units.ad_media_items)`
  — strips injected ad stories from Instagram's data.
- `||instagram.com^$removeparam=ig_rid` — strips a tracking parameter.

Consequence: on the home feed, Pulls must not charge for a post uBO hid
(0 height or not displayed). "Charge only when actually shown" covers it in
principle; the home-feed code must check visibility, not just DOM presence.

## How "uBO is active" was established (and what didn't work)

Works: `removeparam.js` — opens `/reel/<code>/?ig_rid=…`; uBO strips `ig_rid`,
plain Firefox keeps it. (Not `/reels/?ig_rid=…`: Instagram's own redirect drops
the query either way.)

```
plain          ig_rid kept (uBO not filtering)
uBO-policy     ig_rid stripped (uBO active)
uBO-temporary  ig_rid stripped (uBO active)
```

`control-ext/` + `control.js`: a minimal MV2 extension proving background pages
and blocking `webRequest` work under this automation in Firefox (they don't in
Chromium — MV2 is gone there; Chrome users get uBO Lite instead, see below).

Dead ends, recorded so they aren't retried:

- Probing with `.adsbygoogle` / `.adsbox` elements and the adsbygoogle.js script:
  the bundled lists have no generic rules for those (the script is only
  blocked/redirected on specific sites). Read the lists before choosing probes.
- `.ad_banner` (which _is_ a generic EasyList rule) stayed visible on the
  127.0.0.1 mock and example.com — not understood; didn't matter once
  `removeparam` gave a clean signal.
- `about:support` and `moz-extension://` pages can't be opened over BiDi.
- Temporary add-ons don't appear in the profile's `extensions.json`; the
  policy-installed one does (`active: true, signedState: 2`).

## Chromium + uBlock Origin Lite

uBO Lite 2026.1026.1812 (MV3, `declarativeNetRequest`), from the Chrome Web
Store's update endpoint (`clients2.google.com/service/update2/crx`, store id
`ddkjiahejlhfcafbddmgiahcphecmpfh`), unpacked. Chromium 153.

- Active: `removeparam.js` → `ig_rid stripped` with uBOL, kept without.
- e2e suite: 8/8 pass. Real Instagram smoke: same flow as without it.
- Its compiled rulesets contain the same Instagram rules as full uBO
  (sponsored-post hiding, `xdt_injected_story_units.ad_media_items` pruning,
  `ig_rid`), so the home-feed caveat above applies to Chrome too.

```sh
EXTRA_EXTENSIONS=/opt/ubol/unpacked npm run test:e2e
```

## Environment setup (cloud container, not in the repo)

- `/opt/firefox` — official release tarball. `distribution/policies.json`
  installs the environment's proxy CAs (`Certificates.Install`); without them
  every HTTPS load fails with `SEC_ERROR_UNKNOWN_ISSUER`.
- `/opt/firefox-ubo` — hard-linked copy whose `policies.json` additionally
  force-installs `/opt/ubo/ublock-origin.xpi`.
- `/opt/ubo/unpacked` — the xpi unzipped, for temporary installs.
- `/opt/ubol/unpacked` — uBO Lite's crx unzipped (`unzip` skips the CRX3 header).

```sh
FIREFOX_BIN=/opt/firefox-ubo/firefox npm run test:e2e:firefox
EXTRA_EXTENSIONS=/opt/ubo/unpacked npm run test:e2e:firefox
```
