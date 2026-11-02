/**
 * Wiederholungs-Algorithmus (FSRS) – dünne Hülle um die Bibliothek ts-fsrs.
 *
 * Idee von FSRS: Für jede Karte wird geschätzt, wie schnell du sie vergisst
 * („Stabilität“). Die nächste Wiederholung wird so gelegt, dass du dich mit
 * ca. 90 % Wahrscheinlichkeit noch erinnerst. Je öfter du richtig antwortest,
 * desto größer werden die Abstände.
 *
 * Alle Funktionen hier sind „rein“ (keine Datenbank), damit man sie gut testen kann.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
} from 'ts-fsrs';
import type { Card, Rating, Schedule, CardState } from './types';

export interface SchedulerOptions {
  /** Ziel-Erinnerungsquote (0.9 = 90 %) */
  retention?: number;
  /** Zufällige kleine Streuung der Abstände, damit nicht alle Karten am selben Tag fällig werden */
  fuzz?: boolean;
}

export function createScheduler(opts: SchedulerOptions = {}): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: opts.retention ?? 0.9,
      maximum_interval: 36500,
      enable_fuzz: opts.fuzz ?? true,
      enable_short_term: true,
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m'],
    }),
  );
}

const defaultScheduler = createScheduler();

/** Startwerte für eine neue Karte (sofort „neu“ und lernbar). */
export function newSchedule(now: number = Date.now()): Schedule {
  return fromFsrs(createEmptyCard(new Date(now)));
}

export function toFsrs(s: Schedule): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview == null ? undefined : new Date(s.lastReview),
  };
}

export function fromFsrs(c: FsrsCard): Schedule {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as number as CardState,
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

/** Nur die Lern-Felder einer Karte herausziehen. */
export function scheduleOf(card: Card): Schedule {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.lastReview,
  };
}

/**
 * Karte bewerten: liefert die neuen Lern-Werte (nächster Termin usw.).
 */
export function review(
  schedule: Schedule,
  rating: Rating,
  now: number = Date.now(),
  scheduler: FSRS = defaultScheduler,
): Schedule {
  const result = scheduler.next(toFsrs(schedule), new Date(now), rating as number as Grade);
  return fromFsrs(result.card);
}

/**
 * Vorschau: Wann wäre die Karte bei jeder der vier Bewertungen wieder dran?
 * Wird auf den Buttons angezeigt („10 Min“, „3 T“ …).
 */
export function preview(
  schedule: Schedule,
  now: number = Date.now(),
  scheduler: FSRS = defaultScheduler,
): Record<Rating, number> {
  const out = {} as Record<Rating, number>;
  for (const r of [1, 2, 3, 4] as Rating[]) {
    out[r] = review(schedule, r, now, scheduler).due;
  }
  return out;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Zeitspanne kurz und lesbar: „1 Min“, „10 Min“, „3 Std“, „4 T“, „2,5 Mo“, „1,2 J“. */
export function formatInterval(ms: number): string {
  const fmt = (n: number) =>
    (Math.round(n * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} Min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} Std`;
  if (ms < 30 * DAY) return `${Math.round(ms / DAY)} T`;
  if (ms < 365 * DAY) return `${fmt(ms / (30 * DAY))} Mo`;
  return `${fmt(ms / (365 * DAY))} J`;
}
