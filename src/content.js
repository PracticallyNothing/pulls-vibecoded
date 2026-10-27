// Content script: wires the ledger to Instagram's pages.
import { dayKey } from "./day.js";
import { forDay, remaining, acceptPull, decide, commitShown } from "./ledger.js";
import { parseItem, itemPath, neighbours } from "./route.js";
import { createUi } from "./ui.js";

const LIMIT = __PULL_LIMIT__;
const KEY = "pulls";

let state = forDay(undefined, dayKey(new Date()), LIMIT);
let gated = false;

async function load() {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  state = forDay(stored, dayKey(new Date()), LIMIT);
}

async function save() {
  await chrome.storage.local.set({ [KEY]: state });
}

const onFeed = () => location.pathname.startsWith("/reels/");

// --- Native navigation is blocked on the feed --------------------------------

const BLOCKED_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

function swallow(e) {
  e.preventDefault();
  e.stopImmediatePropagation();
}

addEventListener(
  "keydown",
  e => {
    if (onFeed() && BLOCKED_KEYS.has(e.key) && !e.composedPath().some(isOwnUi)) swallow(e);
  },
  { capture: true },
);
for (const type of ["wheel", "touchmove"])
  addEventListener(type, e => onFeed() && swallow(e), { capture: true, passive: false });

const isOwnUi = el => el?.tagName === "PULLS-UI";

const style = document.createElement("style");
style.textContent = `
  [aria-label="Navigate to next Reel"], [aria-label="Navigate to previous Reel"] { display: none !important; }
`;
document.documentElement.append(style);

// The feed scroller: the scroll-snapping ancestor of the videos. Its own
// scrolling is switched off; the plugin scrolls it programmatically.
function feedScroller() {
  for (let el = document.querySelector("video"); el; el = el.parentElement)
    if (getComputedStyle(el).scrollSnapType.startsWith("y")) return el;
  return null;
}

function lockScroller() {
  const s = feedScroller();
  if (s) s.style.setProperty("overflow-y", "hidden", "important");
}

function advance() {
  const next = document.querySelector('[aria-label="Navigate to next Reel"]');
  if (next) return next.click();
  const s = feedScroller();
  s?.scrollBy({ top: s.clientHeight });
}

// --- Media ------------------------------------------------------------------

// Nothing plays while gated.
document.addEventListener(
  "play",
  e => {
    if (gated) e.target.pause();
  },
  { capture: true },
);

function pauseAll() {
  for (const v of document.querySelectorAll("video")) v.pause();
}

// The active item's video: the one across the middle of the viewport.
function activeVideo() {
  const mid = innerHeight / 2;
  return [...document.querySelectorAll("video")].find(v => {
    const r = v.getBoundingClientRect();
    return r.top <= mid && r.bottom >= mid;
  });
}

// The active item is "shown" once its video actually plays.
function activeVideoPlaying() {
  const v = activeVideo();
  return Boolean(v) && !v.paused && v.readyState >= 2;
}

// --- Pulling ----------------------------------------------------------------

async function requestPull() {
  await load();
  if (remaining(state) <= 0) return render();
  if (!(await ui.confirm())) return;
  await load();
  const r = acceptPull(state);
  if (!r.ok) return render();
  state = r.state;
  await save();

  const item = parseItem(location.pathname);
  if (!onFeed()) return location.assign("/reels/");
  // On the feed: a gated item is revealed by the next tick; a pulled one is
  // left behind for the next item in the feed.
  if (item && decide(state, item) === "show" && !gated) advance();
  tick();
}

const ui = createUi({
  onPrev() {
    const item = parseItem(location.pathname);
    const { prev } = here(item);
    if (prev) location.assign(itemPath(prev));
  },
  onNext() {
    const item = parseItem(location.pathname);
    const { next } = here(item);
    if (next) return location.assign(itemPath(next));
    requestPull();
  },
  onPull: requestPull,
});

// Neighbours of the current item in today's list. An item not in the list
// (gated) sits after the end of it.
function here(item) {
  const inList = item && state.items.some(i => i.code === item.code);
  if (inList) return neighbours(state.items, item.code);
  return { prev: state.items.at(-1) ?? null, next: null };
}

function render() {
  const item = parseItem(location.pathname);
  const relevant = Boolean(item) || onFeed();
  const { prev, next } = here(item);
  ui.render({
    gate: gated,
    panel: relevant && !gated,
    left: remaining(state),
    canPrev: Boolean(prev),
    canNext: Boolean(next) || remaining(state) > 0,
  });
}

// --- Main loop --------------------------------------------------------------

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await load();
    if (document.body) ui.mount();
    const item = parseItem(location.pathname);

    if (onFeed()) lockScroller();

    if (!item) {
      gated = onFeed(); // "/reels/" before Instagram picks a reel
    } else {
      const d = decide(state, item);
      if (d === "skip") advance();
      const wasGated = gated;
      gated = d === "block";
      // Videos were paused behind the Pull screen; nothing restarts them.
      if (wasGated && !gated) activeVideo()?.play();
      if (d === "show" && activeVideoPlaying()) {
        const before = state;
        state = commitShown(state, item);
        if (state !== before) await save();
      }
    }
    if (gated) pauseAll();
    render();
  } finally {
    busy = false;
  }
}

// URL changes on Instagram happen through history.pushState in the page's own
// JS world, which a content script can't hook; polling is simple and reliable.
setInterval(tick, 150);
tick();
