// =========================================================
// rng.js — seedable PRNG + Fisher–Yates shuffle.
//
// Why seedable? It lets us deterministically restart a game
// with the same deck order ("Replay Seed"), and powers the
// Debug panel. We use Mulberry32 — small, fast, good enough
// for shuffling a 44-card deck.
//
// This file uses an IIFE + global `Scoundrel` namespace so
// the project can run from a `file://` URL (no ES modules,
// no build step, no server required).
// =========================================================

(function () {
  "use strict";

  const NS = (window.Scoundrel = window.Scoundrel || {});

  /**
   * Create a seeded PRNG. Returns a function () => float in [0,1).
   * @param {number} seed - unsigned 32-bit integer
   */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rand() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Generate a fresh random 32-bit seed. */
  function randomSeed() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] >>> 0;
    }
    return (Math.random() * 0x100000000) >>> 0;
  }

  /**
   * In-place Fisher–Yates shuffle using the given rand() function.
   * Returns the same array for chaining.
   */
  function shuffle(array, rand) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  NS.RNG = { mulberry32, randomSeed, shuffle };
})();
