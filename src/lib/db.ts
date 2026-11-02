/**
 * Datenbank (IndexedDB über die Bibliothek Dexie).
 * Hier stehen alle Funktionen, die Daten lesen oder schreiben.
 */
import Dexie, { type Table } from 'dexie';
import { dayKey } from './dates';
import { newId } from './id';
import { newSchedule, review, scheduleOf } from './scheduler';
import {
  CardState,
  DEFAULT_SETTINGS,
  type Card,
  type Deck,
  type MediaItem,
  type Rating,
  type ReviewLogEntry,
  type Settings,
} from './types';

interface SettingRow {
  key: string;
  value: unknown;
}

export class KarteikartenDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  reviews!: Table<ReviewLogEntry, number>;
  media!: Table<MediaItem, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = 'karteikarten') {
    super(name);
    this.version(1).stores({
      decks: 'id, name',
      cards: 'id, deckId, due, state',
      reviews: '++id, cardId, deckId, day, reviewedAt',
      media: 'id',
      settings: 'key',
    });
  }
}

export const db = new KarteikartenDB();

// ---------- Stapel ----------

export async function createDeck(name: string): Promise<Deck> {
  const deck: Deck = { id: newId(), name: name.trim() || 'Neuer Stapel', createdAt: Date.now() };
  await db.decks.add(deck);
  return deck;
}

export async function renameDeck(id: string, name: string): Promise<void> {
  await db.decks.update(id, { name: name.trim() || 'Ohne Namen' });
}

/** Löscht den Stapel mit allen Karten und deren Lernverlauf. */
export async function deleteDeck(id: string): Promise<void> {
  await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    await db.cards.where('deckId').equals(id).delete();
    await db.reviews.where('deckId').equals(id).delete();
    await db.decks.delete(id);
  });
  await cleanupMedia();
}

// ---------- Karten ----------

export async function addCard(deckId: string, front: string, back: string): Promise<Card> {
  const now = Date.now();
  const card: Card = {
    id: newId(),
    deckId,
    front,
    back,
    createdAt: now,
    updatedAt: now,
    ...newSchedule(now),
  };
  await db.cards.add(card);
  return card;
}

export async function updateCard(
  id: string,
  changes: Partial<Pick<Card, 'front' | 'back' | 'deckId'>>,
): Promise<void> {
  await db.cards.update(id, { ...changes, updatedAt: Date.now() });
  await cleanupMedia();
}

export async function deleteCard(id: string): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.reviews.where('cardId').equals(id).delete();
    await db.cards.delete(id);
  });
  await cleanupMedia();
}

/** Setzt den Lernfortschritt einer Karte zurück (wieder „neu“). */
export async function resetCard(id: string): Promise<void> {
  await db.cards.update(id, { ...newSchedule(Date.now()) });
}

/**
 * Bewertet eine Karte, speichert den neuen Termin und schreibt das Protokoll.
 * Gibt die aktualisierte Karte zurück.
 */
export async function answerCard(card: Card, rating: Rating, now = Date.now()): Promise<Card> {
  const next: Card = { ...card, ...review(scheduleOf(card), rating, now) };
  const log: ReviewLogEntry = {
    cardId: card.id,
    deckId: card.deckId,
    rating,
    stateBefore: card.state,
    reviewedAt: now,
    day: dayKey(now),
    scheduledDays: next.scheduledDays,
  };
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(next);
    await db.reviews.add(log);
  });
  return next;
}

/** Wie viele neue Karten wurden heute je Stapel schon gelernt? */
export async function newDoneToday(now = Date.now()): Promise<Record<string, number>> {
  const logs = await db.reviews.where('day').equals(dayKey(now)).toArray();
  const out: Record<string, number> = {};
  for (const l of logs) {
    if (l.stateBefore === CardState.New) out[l.deckId] = (out[l.deckId] ?? 0) + 1;
  }
  return out;
}

// ---------- Bilder ----------

export const MEDIA_PREFIX = 'media:';

export async function addMedia(blob: Blob): Promise<string> {
  const id = newId();
  await db.media.add({ id, blob, mime: blob.type || 'image/png', createdAt: Date.now() });
  return id;
}

/** Alle Bild-IDs, die in einem Text vorkommen (Format: ![](media:ID)). */
export function mediaIdsIn(text: string): string[] {
  const ids: string[] = [];
  const re = /!\[[^\]]*\]\(media:([A-Za-z0-9-]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) ids.push(m[1]);
  return ids;
}

/**
 * Löscht Bilder, die in keiner Karte mehr vorkommen.
 * Bilder, die jünger als eine Stunde sind, bleiben (evtl. gerade im Editor).
 */
export async function cleanupMedia(now = Date.now()): Promise<number> {
  const used = new Set<string>();
  await db.cards.each((c) => {
    for (const id of mediaIdsIn(c.front)) used.add(id);
    for (const id of mediaIdsIn(c.back)) used.add(id);
  });
  const all = await db.media.toArray();
  const orphan = all.filter((m) => !used.has(m.id) && now - m.createdAt > 3_600_000).map((m) => m.id);
  await db.media.bulkDelete(orphan);
  return orphan.length;
}

// ---------- Einstellungen ----------

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key in s) (s as unknown as Record<string, unknown>)[r.key] = r.value;
  }
  return s;
}

export async function saveSettings(s: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(s).map(([key, value]) => ({ key, value })));
}
