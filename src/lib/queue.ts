/**
 * Welche Karten sind heute dran, und in welcher Reihenfolge?
 *
 * - Wiederholungen (Zustand „Review“) sind dran, wenn ihr Termin heute oder früher ist.
 * - Karten in der Lernphase (Minuten-Schritte) sind dran, sobald ihre Zeit erreicht ist.
 * - Neue Karten: höchstens `newPerDay` pro Stapel und Tag.
 */
import { endOfDay } from './dates';
import { CardState, type Card } from './types';

/** Wie weit vorgegriffen werden darf, wenn sonst nichts mehr da ist (wie bei Anki). */
export const LEARN_AHEAD_MS = 20 * 60_000;

export interface DueCounts {
  new: number;
  learning: number;
  review: number;
  total: number;
}

export function isLearning(c: Pick<Card, 'state'>): boolean {
  return c.state === CardState.Learning || c.state === CardState.Relearning;
}

/** Ist eine bereits gelernte Karte heute fällig? (Neue Karten zählen hier nicht.) */
export function isDueToday(c: Pick<Card, 'state' | 'due'>, now: number): boolean {
  return c.state !== CardState.New && c.due <= endOfDay(now);
}

/**
 * Zählt die fälligen Karten eines Stapels.
 * @param newDoneToday wie viele neue Karten in diesem Stapel heute schon gelernt wurden
 */
export function countDue(
  cards: Card[],
  now: number,
  newPerDay: number,
  newDoneToday: number,
): DueCounts {
  let learning = 0;
  let reviewCount = 0;
  let newAvail = 0;
  for (const c of cards) {
    if (c.state === CardState.New) newAvail++;
    else if (isDueToday(c, now)) {
      if (isLearning(c)) learning++;
      else reviewCount++;
    }
  }
  const newCount = Math.max(0, Math.min(newAvail, newPerDay - newDoneToday));
  return { new: newCount, learning, review: reviewCount, total: newCount + learning + reviewCount };
}

/**
 * Stellt die Karten für eine Lernsitzung zusammen (fällige + erlaubte neue).
 * `newDoneToday` ist pro Stapel-ID.
 */
export function buildSession(
  cards: Card[],
  now: number,
  newPerDay: number,
  newDoneToday: Record<string, number>,
): Card[] {
  const due = cards.filter((c) => isDueToday(c, now)).sort((a, b) => a.due - b.due);
  const newByDeck = new Map<string, Card[]>();
  for (const c of cards) {
    if (c.state !== CardState.New) continue;
    const list = newByDeck.get(c.deckId) ?? [];
    list.push(c);
    newByDeck.set(c.deckId, list);
  }
  const fresh: Card[] = [];
  for (const [deckId, list] of newByDeck) {
    list.sort((a, b) => a.createdAt - b.createdAt);
    const allowed = Math.max(0, newPerDay - (newDoneToday[deckId] ?? 0));
    fresh.push(...list.slice(0, allowed));
  }
  fresh.sort((a, b) => a.createdAt - b.createdAt);
  return [...due, ...fresh];
}

/**
 * Wählt aus der Sitzung die nächste Karte:
 * 1. Lernphasen-Karten, deren Zeit erreicht ist
 * 2. fällige Wiederholungen
 * 3. neue Karten
 * 4. Lernphasen-Karten, die in ≤ 20 Minuten dran wären (vorgreifen)
 * Gibt `null` zurück, wenn nichts mehr zu tun ist.
 */
export function pickNext(session: Card[], now: number): Card | null {
  let best: Card | null = null;
  let bestRank = Infinity;
  for (const c of session) {
    let rank: number;
    if (isLearning(c) && c.due <= now) rank = 0;
    else if (c.state === CardState.Review && c.due <= endOfDay(now)) rank = 1;
    else if (c.state === CardState.New) rank = 2;
    else if (isLearning(c) && c.due <= now + LEARN_AHEAD_MS) rank = 3;
    else continue;
    if (rank < bestRank || (rank === bestRank && best && sortKey(c) < sortKey(best))) {
      best = c;
      bestRank = rank;
    }
  }
  return best;
}

function sortKey(c: Card): number {
  return c.state === CardState.New ? c.createdAt : c.due;
}

/**
 * Nach einer Bewertung: Bleibt die Karte in der heutigen Sitzung?
 * Ja, wenn sie noch in der Lernphase ist und heute wieder dran ist.
 */
export function staysInSession(c: Card, now: number): boolean {
  return isLearning(c) && c.due <= endOfDay(now);
}
