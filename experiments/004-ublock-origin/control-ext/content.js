browser.storage.local.get("backgroundRan").then(r => {
  document.documentElement.dataset.backgroundRan = String(Boolean(r.backgroundRan));
});
