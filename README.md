# Scoundrel

A polished, browser-based implementation of the solo card game **Scoundrel** —
a one-player dungeon crawl played with a standard deck of cards. Built with
**vanilla HTML, CSS, and JavaScript** (no frameworks, no build step).

![Genre: solo card game](https://img.shields.io/badge/genre-solo%20card%20game-gold)
![Stack: vanilla JS](https://img.shields.io/badge/stack-vanilla%20JS-blue)
![No build](https://img.shields.io/badge/build-none-green)

---

## Run

Because the app uses ES modules, browsers won't load it directly from `file://`
URLs. Serve the folder over HTTP — any of these works:

```bash
# Python (built-in)
python3 -m http.server 8080

# Node (one-liners)
npx serve .
npx http-server -p 8080
```

Then open <http://localhost:8080/> in any modern browser. The game runs
entirely on the client — no backend, no network calls.

> The game persists itself to `localStorage` so reloading the page resumes
> your current run. Use the in-game **New Game** to start over, or
> `scoundrel.reset()` in the dev console to wipe saved state.

---

## Game overview

You delve into a dungeon assembled from a 44-card deck. Each "room" reveals
up to 4 cards. You either **face** the room (resolving 3 of the 4 cards and
carrying the last one to the next room) or **avoid** it (putting all 4 cards
on the bottom of the deck). Survive until the deck is empty, and your
remaining health is your score.

## Rules

### The deck (44 cards)

| Cards         | Suits  | Values | Meaning                |
| ------------- | ------ | ------ | ---------------------- |
| 26 Monsters   | ♣ / ♠  | 2–14   | Damage equal to value  |
| 9 Weapons     | ♦      | 2–10   | Reduce monster damage  |
| 9 Potions     | ♥      | 2–10   | Heal by their value    |

Jokers, red face cards (J/Q/K of ♥/♦), and red aces (A♥, A♦) are removed.
J=11, Q=12, K=13, A=14.

### Each turn (a "Room")

1. Draw cards from the top of the deck until **4 cards** are visible
   (or until the deck runs out).
2. Choose **Avoid** or **Face**.
   - **Avoid** — place all 4 cards on the **bottom** of the deck, in order,
     and draw a new room. _You may not Avoid two rooms in a row._
   - **Face** — resolve **3 of the 4 cards** in any order. The 4th
     carries forward as the first card of the next room.

### Resolving cards

- **Weapon ♦** — equip it. Your previous weapon (and any monsters
  stacked on it) goes to the discard. The new weapon starts with no
  defeat history.
- **Potion ♥** — heal by its value, capped at 20. _Only the first
  potion resolved in a room heals you;_ additional potions are discarded
  with no effect.
- **Monster ♣ / ♠** — fight it.
  - **Bare-handed** — take damage equal to the monster's full value.
  - **With a weapon** — `damage = max(monster - weapon, 0)`. The
    monster is stacked on the weapon as a trophy.

### Weapon rule — _non-increasing_

After a weapon defeats a monster of value **N**, it can only be used
against monsters of value **≤ N**. If a monster is too big, you must
fight it **bare-handed**, and the weapon's history is unchanged.

> **Example.** Equip ♦6. Defeat ♣10 (4 damage, history → 10). Fight
> ♠9 (3 damage, history → 9). Fight ♣13 → weapon locked (13 > 9), so
> bare-handed for 13 damage. Fight ♠4 → allowed (4 ≤ 9), takes 0
> damage, history → 4.

### Ending and scoring

- **Win** — clear the deck. Score = **remaining health** (positive).
- **Loss** — health drops to ≤ 0. Score = **−(sum of monster values
  left in the deck)**.

---

## Controls

| Action            | Mouse                   | Keyboard         |
| ----------------- | ----------------------- | ---------------- |
| Resolve card 1–4  | Click a card            | `1` `2` `3` `4`  |
| Avoid the room    | "Avoid Room" button     | `A`              |
| New game          | "New Game" button       | `N`              |
| Replay this seed  | "Restart" button        | `R`              |
| Rules modal       | "Rules" button          | `?`              |
| Close modal       | Backdrop / ✕ button     | `Esc`            |

The Debug toggle reveals deck order and lets you start a game from a
specific seed (handy for testing or sharing puzzles).

---

## File map

```
scoundrel/
├── index.html            # Page structure: HUD, room, log, modals, controls
├── README.md             # You are here
├── css/
│   ├── styles.css        # Theme tokens, layout, HUD, log, modals, a11y
│   ├── cards.css         # Card sizing, faces, suit/type theming, states
│   └── animations.css    # Keyframes (flip, pulse, shake, glow, modal-in)
└── js/
    ├── main.js           # Bootstrap, event wiring, persistence, hotkeys
    ├── game.js           # Pure rules engine (state model + actions + scoring)
    ├── deck.js           # Card definitions and dungeon deck construction
    ├── rng.js            # Mulberry32 seedable PRNG + Fisher–Yates shuffle
    ├── ui.js             # All DOM rendering (HUD, room cards, log, modals)
    └── storage.js        # Tiny LocalStorage wrapper for persistence
```

### Responsibilities

- **`rng.js`** — deterministic PRNG so a seed always produces the same deck.
  Powers "Replay Seed" and the optional Debug seed input.
- **`deck.js`** — builds the 44-card deck, defines suits/types, formats
  labels (e.g. `♣10`, `♦7`).
- **`game.js`** — _the engine_. Holds no DOM. Implements:
  - `newGame(seed)`, `drawRoom`, `avoidRoom`, `resolveSlot`
  - The **non-increasing weapon rule** and the **one-potion-per-room** rule
  - Carry-over of the 4th card between rooms
  - Win/loss detection and scoring
  - An **events** array attached to state, consumed by the UI to render
    user-facing log entries.
- **`ui.js`** — pure DOM writes. Renders HUD, room grid (reusing nodes by
  card id so the flip animation only runs on new cards), the action log
  (ARIA live region), the seed readout, and the debug panel.
- **`storage.js`** — `save`, `load`, `clear` against a single
  `localStorage` key.
- **`main.js`** — wires DOM events to engine actions, then re-renders and
  persists. Owns keyboard shortcuts, modal open/close, and seed handling.

---

## Accessibility

- Fully keyboard operable (see Controls).
- Visible focus rings on every interactive element.
- ARIA labels on cards and HUD, ARIA live region on the action log.
- The health bar uses `role="meter"` with live `aria-valuenow` / `aria-valuemax`.
- All animations are disabled under `prefers-reduced-motion`.
- Skip-to-room link at the top of the page.

---

## Design notes

- **Theme** lives in CSS custom properties at the top of `styles.css`
  (surfaces, text, accents, suit colors, motion timings). Tweak one
  variable to retheme the app.
- **Card flips** use a CSS 3D transform on a `.flipper` wrapper with two
  absolutely-positioned faces (`.back` and `.front`).
- The room grid **reuses DOM nodes by card id** between renders so a
  carried-over card doesn't re-animate when its slot changes.
- The action log uses **`aria-live="polite"`** so screen readers
  announce each event without interrupting the user.
- The engine is **pure** — every action takes state in and produces
  state + an `events[]` array. The UI consumes events to write log
  entries, so engine and presentation stay decoupled.

---

## Credits

Scoundrel was designed by **Zach Gage** and **Kurt Bieg**. This
implementation is an independent fan project for portfolio purposes.
