/**
 * Datenmodell der App. Alles wird lokal in IndexedDB gespeichert.
 * Zeitpunkte sind Millisekunden seit 1970 (Date.now()), weil sich
 * Zahlen in IndexedDB gut sortieren und durchsuchen lassen.
 */

/** Ein Stapel, z. B. „Statik“ oder „Mathe 2“. */
export interface Deck {
  id: string;
  name: string;
  createdAt: number;
}

/** Lernzustand einer Karte (gleiche Werte wie in FSRS). */
export const CardState = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const;
export type CardState = (typeof CardState)[keyof typeof CardState];

/** Bewertung nach dem Aufdecken: Nochmal / Schwer / Gut / Leicht. */
export const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const;
export type Rating = (typeof Rating)[keyof typeof Rating];

/** Die Werte, die der FSRS-Algorithmus pro Karte braucht. */
export interface Schedule {
  /** Wann ist die Karte wieder dran? */
  due: number;
  /** Stabilität: nach wie vielen Tagen erinnere ich mich nur noch zu 90 %? */
  stability: number;
  /** Schwierigkeit 1 (leicht) bis 10 (schwer) */
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  /** Wie oft wurde die Karte schon wiederholt? */
  reps: number;
  /** Wie oft wurde sie vergessen („Nochmal“ nach erfolgreichem Lernen)? */
  lapses: number;
  state: CardState;
  lastReview: number | null;
}

/** Eine Karteikarte. Vorder-/Rückseite sind Text mit LaTeX ($…$) und Bildern. */
export interface Card extends Schedule {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: number;
  updatedAt: number;
}

/** Ein Eintrag im Lern-Protokoll (für Statistik und Tageslimits). */
export interface ReviewLogEntry {
  id?: number;
  cardId: string;
  deckId: string;
  rating: Rating;
  /** Zustand der Karte VOR der Bewertung */
  stateBefore: CardState;
  reviewedAt: number;
  /** Lokaler Kalendertag „JJJJ-MM-TT“ */
  day: string;
  /** Neuer Abstand in Tagen nach der Bewertung */
  scheduledDays: number;
}

/** Ein Bild, das in Karten eingebettet ist. */
export interface MediaItem {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: number;
}

export interface Settings {
  /** Wie viele neue Karten pro Stapel und Tag eingeführt werden. */
  newPerDay: number;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
};
