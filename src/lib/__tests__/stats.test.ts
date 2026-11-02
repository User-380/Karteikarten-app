import { describe, expect, it } from 'vitest';
import { cardsPerDay, lastDays, reviewsPerDay, streak } from '../stats';

describe('streak', () => {
  const T = '2026-03-10';
  it('zählt Tage in Folge bis heute', () => {
    const s = streak(new Set(['2026-03-08', '2026-03-09', '2026-03-10']), T);
    expect(s).toEqual({ current: 3, longest: 3, learnedToday: true });
  });
  it('heute noch nicht gelernt: Serie bis gestern bleibt bestehen', () => {
    const s = streak(new Set(['2026-03-08', '2026-03-09']), T);
    expect(s.current).toBe(2);
    expect(s.learnedToday).toBe(false);
  });
  it('gestern ausgelassen: Serie ist gerissen', () => {
    const s = streak(new Set(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-08']), T);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
  });
  it('über Monatsgrenzen', () => {
    expect(streak(new Set(['2026-02-27', '2026-02-28', '2026-03-01']), '2026-03-01').current).toBe(3);
  });
  it('leer', () => {
    expect(streak(new Set(), T)).toEqual({ current: 0, longest: 0, learnedToday: false });
  });
});

describe('Tageszählung', () => {
  const logs = [
    { day: 'a', cardId: '1' },
    { day: 'a', cardId: '1' },
    { day: 'a', cardId: '2' },
    { day: 'b', cardId: '3' },
  ];
  it('reviewsPerDay zählt Bewertungen', () => {
    expect(reviewsPerDay(logs).get('a')).toBe(3);
  });
  it('cardsPerDay zählt unterschiedliche Karten', () => {
    expect(cardsPerDay(logs).get('a')).toBe(2);
    expect(cardsPerDay(logs).get('b')).toBe(1);
  });
  it('lastDays', () => {
    expect(lastDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });
});
