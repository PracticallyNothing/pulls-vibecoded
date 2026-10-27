// Records that the background page started, and cancels one test URL the way
// uBlock Origin blocks requests (blocking webRequest).
browser.storage.local.set({ backgroundRan: Date.now() });
browser.webRequest.onBeforeRequest.addListener(
  () => ({ cancel: true }),
  {
    urls: ["*://*/blocked-by-control.js*"],
  },
  ["blocking"],
);
