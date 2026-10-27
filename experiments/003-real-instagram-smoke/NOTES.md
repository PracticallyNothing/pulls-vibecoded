# 003 — Production build on real (logged-out) Instagram (2026-10-27)

`npm run build && node experiments/003-real-instagram-smoke/smoke.js <outdir>`
(Chromium, desktop 1280×900, not logged in. Screenshots not committed: they
show other people's content.)

## Result

```
landing:                 /reels/De4yWx-ge07/  gate shown, 10 left, 0 playing
after pull:              /reels/De4yWx-ge07/  revealed,    9 left, 1 playing
after ArrowDown + wheel: /reels/De4yWx-ge07/  unchanged — navigation blocked
after Next + accept:     /reels/De5XwU4hCZg/  new reel,    8 left, 1 playing
after Prev:              /reel/De4yWx-ge07/   first reel again, still 8 left
```

The reels takeover behaves on the real site as on the mock.

## New findings

- **`/reel/<code>/` is not a dead end on real Instagram** (correction to 002):
  desktop shows the post-detail layout with a **"More posts from <author>"**
  thumbnail grid below. Opening one is gated (not in today's list), but the
  thumbnails themselves are new content shown for free → hide that section.
- The plugin's prev/next panel (bottom centre) covers the reel's caption → move it.
- Logged out, Instagram adds sign-up modals on top; irrelevant when logged in.
