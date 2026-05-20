// =========================================================
// ui.js — DOM rendering and helpers.
//
// This module owns all writes to the DOM. It does not mutate
// game state; main.js drives game logic, then calls render().
// =========================================================

import { TYPE, rankLabel, cardLabel, imageForCard, artworkName } from "./deck.js";
import { canAvoid, describeWeapon, MAX_HEALTH, ROOM_SIZE, RESOLVE_PER_ROOM } from "./game.js";

const $ = (sel, root = document) => root.querySelector(sel);

// ---- DOM handles, captured at startup ------------------
let dom = {};
export function bindDOM() {
  dom = {
    healthFill: $("#health-fill"),
    healthValue: $("#health-value"),
    healthBar: $(".health-bar"),
    weaponSlot: $("#weapon-slot"),
    turnCounter: $("#turn-counter"),
    deckCount: $("#deck-count"),
    discardCount: $("#discard-count"),
    btnAvoid: $("#btn-avoid"),
    roomGrid: $("#room-grid"),
    resolvedCount: $("#resolved-count"),
    emptyState: $("#empty-state"),
    log: $("#log"),
    seedReadout: $("#seed-readout"),
    debugDeck: $("#debug-deck"),
    debugDiscard: $("#debug-discard"),
  };
  return dom;
}

// ---------------------------------------------------------
// HUD
// ---------------------------------------------------------
export function renderHUD(state) {
  // Health
  const pct = Math.max(0, Math.min(100, (state.health / state.maxHealth) * 100));
  dom.healthFill.style.width = `${pct}%`;
  dom.healthValue.textContent = String(Math.max(0, state.health));
  dom.healthBar.setAttribute("aria-valuenow", String(Math.max(0, state.health)));
  dom.healthBar.setAttribute("aria-valuemax", String(state.maxHealth));
  dom.healthBar.setAttribute(
    "aria-label",
    `Health: ${Math.max(0, state.health)} of ${state.maxHealth}`,
  );
  dom.healthBar.dataset.low = state.health <= 6 ? "true" : "false";

  // Weapon
  renderWeapon(state);

  // Stats
  dom.turnCounter.textContent = String(state.turn || 1);
  dom.deckCount.textContent = String(state.deck.length);
  dom.discardCount.textContent = String(state.discard.length);

  // Avoid button
  const allowed = canAvoid(state);
  dom.btnAvoid.disabled = !allowed;
  dom.btnAvoid.title = allowed
    ? "Place all 4 cards on the bottom of the deck and draw a new room."
    : state.lastActionWasAvoid
        ? "You cannot avoid two rooms in a row."
        : state.resolvedThisRoom > 0
            ? "You can only avoid before resolving any cards in the room."
            : "No full room to avoid yet.";

  // Resolved counter (out of 3 in a full room, otherwise out of room size)
  const cap = state.room.length === ROOM_SIZE ? RESOLVE_PER_ROOM : state.room.length;
  $("#resolved-count").textContent = `${state.resolvedThisRoom}`;
  $("#resolved-cap").textContent = `${cap}`;
}

function renderWeapon(state) {
  const w = describeWeapon(state.weapon);
  if (!w) {
    dom.weaponSlot.innerHTML = `<div class="weapon-empty">— bare-handed —</div>`;
    dom.weaponSlot.setAttribute("aria-label", "No weapon equipped.");
    return;
  }
  // Synthesize a card object so artwork helpers work.
  const weaponCard = { suit: "♦", value: w.value, type: TYPE.WEAPON, id: `w-d-${w.value}` };
  const artName = artworkName(weaponCard);
  const artPath = imageForCard(weaponCard);

  const stackHTML = w.stack.length
    ? `<div class="weapon-stack" aria-label="Defeated stack">
         ${w.stack.map((c) => `<span class="chip">${c.suit}${rankLabel(c.value)}</span>`).join("")}
       </div>`
    : "";

  dom.weaponSlot.innerHTML = `
    <div class="weapon-card" aria-hidden="true"
         style="background-image: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.55)), url('${artPath}');">
      <span class="weapon-card-rank">♦${w.value}</span>
    </div>
    <div class="weapon-meta">
      <div class="line"><strong>${artName}</strong> — value <strong>${w.value}</strong></div>
      <div class="last">Last defeated: <strong>${w.lastDefeatedLabel}</strong></div>
      ${stackHTML}
    </div>`;
  const last = w.lastDefeated === null ? "none yet" : `value ${w.lastDefeated}`;
  dom.weaponSlot.setAttribute(
    "aria-label",
    `Weapon: ${artName}, value ${w.value}. Last defeated: ${last}. Stack size ${w.stack.length}.`,
  );
}

// ---------------------------------------------------------
// Room
// ---------------------------------------------------------

/**
 * Render the room. Reuses DOM nodes by card id when possible so the
 * flip animation runs only on freshly-revealed cards.
 */
export function renderRoom(state, opts = {}) {
  const { animateNew = true } = opts;
  dom.roomGrid.setAttribute("aria-busy", "false");
  dom.roomGrid.classList.toggle("is-game-over", state.status !== "playing");

  if (!state.room.length && state.status === "playing" && state.deck.length === 0) {
    dom.roomGrid.innerHTML = "";
    dom.emptyState.hidden = false;
    dom.emptyState.innerHTML = "Dungeon cleared.";
    return;
  }
  if (!state.room.length) {
    dom.roomGrid.innerHTML = "";
    dom.emptyState.hidden = false;
    return;
  }
  dom.emptyState.hidden = true;

  // Build a map of existing cards keyed by card.id.
  const existing = new Map();
  for (const node of dom.roomGrid.children) {
    existing.set(node.dataset.cardId, node);
  }

  const frag = document.createDocumentFragment();
  state.room.forEach((slot, idx) => {
    const id = slot.card.id;
    let node = existing.get(id);
    if (!node) {
      node = makeCardNode(slot, idx);
      // Reveal it on the next frame so the .is-flipped transition runs.
      if (animateNew) {
        requestAnimationFrame(() => node.classList.add("is-flipped"));
      } else {
        node.classList.add("is-flipped");
      }
    } else {
      // Update mutable attributes (resolved state, position).
      updateCardNode(node, slot, idx);
      existing.delete(id);
    }
    frag.appendChild(node);
  });
  // Remove any leftover (cards no longer in the room).
  for (const stale of existing.values()) stale.remove();

  dom.roomGrid.innerHTML = "";
  dom.roomGrid.appendChild(frag);
}

function makeCardNode(slot, idx) {
  const { card, resolved, carry } = slot;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "card";
  btn.setAttribute("role", "listitem");
  btn.classList.toggle("is-resolved", resolved);
  btn.dataset.cardId = card.id;
  btn.dataset.slot = String(idx);
  btn.dataset.type = card.type;
  btn.dataset.suit = card.suit;
  btn.dataset.carry = carry ? "true" : "false";
  btn.setAttribute("aria-label", a11yLabel(card, idx));
  btn.innerHTML = cardInnerHTML(card);
  return btn;
}

function updateCardNode(node, slot, idx) {
  node.dataset.slot = String(idx);
  node.dataset.carry = slot.carry ? "true" : "false";
  node.classList.toggle("is-resolved", slot.resolved);
  // Already flipped from previous render — keep face-up.
  node.classList.add("is-flipped");
}

function a11yLabel(card, idx) {
  const typeName = card.type[0].toUpperCase() + card.type.slice(1);
  const rank = rankLabel(card.value);
  const suitName = ({
    "♣": "clubs", "♠": "spades", "♦": "diamonds", "♥": "hearts",
  })[card.suit];
  const art = artworkName(card);
  const artBit = art ? ` (${art})` : "";
  return `Slot ${idx + 1}: ${typeName} ${rank} of ${suitName}${artBit}. Activate to resolve.`;
}

function cardInnerHTML(card) {
  const rank = rankLabel(card.value);
  const label = card.type === TYPE.MONSTER ? "Monster"
              : card.type === TYPE.WEAPON  ? "Weapon"
              : "Potion";
  const art = imageForCard(card);
  const artName = artworkName(card);

  return `
    <div class="flipper">
      <div class="card-face back" aria-hidden="true">
        <div class="back-frame">
          <div class="back-rune" aria-hidden="true">${card.suit}</div>
        </div>
      </div>
      <div class="card-face front">
        <img class="card-art"
             src="${art}"
             alt=""
             aria-hidden="true"
             decoding="async"
             draggable="false" />
        <div class="card-grain" aria-hidden="true"></div>
        <div class="card-corner tl">
          <span class="rank">${rank}</span>
          <span class="suit">${card.suit}</span>
        </div>
        <div class="card-banner">
          <span class="banner-label">${label}</span>
          <span class="banner-art" title="${artName}">${artName}</span>
        </div>
      </div>
    </div>`;
}

/**
 * Preload all card artwork so the first flip never shows a half-loaded image.
 * The deck only references 10 unique files, so this is cheap.
 */
export function preloadArt() {
  const paths = [
    "Assets/heart.jpg",
    "Assets/club-1.jpg",    "Assets/club-2.jpg",    "Assets/club-3.jpg",
    "Assets/spade-1.jpg",   "Assets/spade-2.jpg",   "Assets/spade-3.jpg",
    "Assets/diamond-1.jpg", "Assets/diamond-2.jpg", "Assets/diamond-3.jpg",
  ];
  for (const p of paths) {
    const img = new Image();
    img.decoding = "async";
    img.src = p;
  }
}

/** Flash a card briefly (used right after resolution for feedback). */
export function pulseCard(cardId) {
  const node = dom.roomGrid.querySelector(`[data-card-id="${cardId}"]`);
  if (!node) return;
  node.classList.add("is-resolving");
  setTimeout(() => node.classList.remove("is-resolving"), 280);
}

/** Shake the room (e.g. blocked action). */
export function shakeRoom() {
  dom.roomGrid.classList.remove("shake");
  // Force reflow so the animation can restart.
  void dom.roomGrid.offsetWidth;
  dom.roomGrid.classList.add("shake");
}

// ---------------------------------------------------------
// Log
// ---------------------------------------------------------

export function clearLog() {
  dom.log.innerHTML = "";
}

/**
 * Append a log entry. tone: 'info' | 'good' | 'bad' | 'warn' | 'accent'
 */
export function logEntry(text, tone = "info") {
  const li = document.createElement("li");
  li.className = `log-entry is-${tone}`;
  li.innerHTML = text;
  const now = new Date();
  const ts = `<span class="ts">${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}</span>`;
  li.innerHTML = ts + li.innerHTML;
  dom.log.appendChild(li);
  // Keep log size reasonable
  while (dom.log.children.length > 200) dom.log.firstElementChild.remove();
  dom.log.scrollTop = dom.log.scrollHeight;
}
function pad(n) { return n < 10 ? "0" + n : "" + n; }

/** Build a label like "Wraith (♣8)" combining art name + rank/suit. */
function namedCard(card) {
  const art = artworkName(card);
  const base = cardLabel(card);
  return art ? `${art} (${base})` : base;
}

/**
 * Convert game.events[] (from a single action) into readable log entries.
 */
export function logEventsFromState(state) {
  for (const ev of state.events) {
    switch (ev.type) {
      case "room-drawn":
        logEntry(`Entered Room <strong>${ev.turn}</strong> (${ev.size} card${ev.size === 1 ? "" : "s"}).`, "info");
        break;
      case "avoided":
        logEntry(`<strong>Avoided</strong> Room ${ev.turn} — cards moved to the bottom.`, "warn");
        break;
      case "blocked":
        // No log noise for blocked actions; UI already shakes.
        break;
      case "equipped":
        logEntry(`Equipped <strong>${namedCard(ev.card)}</strong>.`, "accent");
        break;
      case "potion-wasted":
        logEntry(`Potion <strong>${namedCard(ev.card)}</strong> wasted (already drank one this room).`, "warn");
        break;
      case "healed":
        if (ev.amount > 0) {
          logEntry(`Drank <strong>${namedCard(ev.card)}</strong> — healed <span class="v">+${ev.amount}</span> → <span class="v">${ev.after}</span>.`, "good");
        } else {
          logEntry(`Drank <strong>${namedCard(ev.card)}</strong> — already at full health.`, "info");
        }
        break;
      case "fought-weapon":
        if (ev.damage > 0) {
          logEntry(`Fought <strong>${namedCard(ev.card)}</strong> with ♦${ev.weaponValue}. Took <span class="v">${ev.damage}</span> damage.`, "bad");
        } else {
          logEntry(`Defeated <strong>${namedCard(ev.card)}</strong> cleanly with ♦${ev.weaponValue}.`, "good");
        }
        break;
      case "fought-bare":
        if (ev.reason === "weapon-locked") {
          logEntry(`Weapon locked (must be ≤ last defeated). Fought <strong>${namedCard(ev.card)}</strong> bare-handed — <span class="v">−${ev.damage}</span> HP.`, "bad");
        } else {
          logEntry(`Bare-handed vs <strong>${namedCard(ev.card)}</strong> — <span class="v">−${ev.damage}</span> HP.`, "bad");
        }
        break;
      case "won":
        logEntry(`<strong>Victory!</strong> Dungeon cleared. Score: <span class="v">${ev.score}</span>.`, "good");
        break;
      case "lost":
        logEntry(`<strong>Defeat.</strong> Score: <span class="v">${ev.score}</span> (${ev.monstersLeft} monster pts left).`, "bad");
        break;
    }
  }
}

// ---------------------------------------------------------
// Seed readout + debug panel
// ---------------------------------------------------------
export function renderSeed(seed) {
  dom.seedReadout.textContent = `Seed: ${seed}`;
}

export function renderDebug(state) {
  if (!dom.debugDeck) return;
  dom.debugDeck.innerHTML = state.deck
    .map((c) => `<li>${cardLabel(c)}</li>`)
    .join("");
  dom.debugDiscard.innerHTML = state.discard
    .map((c) => `<li>${cardLabel(c)}</li>`)
    .join("");
}

// ---------------------------------------------------------
// End-game modal
// ---------------------------------------------------------
export function renderEndModal(state) {
  const modal = document.getElementById("modal-end");
  const title = document.getElementById("modal-end-title");
  const summary = document.getElementById("end-summary");
  const score = document.getElementById("end-score");
  if (state.status === "won") {
    title.textContent = "Victory";
    summary.textContent = `You cleared the dungeon with ${state.health} health remaining.`;
    score.textContent = `Score: +${state.score}`;
    score.classList.remove("is-loss");
  } else {
    title.textContent = "Defeat";
    const remaining = -state.score;
    summary.textContent = `You fell in the dungeon. ${remaining} monster point${remaining === 1 ? "" : "s"} were left.`;
    score.textContent = `Score: ${state.score}`;
    score.classList.add("is-loss");
  }
  modal.hidden = false;
}

export function hideEndModal() {
  document.getElementById("modal-end").hidden = true;
}
