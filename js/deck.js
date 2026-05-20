// =========================================================
// deck.js — card definitions and dungeon deck construction.
//
// 44-card deck:
//   - 26 Monsters: all ♣ and ♠, values 2..14 (J=11, Q=12, K=13, A=14)
//   - 9 Weapons:   ♦ 2..10
//   - 9 Potions:   ♥ 2..10
//
// Each card is a plain object:
//   { id, type: 'monster'|'weapon'|'potion', suit: '♣'|'♠'|'♦'|'♥', value: number }
// =========================================================

import { mulberry32, shuffle } from "./rng.js";

export const SUIT = { CLUB: "♣", SPADE: "♠", DIAMOND: "♦", HEART: "♥" };
export const TYPE = { MONSTER: "monster", WEAPON: "weapon", POTION: "potion" };

/** Map numeric value -> display rank (2..14). */
export function rankLabel(value) {
  switch (value) {
    case 11: return "J";
    case 12: return "Q";
    case 13: return "K";
    case 14: return "A";
    default: return String(value);
  }
}

/** "♣10", "♦7", "♥A", etc. */
export function cardLabel(card) {
  return `${card.suit}${rankLabel(card.value)}`;
}

function make(id, type, suit, value) {
  return { id, type, suit, value };
}

/**
 * Build the canonical 44-card Scoundrel deck (unshuffled).
 */
export function buildDeck() {
  const cards = [];
  let id = 0;

  for (let v = 2; v <= 14; v++) {
    cards.push(make(`m-c-${v}`, TYPE.MONSTER, SUIT.CLUB,  v));  id++;
    cards.push(make(`m-s-${v}`, TYPE.MONSTER, SUIT.SPADE, v));  id++;
  }
  for (let v = 2; v <= 10; v++) {
    cards.push(make(`w-d-${v}`, TYPE.WEAPON,  SUIT.DIAMOND, v));
    cards.push(make(`p-h-${v}`, TYPE.POTION,  SUIT.HEART,   v));
  }
  void id;
  return cards; // expected length 26 + 9 + 9 = 44
}

/**
 * Build a shuffled dungeon deck for the given seed.
 * Returns { deck, seed } where deck is an array (index 0 = top).
 */
export function buildDungeon(seed) {
  const deck = buildDeck();
  const rand = mulberry32(seed);
  shuffle(deck, rand);
  return { deck, seed };
}
