/** Statistik-Berechnungen (rein, ohne Datenbank). */
import { addDays } from './dates';
import type { ReviewLogEntry } from './types';

/** Anzahl Bewertungen je Tag, z. B. { '2026-03-05': 42 } */
export function reviewsPerDay(logs: Pick<ReviewLogEntry, 'day'>[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of logs) m.set(l.day, (m.get(l.day) ?? 0) + 1);
  return m;
}

/** Wie viele unterschiedliche Karten wurden je Tag gelernt? */
export function cardsPerDay(logs: Pick<ReviewLogEntry, 'day' | 'cardId'>[]): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  for (const l of logs) {
    const s = sets.get(l.day) ?? new Set<string>();
    s.add(l.cardId);
    sets.set(l.day, s);
  }
  return new Map([...sets].map(([d, s]) => [d, s.size]));
}

/**
 * Lernserie: Wie viele Tage in Folge wurde gelernt?
 * Hast du heute noch nicht gelernt, zählt die Serie bis gestern weiter
 * (sie reißt erst, wenn der heutige Tag ohne Lernen vorbei ist).
 */
export function streak(days: Set<string>, today: string): { current: number; longest: number; learnedToday: boolean } {
  const learnedToday = days.has(today);
  let current = 0;
  let d = learnedToday ? today : addDays(today, -1);
  while (days.has(d)) {
    current++;
    d = addDays(d, -1);
  }
  let longest = 0;
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue; // nur am Anfang einer Serie zählen
    let len = 0;
    let x = day;
    while (days.has(x)) {
      len++;
      x = addDays(x, 1);
    }
    longest = Math.max(longest, len);
  }
  return { current, longest, learnedToday };
}

/** Die letzten `n` Tage (ältester zuerst) als Tag-Schlüssel. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}
