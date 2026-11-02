import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, getSettings } from './db';
import { dayKey } from './dates';
import { countDue, type DueCounts } from './queue';
import { CardState, DEFAULT_SETTINGS, type Deck, type Settings } from './types';

/** Aktuelle Zeit, die sich jede halbe Minute erneuert. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}

export interface DeckOverview {
  deck: Deck;
  cardCount: number;
  due: DueCounts;
}

/** Alle Stapel mit Anzahl fälliger Karten. `undefined` solange geladen wird. */
export function useOverview(): DeckOverview[] | undefined {
  const now = useNow();
  const today = dayKey(now);
  return useLiveQuery(async () => {
    const [decks, cards, settings, todayLogs] = await Promise.all([
      db.decks.toArray(),
      db.cards.toArray(),
      getSettings(),
      db.reviews.where('day').equals(today).toArray(),
    ]);
    const newDone: Record<string, number> = {};
    for (const l of todayLogs) {
      if (l.stateBefore === CardState.New) newDone[l.deckId] = (newDone[l.deckId] ?? 0) + 1;
    }
    decks.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
    return decks.map((deck) => {
      const own = cards.filter((c) => c.deckId === deck.id);
      return {
        deck,
        cardCount: own.length,
        due: countDue(own, now, settings.newPerDay, newDone[deck.id] ?? 0),
      };
    });
  }, [now, today]);
}
