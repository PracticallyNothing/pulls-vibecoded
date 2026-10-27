// Today's pulls and the rules for what may be shown. Pure: every function takes
// a state and returns a value or a new state; nothing here touches the browser.
//
// State: { day, limit, items: [{ kind, code, free }], pending }
//   items   - everything shown today, in order; re-viewing these is free
//   pending - a pull was accepted and the next new item may be shown

export function forDay(stored, day, limit) {
  if (stored && stored.day === day) return stored;
  return { day, limit, items: [], pending: false };
}

export function remaining(state) {
  return state.limit - state.items.filter(i => !i.free).length;
}

export function acceptPull(state) {
  if (remaining(state) <= 0) return { ok: false, state };
  return { ok: true, state: { ...state, pending: true } };
}

const pulledToday = (state, item) => state.items.some(i => i.code === item.code);

// What to do when an item becomes the active one: "show", "block" or "skip".
export function decide(state, item) {
  if (pulledToday(state, item)) return "show";
  if (item.ad) return "skip";
  if (item.fromFriend || state.pending) return "show";
  return "block";
}

// Record that an item was actually shown (image loaded / video playing).
// This is the only place a pull is charged.
export function commitShown(state, item) {
  if (pulledToday(state, item) || item.ad) return state;
  const entry = { kind: item.kind, code: item.code, free: Boolean(item.fromFriend) };
  if (item.fromFriend) return { ...state, items: [...state.items, entry] };
  if (state.pending) return { ...state, items: [...state.items, entry], pending: false };
  throw new Error(`commitShown: ${item.code} was not allowed to show`);
}
