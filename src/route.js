// Mapping between Instagram URLs and items.
//   /reels/<code>/  reel inside the reels feed (feed: true)
//   /reel/<code>/   reel on its own page, no feed attached
//   /p/<code>/      post on its own page

const PATTERNS = [
  [/^\/reels\/([\w-]+)\/?$/, "reel", true],
  [/^\/reel\/([\w-]+)\/?$/, "reel", false],
  [/^\/p\/([\w-]+)\/?$/, "post", false],
];

export function parseItem(pathname) {
  for (const [re, kind, feed] of PATTERNS) {
    const m = pathname.match(re);
    if (m) return { kind, code: m[1], feed };
  }
  return null;
}

export function itemPath(item) {
  return item.kind === "post" ? `/p/${item.code}/` : `/reel/${item.code}/`;
}

// Previous and next item in today's list around `code`; null at either end.
export function neighbours(items, code) {
  const i = items.findIndex(it => it.code === code);
  if (i < 0) return { prev: null, next: null };
  return { prev: items[i - 1] ?? null, next: items[i + 1] ?? null };
}
