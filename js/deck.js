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

/**
 * Image asset path for a given card, using the project's Assets/ folder.
 *
 * Tier mapping (all monochrome dark-fantasy art):
 *   ♥ Potion  → heart.jpg (single illustration for every potion)
 *   ♣ Club    → club-1 (val 2–5)   skeleton
 *               club-2 (val 6–10)  wraith
 *               club-3 (val 11–14) dire wolf       (J/Q/K/A)
 *   ♠ Spade   → spade-1 (val 2–5)   goblin
 *               spade-2 (val 6–10)  armored knight
 *               spade-3 (val 11–14) dragon          (J/Q/K/A)
 *   ♦ Diamond → diamond-1 (val 2–4) crossbow
 *               diamond-2 (val 5–7) war-axe
 *               diamond-3 (val 8–10) winged sword
 */
export function imageForCard(card) {
  const v = card.value;
  switch (card.suit) {
    case SUIT.HEART:
      return "Assets/heart.jpg";
    case SUIT.CLUB: {
      const tier = v <= 5 ? 1 : v <= 10 ? 2 : 3;
      return `Assets/club-${tier}.jpg`;
    }
    case SUIT.SPADE: {
      const tier = v <= 5 ? 1 : v <= 10 ? 2 : 3;
      return `Assets/spade-${tier}.jpg`;
    }
    case SUIT.DIAMOND: {
      const tier = v <= 4 ? 1 : v <= 7 ? 2 : 3;
      return `Assets/diamond-${tier}.jpg`;
    }
    default:
      return "";
  }
}

/** Thematic display name for the artwork (used in aria-labels / titles). */
export function artworkName(card) {
  const v = card.value;
  if (card.suit === SUIT.HEART) return "Heart Potion";
  if (card.suit === SUIT.CLUB) {
    if (v <= 5)  return "Skeleton";
    if (v <= 10) return "Wraith";
    return "Dire Wolf";
  }
  if (card.suit === SUIT.SPADE) {
    if (v <= 5)  return "Goblin";
    if (v <= 10) return "Armored Knight";
    return "Dragon";
  }
  if (card.suit === SUIT.DIAMOND) {
    if (v <= 4) return "Crossbow";
    if (v <= 7) return "War-axe";
    return "Winged Sword";
  }
  return "";
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
