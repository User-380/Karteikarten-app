/**
 * Backup als JSON-Datei: enthält alle Stapel, Karten, den Lernverlauf,
 * Einstellungen und Bilder (als Base64-Text).
 */
import type { KarteikartenDB } from './db';
import { newSchedule } from './scheduler';
import type { Card, Deck, ReviewLogEntry } from './types';

export const BACKUP_FORMAT = 'karteikarten-backup';
export const BACKUP_VERSION = 1;

export interface BackupMedia {
  id: string;
  mime: string;
  createdAt: number;
  data: string; // Base64
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  decks: Deck[];
  cards: Card[];
  reviews: ReviewLogEntry[];
  settings: { key: string; value: unknown }[];
  media: BackupMedia[];
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function createBackup(db: KarteikartenDB): Promise<Backup> {
  const [decks, cards, reviews, settings, media] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.settings.toArray(),
    db.media.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    decks,
    cards,
    reviews: reviews.map(({ id: _id, ...r }) => r),
    settings,
    media: await Promise.all(
      media.map(async (m) => ({ id: m.id, mime: m.mime, createdAt: m.createdAt, data: await blobToBase64(m.blob) })),
    ),
  };
}

export interface ImportResult {
  decks: number;
  cards: number;
  reviews: number;
  media: number;
}

/** Prüft grob, ob es sich um ein Backup dieser App handelt. */
export function parseBackup(json: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const b = data as Partial<Backup>;
  if (!b || b.format !== BACKUP_FORMAT || !Array.isArray(b.decks) || !Array.isArray(b.cards)) {
    throw new Error('Das ist kein Backup dieser Karteikarten-App.');
  }
  if ((b.version ?? 0) > BACKUP_VERSION) {
    throw new Error('Das Backup stammt aus einer neueren Version der App.');
  }
  return {
    format: BACKUP_FORMAT,
    version: b.version ?? 1,
    exportedAt: b.exportedAt ?? '',
    decks: b.decks,
    cards: b.cards,
    reviews: Array.isArray(b.reviews) ? b.reviews : [],
    settings: Array.isArray(b.settings) ? b.settings : [],
    media: Array.isArray(b.media) ? b.media : [],
  };
}

/**
 * Spielt ein Backup ein.
 * - replace = true: vorher ALLES löschen (exakte Wiederherstellung)
 * - replace = false: zusammenführen; gleiche Karten/Stapel werden überschrieben
 */
export async function restoreBackup(db: KarteikartenDB, backup: Backup, replace: boolean): Promise<ImportResult> {
  const now = Date.now();
  const cards: Card[] = backup.cards
    .filter((c) => c && typeof c.id === 'string' && typeof c.deckId === 'string')
    .map((c) => {
      // fehlende Felder (z. B. aus einer älteren Version) mit Standardwerten auffüllen
      const defaults: Omit<Card, 'id' | 'deckId'> = {
        ...newSchedule(now),
        createdAt: now,
        updatedAt: now,
        front: '',
        back: '',
      };
      return { ...defaults, ...c };
    });
  const decks = backup.decks.filter((d) => d && typeof d.id === 'string');
  const media = backup.media.map((m) => ({
    id: m.id,
    mime: m.mime,
    createdAt: m.createdAt ?? now,
    blob: base64ToBlob(m.data, m.mime),
  }));

  let reviewCount = 0;
  await db.transaction('rw', [db.decks, db.cards, db.reviews, db.media, db.settings], async () => {
    if (replace) {
      await Promise.all([db.decks.clear(), db.cards.clear(), db.reviews.clear(), db.media.clear(), db.settings.clear()]);
    }
    await db.decks.bulkPut(decks);
    await db.cards.bulkPut(cards);
    await db.media.bulkPut(media);
    if (backup.settings.length) await db.settings.bulkPut(backup.settings);

    // Lernverlauf: doppelte Einträge (gleiche Karte, gleiche Zeit) überspringen
    const existing = new Set((await db.reviews.toArray()).map((r) => `${r.cardId}@${r.reviewedAt}`));
    const fresh = backup.reviews
      .map(({ id: _id, ...r }) => r as ReviewLogEntry)
      .filter((r) => !existing.has(`${r.cardId}@${r.reviewedAt}`));
    await db.reviews.bulkAdd(fresh);
    reviewCount = fresh.length;
  });
  return { decks: decks.length, cards: cards.length, reviews: reviewCount, media: media.length };
}

/** Lädt eine Datei im Browser herunter. */
export function downloadFile(filename: string, content: Blob): void {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
