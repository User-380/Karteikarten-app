import { describe, expect, it } from 'vitest';
import {
  createScheduler,
  formatInterval,
  fromFsrs,
  newSchedule,
  preview,
  review,
  toFsrs,
} from '../scheduler';
import { CardState, Rating, type Schedule } from '../types';

// Ohne Zufallsstreuung, damit die Tests immer gleich ausgehen
const s = createScheduler({ fuzz: false });
const MIN = 60_000;
const DAY = 86_400_000;
const T0 = new Date(2026, 0, 10, 9, 0).getTime();

/** Karte mehrfach hintereinander bewerten; Zeit springt jeweils zum Fälligkeitstermin. */
function run(ratings: Rating[], start = newSchedule(T0), t = T0): { card: Schedule; now: number } {
  let card = start;
  let now = t;
  for (const r of ratings) {
    card = review(card, r, now, s);
    now = Math.max(now, card.due);
  }
  return { card, now };
}

describe('neue Karte', () => {
  it('startet im Zustand „Neu“ und ist sofort fällig', () => {
    const c = newSchedule(T0);
    expect(c.state).toBe(CardState.New);
    expect(c.due).toBe(T0);
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(0);
    expect(c.lastReview).toBeNull();
  });

  it('„Nochmal“ → Lernphase, in 1 Minute wieder dran', () => {
    const c = review(newSchedule(T0), Rating.Again, T0, s);
    expect(c.state).toBe(CardState.Learning);
    expect(c.due - T0).toBe(1 * MIN);
  });

  it('„Gut“ → Lernphase, in 10 Minuten wieder dran', () => {
    const c = review(newSchedule(T0), Rating.Good, T0, s);
    expect(c.state).toBe(CardState.Learning);
    expect(c.due - T0).toBe(10 * MIN);
    expect(c.reps).toBe(1);
    expect(c.lastReview).toBe(T0);
  });

  it('„Leicht“ → sofort in die Wiederholung, mindestens 1 Tag Abstand', () => {
    const c = review(newSchedule(T0), Rating.Easy, T0, s);
    expect(c.state).toBe(CardState.Review);
    expect(c.due - T0).toBeGreaterThanOrEqual(DAY);
    expect(c.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it('zweimal „Gut“ → Karte ist gelernt (Wiederholung, ≥ 1 Tag)', () => {
    const { card } = run([Rating.Good, Rating.Good]);
    expect(card.state).toBe(CardState.Review);
    expect(card.scheduledDays).toBeGreaterThanOrEqual(1);
  });
});

describe('gelernte Karte', () => {
  const learned = run([Rating.Good, Rating.Good]);

  it('Abstände sind geordnet: Nochmal < Schwer < Gut < Leicht', () => {
    const p = preview(learned.card, learned.now, s);
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard]);
    expect(p[Rating.Hard]).toBeLessThan(p[Rating.Good]);
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy]);
  });

  it('wiederholtes „Gut“ vergrößert den Abstand jedes Mal', () => {
    let card = learned.card;
    let now = learned.now;
    let last = card.scheduledDays;
    for (let i = 0; i < 5; i++) {
      card = review(card, Rating.Good, now, s);
      expect(card.scheduledDays).toBeGreaterThan(last);
      last = card.scheduledDays;
      now = card.due;
    }
    // nach 7× „Gut“ sollte der Abstand schon bei mehreren Monaten liegen
    expect(last).toBeGreaterThan(60);
  });

  it('„Nochmal“ → Neulernen, Fehlerzähler steigt, in 10 Minuten wieder dran', () => {
    const c = review(learned.card, Rating.Again, learned.now, s);
    expect(c.state).toBe(CardState.Relearning);
    expect(c.lapses).toBe(1);
    expect(c.due - learned.now).toBe(10 * MIN);
  });

  it('vergessene Karte bekommt danach einen kürzeren Abstand als vorher', () => {
    const { card: strong, now } = run([Rating.Good, Rating.Good, Rating.Good, Rating.Good]);
    const forgotten = review(strong, Rating.Again, now, s);
    const relearned = review(forgotten, Rating.Good, forgotten.due, s);
    expect(relearned.state).toBe(CardState.Review);
    expect(relearned.scheduledDays).toBeLessThan(strong.scheduledDays);
  });

  it('Schwierigkeit steigt bei „Nochmal“ und sinkt bei „Leicht“', () => {
    const harder = review(learned.card, Rating.Again, learned.now, s);
    const easier = review(learned.card, Rating.Easy, learned.now, s);
    expect(harder.difficulty).toBeGreaterThan(learned.card.difficulty);
    expect(easier.difficulty).toBeLessThan(learned.card.difficulty);
    for (const d of [harder.difficulty, easier.difficulty]) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it('wer zu spät wiederholt und es noch weiß, bekommt einen größeren Abstand', () => {
    const onTime = review(learned.card, Rating.Good, learned.card.due, s);
    const late = review(learned.card, Rating.Good, learned.card.due + 10 * DAY, s);
    expect(late.scheduledDays).toBeGreaterThan(onTime.scheduledDays);
  });
});

describe('Hilfsfunktionen', () => {
  it('Umwandlung in das ts-fsrs-Format und zurück verliert nichts', () => {
    const { card } = run([Rating.Good, Rating.Hard, Rating.Good]);
    expect(fromFsrs(toFsrs(card))).toEqual(card);
    const fresh = newSchedule(T0);
    expect(fromFsrs(toFsrs(fresh))).toEqual(fresh);
  });

  it('review verändert die Eingabe nicht', () => {
    const c = newSchedule(T0);
    const copy = { ...c };
    review(c, Rating.Good, T0, s);
    expect(c).toEqual(copy);
  });

  it('mit Zufallsstreuung bleiben die Abstände in einem sinnvollen Bereich', () => {
    const fuzzy = createScheduler({ fuzz: true });
    const { card, now } = run([Rating.Good, Rating.Good, Rating.Good, Rating.Good]);
    const exact = review(card, Rating.Good, now, s).scheduledDays;
    for (let i = 0; i < 20; i++) {
      const d = review(card, Rating.Good, now, fuzzy).scheduledDays;
      expect(d).toBeGreaterThanOrEqual(Math.floor(exact * 0.75));
      expect(d).toBeLessThanOrEqual(Math.ceil(exact * 1.25));
    }
  });

  it('formatInterval', () => {
    expect(formatInterval(30_000)).toBe('1 Min');
    expect(formatInterval(10 * MIN)).toBe('10 Min');
    expect(formatInterval(3 * 3_600_000)).toBe('3 Std');
    expect(formatInterval(4 * DAY)).toBe('4 T');
    expect(formatInterval(75 * DAY)).toBe('2,5 Mo');
    expect(formatInterval(2 * 365 * DAY)).toBe('2 J');
  });
});
