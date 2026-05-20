// =========================================================
// main.js — bootstrap, event wiring, persistence, controls.
//
// This file imports the rules engine (game.js) and the UI
// renderer (ui.js), and connects user input to game actions.
// Game state is persisted to LocalStorage after every action.
// =========================================================

import { newGame, avoidRoom, resolveSlot, MAX_HEALTH } from "./game.js";
import { randomSeed } from "./rng.js";
import { save, load, clear } from "./storage.js";
import {
  bindDOM,
  renderHUD,
  renderRoom,
  logEntry,
  logEventsFromState,
  clearLog,
  renderSeed,
  renderDebug,
  renderEndModal,
  hideEndModal,
  shakeRoom,
  pulseCard,
  preloadArt,
} from "./ui.js";

// ---------------------------------------------------------
// State
// ---------------------------------------------------------
/** @type {ReturnType<typeof newGame> | null} */
let state = null;

// We persist a slim copy of state to LocalStorage. game.state already is
// JSON-friendly (plain objects + arrays of primitives), so we can save
// it directly — minus transient `events` which is per-action only.
function persist() {
  if (!state) return;
  const { events, ...rest } = state;
  save({ ...rest, savedAt: Date.now() });
}

// ---------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  bindDOM();
  preloadArt();
  wireControls();
  wireKeyboard();
  wireModals();

  const saved = load();
  if (saved && saved.status && Array.isArray(saved.deck)) {
    state = { ...saved, events: [] };
    renderAll({ fromSave: true });
    logEntry("Resumed saved game.", "info");
    if (state.status !== "playing") renderEndModal(state);
  } else {
    startNewGame();
  }
});

// ---------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------
function startNewGame(seed) {
  hideEndModal();
  const useSeed = seed === undefined ? randomSeed() : (seed >>> 0);
  state = newGame(useSeed);
  clearLog();
  logEntry(`New game started. Seed <strong>${useSeed}</strong>. Health ${MAX_HEALTH}/${MAX_HEALTH}.`, "accent");
  logEventsFromState(state);
  renderAll();
  persist();
}

function restartCurrentSeed() {
  const seed = state ? state.seed : randomSeed();
  startNewGame(seed);
}

function renderAll(opts = {}) {
  if (!state) return;
  renderHUD(state);
  renderRoom(state, { animateNew: !opts.fromSave });
  renderSeed(state.seed);
  renderDebug(state);
}

// ---------------------------------------------------------
// Actions
// ---------------------------------------------------------
function onResolveSlot(slotIndex) {
  if (!state || state.status !== "playing") return;
  const slot = state.room[slotIndex];
  if (!slot || slot.resolved) return;

  const cardId = slot.card.id;
  const beforeRoomCount = state.room.length;
  const beforeFirstId = state.room[0]?.card?.id;

  resolveSlot(state, slotIndex);

  // If the room object is still the same (no draw yet), flash the resolved card.
  const sameRoom = state.room.length === beforeRoomCount
    && state.room[0]?.card?.id === beforeFirstId;
  if (sameRoom) pulseCard(cardId);

  logEventsFromState(state);
  renderAll();
  persist();
  maybeShowEndModal();
}

function onAvoid() {
  if (!state || state.status !== "playing") return;
  const before = state.lastActionWasAvoid;
  avoidRoom(state);
  const blocked = state.events.some((e) => e.type === "blocked");
  if (blocked) {
    shakeRoom();
    return;
  }
  void before;
  logEventsFromState(state);
  renderAll();
  persist();
  maybeShowEndModal();
}

function maybeShowEndModal() {
  if (state && state.status !== "playing") {
    setTimeout(() => renderEndModal(state), 200);
  }
}

// ---------------------------------------------------------
// Event wiring
// ---------------------------------------------------------
function wireControls() {
  document.getElementById("btn-new-game").addEventListener("click", () => startNewGame());
  document.getElementById("btn-restart").addEventListener("click", restartCurrentSeed);
  document.getElementById("btn-avoid").addEventListener("click", onAvoid);

  document.getElementById("btn-help").addEventListener("click", () => openModal("modal-help"));
  document.getElementById("btn-end-new").addEventListener("click", () => startNewGame());
  document.getElementById("btn-end-restart").addEventListener("click", restartCurrentSeed);

  document.getElementById("btn-clear-log").addEventListener("click", clearLog);

  // Debug
  const dbgBtn = document.getElementById("btn-debug");
  const dbgPanel = document.getElementById("debug-panel");
  dbgBtn.addEventListener("click", () => {
    const pressed = dbgBtn.getAttribute("aria-pressed") === "true";
    dbgBtn.setAttribute("aria-pressed", String(!pressed));
    dbgPanel.hidden = pressed; // toggle
    if (state) renderDebug(state);
  });
  document.getElementById("btn-apply-seed").addEventListener("click", () => {
    const v = document.getElementById("debug-seed").value.trim();
    if (!v) { startNewGame(); return; }
    const seed = Number.parseInt(v, 10);
    if (Number.isFinite(seed)) startNewGame(seed >>> 0);
  });

  // Delegated click on the room grid for card resolution.
  document.getElementById("room-grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const idx = Number.parseInt(card.dataset.slot, 10);
    if (Number.isFinite(idx)) onResolveSlot(idx);
  });
}

function wireKeyboard() {
  window.addEventListener("keydown", (e) => {
    // Don't hijack typing inputs.
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

    // Number keys 1..4 resolve room slot
    if (e.key >= "1" && e.key <= "4") {
      const idx = parseInt(e.key, 10) - 1;
      onResolveSlot(idx);
      return;
    }
    switch (e.key.toLowerCase()) {
      case "a": onAvoid(); break;
      case "n": startNewGame(); break;
      case "r": restartCurrentSeed(); break;
      case "?": openModal("modal-help"); break;
      case "escape": closeAnyModal(); break;
    }
  });
}

// ---------------------------------------------------------
// Modal handling (focus trap-ish + Esc to close + backdrop click)
// ---------------------------------------------------------
let lastFocused = null;

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  lastFocused = document.activeElement;
  m.hidden = false;
  // Focus first focusable element inside the panel.
  const f = m.querySelector("button, [href], input, [tabindex]:not([tabindex='-1'])");
  if (f) f.focus();
}

function closeModal(m) {
  if (!m || m.hidden) return;
  m.hidden = true;
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
}
function closeAnyModal() {
  document.querySelectorAll(".modal:not([hidden])").forEach(closeModal);
}

function wireModals() {
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) {
      const modal = e.target.closest(".modal");
      closeModal(modal);
    }
  });
}

// ---------------------------------------------------------
// Hard reset (exposed for console use; not in UI)
// ---------------------------------------------------------
window.scoundrel = {
  reset() { clear(); location.reload(); },
  state: () => state,
};
