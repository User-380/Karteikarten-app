import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { base64ToBlob, blobToBase64, createBackup, parseBackup, restoreBackup } from '../backup';
import { KarteikartenDB } from '../db';
import { newSchedule } from '../scheduler';
import { Rating, type Card } from '../types';

function sampleCard(id: string, deckId: string): Card {
  return { id, deckId, front: `Q ${id}`, back: `A ${id}`, createdAt: 1, updatedAt: 1, ...newSchedule(1) };
}

async function filledDb(name: string) {
  const db = new KarteikartenDB(name);
  await db.decks.add({ id: 'd1', name: 'Statik', createdAt: 1 });
  await db.cards.bulkAdd([sampleCard('c1', 'd1'), sampleCard('c2', 'd1')]);
  await db.reviews.add({ cardId: 'c1', deckId: 'd1', rating: Rating.Good, stateBefore: 0, reviewedAt: 5, day: '2026-01-01', scheduledDays: 0 });
  await db.settings.put({ key: 'newPerDay', value: 7 });
  return db;
}

describe('Backup', () => {
  it('Base64 hin und zurück', async () => {
    const blob = new Blob([new Uint8Array([0, 1, 2, 250, 255])], { type: 'image/png' });
    const back = base64ToBlob(await blobToBase64(blob), 'image/png');
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(new Uint8Array([0, 1, 2, 250, 255]));
  });

  it('Export → Import in leere Datenbank ergibt dieselben Daten', async () => {
    const src = await filledDb('src1');
    const json = JSON.stringify(await createBackup(src));
    const dst = new KarteikartenDB('dst1');
    const res = await restoreBackup(dst, parseBackup(json), true);
    expect(res).toMatchObject({ decks: 1, cards: 2, reviews: 1 });
    expect(await dst.cards.toArray()).toEqual(await src.cards.toArray());
    expect((await dst.settings.get('newPerDay'))?.value).toBe(7);
  });

  it('zweimaliges Zusammenführen verdoppelt nichts', async () => {
    const src = await filledDb('src2');
    const backup = parseBackup(JSON.stringify(await createBackup(src)));
    const dst = new KarteikartenDB('dst2');
    await restoreBackup(dst, backup, false);
    await restoreBackup(dst, backup, false);
    expect(await dst.cards.count()).toBe(2);
    expect(await dst.reviews.count()).toBe(1);
  });

  it('„Ersetzen“ löscht vorhandene Daten', async () => {
    const src = await filledDb('src3');
    const backup = parseBackup(JSON.stringify(await createBackup(src)));
    const dst = new KarteikartenDB('dst3');
    await dst.decks.add({ id: 'other', name: 'Alt', createdAt: 1 });
    await restoreBackup(dst, backup, true);
    expect((await dst.decks.toArray()).map((d) => d.id)).toEqual(['d1']);
  });

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseBackup('kein json')).toThrow(/JSON/);
    expect(() => parseBackup('{"foo":1}')).toThrow(/kein Backup/);
  });
});
