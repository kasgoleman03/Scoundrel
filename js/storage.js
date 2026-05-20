// =========================================================
// storage.js — thin LocalStorage wrapper for persistence.
//
// We persist the entire serializable game state under a
// single key so that:
//   - reloading the tab continues the same run
//   - "Restart" can reuse the same starting seed
// =========================================================

const KEY = "scoundrel.v1.state";

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Storage may be unavailable (private mode, full quota, etc.) — non-fatal.
    console.warn("Scoundrel: could not save state", err);
  }
}

export function load() {
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

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
