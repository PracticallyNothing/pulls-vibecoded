// Spike: count distinct feed items as "pulls"; hide new ones past the daily limit.
// The mock feed marks items with [data-item-id]. Real sites need real selectors.
const LIMIT = 3;
const RESET_HOUR = 8;

// A "pull day" starts at 08:00 local time: shift the clock back 8h, take the date.
function dayKey(now = new Date()) {
  const d = new Date(now.getTime() - RESET_HOUR * 3600 * 1000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function loadState() {
  const { state } = await chrome.storage.local.get("state");
  if (!state || state.day !== dayKey()) return { day: dayKey(), pulled: [] };
  return state;
}

let busy = Promise.resolve();
function handle(el) {
  busy = busy.then(async () => {
    const id = el.dataset.itemId;
    const state = await loadState();
    if (state.pulled.includes(id)) return;          // re-viewing is free
    if (state.pulled.length < LIMIT) {
      state.pulled.push(id);
      await chrome.storage.local.set({ state });
    } else {
      el.dataset.pullsBlocked = "1";
      el.style.display = "none";
    }
  });
}

document.querySelectorAll("[data-item-id]").forEach(handle);
new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes)
    if (n.nodeType === 1 && n.matches("[data-item-id]")) handle(n);
}).observe(document.body, { childList: true, subtree: true });
