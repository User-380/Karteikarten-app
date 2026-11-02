import { describe, expect, it } from 'vitest';
import { buildSession, countDue, pickNext, staysInSession } from '../queue';
import { newSchedule } from '../scheduler';
import { CardState, type Card } from '../types';

const MIN = 60_000;
const DAY = 86_400_000;
const NOW = new Date(2026, 0, 10, 9, 0).getTime();

let n = 0;
function card(p: Partial<Card> = {}): Card {
  n++;
  return {
    id: `c${n}`,
    deckId: 'd1',
    front: 'F',
    back: 'B',
    createdAt: NOW - 1000 + n,
    updatedAt: NOW,
    ...newSchedule(NOW),
    ...p,
  };
}

describe('countDue', () => {
  it('zählt Wiederholungen bis Tagesende, aber nicht ab morgen', () => {
    const cards = [
      card({ state: CardState.Review, due: NOW - DAY }), // überfällig
      card({ state: CardState.Review, due: NOW + 5 * 3_600_000 }), // heute Abend
      card({ state: CardState.Review, due: NOW + DAY }), // morgen
      card({ state: CardState.Learning, due: NOW + 10 * MIN }),
    ];
    expect(countDue(cards, NOW, 10, 0)).toEqual({ new: 0, learning: 1, review: 2, total: 3 });
  });

  it('begrenzt neue Karten auf das Tageslimit', () => {
    const cards = Array.from({ length: 15 }, () => card());
    expect(countDue(cards, NOW, 10, 0).new).toBe(10);
    expect(countDue(cards, NOW, 10, 7).new).toBe(3);
    expect(countDue(cards, NOW, 10, 12).new).toBe(0);
  });
});

describe('buildSession / pickNext', () => {
  it('nimmt fällige Karten und neue bis zum Limit pro Stapel', () => {
    const cards = [
      card({ state: CardState.Review, due: NOW - DAY }),
      card({ state: CardState.Review, due: NOW + 3 * DAY }),
      ...Array.from({ length: 5 }, () => card({ deckId: 'd1' })),
      ...Array.from({ length: 5 }, () => card({ deckId: 'd2' })),
    ];
    const session = buildSession(cards, NOW, 3, { d2: 1 });
    expect(session.filter((c) => c.state === CardState.Review)).toHaveLength(1);
    expect(session.filter((c) => c.deckId === 'd1' && c.state === CardState.New)).toHaveLength(3);
    expect(session.filter((c) => c.deckId === 'd2')).toHaveLength(2);
  });

  it('Reihenfolge: fällige Lernkarten, dann Wiederholungen, dann neue', () => {
    const fresh = card();
    const rev = card({ state: CardState.Review, due: NOW - DAY });
    const learn = card({ state: CardState.Learning, due: NOW - MIN });
    let session = [fresh, rev, learn];
    expect(pickNext(session, NOW)?.id).toBe(learn.id);
    session = [fresh, rev];
    expect(pickNext(session, NOW)?.id).toBe(rev.id);
    session = [fresh];
    expect(pickNext(session, NOW)?.id).toBe(fresh.id);
  });

  it('greift bis zu 20 Minuten vor, wenn sonst nichts da ist', () => {
    const soon = card({ state: CardState.Learning, due: NOW + 10 * MIN });
    const later = card({ state: CardState.Learning, due: NOW + 30 * MIN });
    expect(pickNext([later, soon], NOW)?.id).toBe(soon.id);
    expect(pickNext([later], NOW)).toBeNull();
    expect(pickNext([], NOW)).toBeNull();
  });

  it('Karten in der Lernphase bleiben heute in der Sitzung, gelernte nicht', () => {
    expect(staysInSession(card({ state: CardState.Learning, due: NOW + 10 * MIN }), NOW)).toBe(true);
    expect(staysInSession(card({ state: CardState.Review, due: NOW + DAY }), NOW)).toBe(false);
  });
});
