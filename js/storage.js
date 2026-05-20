// =========================================================
// storage.js — thin LocalStorage wrapper for persistence.
//
// We persist the entire serializable game state under a
// single key so that:
//   - reloading the tab continues the same run
//   - "Restart" can reuse the same starting seed
//
// Note: when running from a `file://` URL, localStorage is
// scoped per file path. Persistence may or may not survive
// across sessions depending on the browser, but the game
// still works fine if it doesn't.
// =========================================================

(function () {
  "use strict";

  const NS = (window.Scoundrel = window.Scoundrel || {});
  const KEY = "scoundrel.v1.state";

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Scoundrel: could not save state", err);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (err) {
      console.warn("Scoundrel: could not load state", err);
      return null;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
  }

  NS.Storage = { save, load, clear };
})();
