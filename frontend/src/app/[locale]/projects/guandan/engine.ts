// 掼蛋 (Guandan) card engine — pure, framework-free so it can be unit-tested.
// Ported/adapted from jackyys/guandan (used with the author's permission) and
// extended: real 2v2 comparison helpers, corrected bomb ordering, level cards.

export type Suit = "♠" | "♥" | "♦" | "♣" | "";
export interface Card {
  id: number;
  suit: Suit;
  rank: string; // '3'..'10','J','Q','K','A','2','小王','大王'
}

export const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
// Level progression order for 打级.
export const LEVEL_SEQ = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export const BASE: Record<string, number> = {
  "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14, "2": 15, "小王": 16, "大王": 17,
};

export function isJoker(rank: string): boolean {
  return rank === "小王" || rank === "大王";
}

/** Strength of a rank, with the current level card elevated just below the jokers. */
export function cardVal(card: Card, level: string): number {
  if (isJoker(card.rank)) return BASE[card.rank];
  if (card.rank === level) return 15.5;
  return BASE[card.rank];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  let id = 0;
  for (let d = 0; d < 2; d++) {
    for (const s of suits) for (const r of RANKS) deck.push({ id: id++, suit: s, rank: r });
    deck.push({ id: id++, suit: "", rank: "小王" });
    deck.push({ id: id++, suit: "", rank: "大王" });
  }
  return deck;
}

/** Deal 27 cards to each of 4 players. */
export function deal(): Card[][] {
  const deck = shuffle(createDeck());
  const hands: Card[][] = [[], [], [], []];
  let idx = 0;
  for (let i = 0; i < 27; i++) {
    for (let p = 0; p < 4; p++) hands[p].push(deck[idx++]);
  }
  return hands;
}

export function sortHand(cards: Card[], level: string): Card[] {
  return [...cards].sort((a, b) => cardVal(a, level) - cardVal(b, level) || a.suit.localeCompare(b.suit));
}

// ── Combo analysis ──────────────────────────────────────────────────────────
// cat encodes the bomb hierarchy so comparison is a single numeric ladder:
//   0 = normal (single/pair/triple/三带二/顺子/连对/飞机)
//   4,5,6 = same-rank bombs of that size
//   6.5 = 同花顺 (beats 4/5/6-card bombs, loses to 7/8-card bombs)
//   7,8 = larger same-rank bombs
//   100 = 天王炸 (four jokers)
export interface Combo {
  kind: string;
  cat: number;
  len: number;   // total cards (for straights/连对/飞机 comparison)
  value: number; // strength within the type
  cards: Card[];
}

function consecutive(sortedUnique: number[]): boolean {
  if (sortedUnique.length === 0) return false;
  for (let i = 1; i < sortedUnique.length; i++) {
    if (sortedUnique[i] !== sortedUnique[i - 1] + 1) return false;
  }
  return true;
}

/** The ♥ card matching the current level is the 逢人配 wild card. */
export function isWild(card: Card, level: string): boolean {
  return card.suit === "♥" && card.rank === level;
}

function rankVal(rank: string, level: string): number {
  return rank === level ? 15.5 : BASE[rank];
}

/** Highest top-base of a run of k consecutive ranks (each needing `mult` copies),
 * filling shortfalls with `w` wilds; every natural must fit inside the window and
 * be consumed, wilds used exactly. null if no fit. */
function seqTop(natByRank: Record<string, Card[]>, w: number, mult: number, k: number): number | null {
  if (k <= 0) return null;
  const counts: Record<number, number> = {};
  for (const r of Object.keys(natByRank)) {
    const b = BASE[r];
    if (b === 15) return null; // '2' cannot appear in a run
    counts[b] = (counts[b] || 0) + natByRank[r].length;
  }
  let best: number | null = null;
  for (let lo = 3; lo <= 14 - k + 1; lo++) {
    const window: number[] = [];
    for (let x = lo; x < lo + k; x++) window.push(x);
    const wset = new Set(window);
    if (Object.keys(counts).some((b) => !wset.has(Number(b)))) continue;
    if (window.some((b) => (counts[b] || 0) > mult)) continue;
    const need = window.reduce((s, b) => s + (mult - (counts[b] || 0)), 0);
    if (need === w) {
      const top = lo + k - 1;
      if (best === null || top > best) best = top;
    }
  }
  return best;
}

export function analyze(cards: Card[], level: string): Combo | null {
  const n = cards.length;
  if (n === 0) return null;

  const wilds = cards.filter((c) => isWild(c, level));
  const w = wilds.length;
  const naturals = cards.filter((c) => !isWild(c, level));
  const jc = naturals.filter((c) => isJoker(c.rank)).length;

  // Combos containing jokers: wilds may not mix with jokers.
  if (jc > 0) {
    if (w > 0) return null;
    if (n === 4) {
      const big = cards.filter((c) => c.rank === "大王").length;
      const small = cards.filter((c) => c.rank === "小王").length;
      if (big === 2 && small === 2) return { kind: "天王炸", cat: 100, len: 4, value: 1000, cards };
    }
    if (n === 1) return { kind: "单牌", cat: 0, len: 1, value: BASE[cards[0].rank], cards };
    if (n === 2 && cards[0].rank === cards[1].rank) return { kind: "对子", cat: 0, len: 2, value: BASE[cards[0].rank], cards };
    return null;
  }

  const natByRank: Record<string, Card[]> = {};
  for (const c of naturals) (natByRank[c.rank] ||= []).push(c);
  const natRanks = Object.keys(natByRank);

  // same-rank bomb (4–8), wilds fill
  if (n >= 4 && natRanks.length <= 1 && naturals.length > 0)
    return { kind: "炸弹", cat: n, len: n, value: rankVal(natRanks[0], level), cards };

  // 同花顺 — naturals same suit, wilds fill
  if (n >= 5 && naturals.length > 0) {
    const suits = new Set(naturals.map((c) => c.suit));
    if (suits.size === 1 && !suits.has("")) {
      const top = seqTop(natByRank, w, 1, n);
      if (top !== null) return { kind: "同花顺", cat: 6.5, len: n, value: top, cards };
    }
  }

  // single / pair / triple (same rank, wilds fill)
  if (n === 1) {
    const r = naturals.length ? natRanks[0] : level;
    return { kind: "单牌", cat: 0, len: 1, value: rankVal(r, level), cards };
  }
  if (n === 2 && natRanks.length <= 1) {
    const r = naturals.length ? natRanks[0] : level;
    return { kind: "对子", cat: 0, len: 2, value: rankVal(r, level), cards };
  }
  if (n === 3 && natRanks.length <= 1 && naturals.length > 0)
    return { kind: "三张", cat: 0, len: 3, value: rankVal(natRanks[0], level), cards };

  // 三带二 — triple + pair, wilds fill
  if (n === 5) {
    let bestT: number | null = null;
    for (const t of natRanks) {
      const needT = 3 - natByRank[t].length;
      if (needT < 0 || needT > w) continue;
      const remw = w - needT;
      const others = natRanks.filter((r) => r !== t);
      let ok = false;
      if (others.length === 0) ok = remw === 2;
      else if (others.length === 1) {
        const cp = natByRank[others[0]].length;
        ok = cp <= 2 && 2 - cp === remw;
      }
      if (ok) {
        const val = rankVal(t, level);
        bestT = bestT === null ? val : Math.max(bestT, val);
      }
    }
    if (bestT !== null) return { kind: "三带二", cat: 0, len: 5, value: bestT, cards };
  }

  // 顺子 / 连对 / 飞机
  if (n >= 5) {
    const top = seqTop(natByRank, w, 1, n);
    if (top !== null) return { kind: "顺子", cat: 0, len: n, value: top, cards };
  }
  if (n >= 6 && n % 2 === 0 && n / 2 >= 3) {
    const top = seqTop(natByRank, w, 2, n / 2);
    if (top !== null) return { kind: "连对", cat: 0, len: n / 2, value: top, cards };
  }
  if (n >= 6 && n % 3 === 0 && n / 3 >= 2) {
    const top = seqTop(natByRank, w, 3, n / 3);
    if (top !== null) return { kind: "飞机", cat: 0, len: n / 3, value: top, cards };
  }

  return null;
}

/** Does combo `a` beat combo `b`? (b === null means a is leading a new round.) */
export function canBeat(a: Combo, b: Combo | null): boolean {
  if (!b) return true;
  const aBomb = a.cat >= 4;
  const bBomb = b.cat >= 4;
  if (aBomb && !bBomb) return true;
  if (!aBomb && bBomb) return false;
  if (aBomb && bBomb) {
    if (a.cat !== b.cat) return a.cat > b.cat;
    if (a.kind === "同花顺") return a.len !== b.len ? a.len > b.len : a.value > b.value;
    return a.value > b.value;
  }
  // both normal — same kind & same total length, higher value wins
  if (a.kind !== b.kind) return false;
  if (a.cards.length !== b.cards.length) return false;
  return a.value > b.value;
}

// ── AI helpers ────────────────────────────────────────────────────────────
function groupByRank(hand: Card[]): Record<string, Card[]> {
  const g: Record<string, Card[]> = {};
  for (const c of hand) (g[c.rank] ||= []).push(c);
  return g;
}

/** All bombs (incl. 同花顺 and 天王炸) in a hand, weakest first. */
export function findBombs(hand: Card[], level: string): Card[][] {
  const bombs: Card[][] = [];
  const g = groupByRank(hand);
  for (const r of Object.keys(g)) {
    if (!isJoker(r) && g[r].length >= 4) bombs.push(g[r].slice());
  }
  // 同花顺
  const bySuit: Record<string, Card[]> = {};
  for (const c of hand) if (c.suit && c.rank !== "2") (bySuit[c.suit] ||= []).push(c);
  for (const s of Object.keys(bySuit)) {
    const arr = bySuit[s].slice().sort((a, b) => BASE[a.rank] - BASE[b.rank]);
    const uniq: Card[] = [];
    const seen = new Set<number>();
    for (const c of arr) if (!seen.has(BASE[c.rank])) { seen.add(BASE[c.rank]); uniq.push(c); }
    for (let len = 5; len <= uniq.length; len++)
      for (let i = 0; i + len <= uniq.length; i++) {
        const seg = uniq.slice(i, i + len);
        if (consecutive(seg.map((c) => BASE[c.rank]))) bombs.push(seg);
      }
  }
  // 天王炸
  const big = hand.filter((c) => c.rank === "大王");
  const small = hand.filter((c) => c.rank === "小王");
  if (big.length >= 2 && small.length >= 2) bombs.push([...big.slice(0, 2), ...small.slice(0, 2)]);

  return bombs
    .map((b) => ({ b, combo: analyze(b, level)! }))
    .filter((x) => x.combo)
    .sort((x, y) => x.combo.cat - y.combo.cat || x.combo.len - y.combo.len || x.combo.value - y.combo.value)
    .map((x) => x.b);
}

/** Smallest non-bomb play that beats `last`, or null. */
export function findNonBombBeat(hand: Card[], last: Combo, level: string): Card[] | null {
  const g = groupByRank(hand);
  const byValAsc = (rs: string[]) => rs.sort((a, b) => cardVal({ id: 0, suit: "", rank: a }, level) - cardVal({ id: 0, suit: "", rank: b }, level));

  const ofSize = (min: number) => byValAsc(Object.keys(g).filter((r) => g[r].length >= min && !isJoker(r) || (isJoker(r) && g[r].length >= min)));

  if (last.kind === "单牌") {
    const cand = hand
      .filter((c) => cardVal(c, level) > last.value)
      .sort((a, b) => cardVal(a, level) - cardVal(b, level));
    // prefer a rank we hold only 1 of (don't break sets), else smallest
    const solo = cand.find((c) => g[c.rank].length === 1);
    const pick = solo || cand[0];
    return pick ? [pick] : null;
  }
  if (last.kind === "对子") {
    for (const r of ofSize(2)) if (cardVal(g[r][0], level) > last.value) return g[r].slice(0, 2);
    return null;
  }
  if (last.kind === "三张") {
    for (const r of ofSize(3)) if (cardVal(g[r][0], level) > last.value) return g[r].slice(0, 3);
    return null;
  }
  if (last.kind === "三带二") {
    for (const tr of ofSize(3)) {
      if (cardVal(g[tr][0], level) <= last.value) continue;
      const pr = ofSize(2).find((r) => r !== tr && g[r].length >= 2);
      if (pr) return [...g[tr].slice(0, 3), ...g[pr].slice(0, 2)];
    }
    return null;
  }
  if (last.kind === "顺子" || last.kind === "连对" || last.kind === "飞机") {
    const need = last.kind === "顺子" ? 1 : last.kind === "连对" ? 2 : 3;
    const seqLen = last.cards.length / need; // number of consecutive ranks
    const ranksAvail = Object.keys(g)
      .filter((r) => !isJoker(r) && r !== "2" && g[r].length >= need)
      .map((r) => BASE[r])
      .sort((a, b) => a - b);
    const uniq = [...new Set(ranksAvail)];
    for (let i = 0; i + seqLen <= uniq.length; i++) {
      const window = uniq.slice(i, i + seqLen);
      if (!consecutive(window)) continue;
      if (Math.max(...window) <= last.value) continue;
      const rankByBase: Record<number, string> = {};
      for (const r of Object.keys(g)) if (!isJoker(r)) rankByBase[BASE[r]] = r;
      const cards: Card[] = [];
      for (const bv of window) cards.push(...g[rankByBase[bv]].slice(0, need));
      return cards;
    }
    return null;
  }
  return null;
}

export interface AIContext {
  hand: Card[];
  last: Combo | null;
  lastIsTeammate: boolean;
  level: string;
  lastPlayerCardsLeft: number;
}

/** Decide an AI play: return the cards to play, or null to pass. */
export function decideAIMove(ctx: AIContext): Card[] | null {
  const { hand, last, lastIsTeammate, level, lastPlayerCardsLeft } = ctx;

  // Leading — dump the smallest disposable single (don't break a bomb if avoidable).
  if (!last) {
    const g = groupByRank(hand);
    const sorted = [...hand].sort((a, b) => cardVal(a, level) - cardVal(b, level));
    const safe = sorted.find((c) => g[c.rank].length < 4);
    return [safe || sorted[0]];
  }

  // If a whole-hand play finishes and beats last, take it.
  const whole = analyze(hand, level);
  if (whole && canBeat(whole, last)) return hand.slice();

  // Don't overtake your partner.
  if (lastIsTeammate) return null;

  // Prefer a non-bomb beat.
  const beat = findNonBombBeat(hand, last, level);
  if (beat) return beat;

  // Consider a bomb — but avoid wasting one unless it's worth it.
  const bombs = findBombs(hand, level);
  for (const b of bombs) {
    const bc = analyze(b, level)!;
    if (canBeat(bc, last) && (lastPlayerCardsLeft <= 5 || hand.length <= 8 || last.cat >= 4)) return b;
  }
  return null;
}
