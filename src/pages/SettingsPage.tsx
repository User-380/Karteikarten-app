import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { createBackup, downloadFile, parseBackup, restoreBackup } from '../lib/backup';
import { getLastBackup, setLastBackup } from '../lib/backupReminder';
import { csvToCards } from '../lib/csv';
import { addCard, createDeck, db, saveSettings } from '../lib/db';
import { dayKey } from '../lib/dates';
import { useSettings } from '../lib/hooks';
import { hashParam } from '../lib/router';
import { loadTheme, saveTheme, type Theme } from '../lib/theme';

export function SettingsPage() {
  const settings = useSettings();
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), []);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [lastBackup, setLast] = useState(getLastBackup);
  const [csvDeck, setCsvDeck] = useState<string>(hashParam('import') ?? '');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hashParam('import')) document.getElementById('csv')?.scrollIntoView();
  }, []);

  async function run(task: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ text: await task() });
    } catch (err) {
      setMsg({ text: (err as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  const exportJson = () =>
    run(async () => {
      const backup = await createBackup(db);
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      downloadFile(`karteikarten-backup-${dayKey()}.json`, blob);
      setLastBackup();
      setLast(Date.now());
      return `Backup mit ${backup.cards.length} Karten erstellt. Speichere die Datei an einem sicheren Ort (z. B. Cloud-Speicher).`;
    });

  const importJson = (file: File) =>
    run(async () => {
      const backup = parseBackup(await file.text());
      const warn = replace
        ? 'ACHTUNG: Alle aktuellen Daten werden gelöscht und durch das Backup ersetzt. Fortfahren?'
        : `Backup vom ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleString('de-DE') : '?'} mit ${backup.cards.length} Karten einspielen?`;
      if (!confirm(warn)) return 'Abgebrochen.';
      const r = await restoreBackup(db, backup, replace);
      return `Wiederhergestellt: ${r.decks} Stapel, ${r.cards} Karten, ${r.reviews} Lerneinträge, ${r.media} Bilder.`;
    });

  const importCsv = (file: File) =>
    run(async () => {
      const cards = csvToCards(await file.text()).filter((c) => c.front || c.back);
      if (!cards.length) throw new Error('In der Datei wurden keine Karten gefunden.');
      let deckId = csvDeck;
      if (!deckId) {
        const name = file.name.replace(/\.(csv|txt)$/i, '');
        deckId = (await createDeck(name)).id;
      }
      for (const c of cards) await addCard(deckId, c.front, c.back);
      const deckName = (await db.decks.get(deckId))?.name;
      return `${cards.length} Karten in „${deckName}“ importiert.`;
    });

  return (
    <>
      <h1>Einstellungen</h1>

      {msg && <div className={`card-box notice ${msg.error ? 'notice-error' : ''}`}>{msg.text}</div>}

      <h2>Darstellung</h2>
      <div className="card-box">
        <div className="segmented" role="radiogroup" aria-label="Farbschema">
          {(
            [
              ['system', 'Automatisch'],
              ['light', 'Hell'],
              ['dark', 'Dunkel'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={theme === value}
              className={theme === value ? 'active' : ''}
              onClick={() => {
                setTheme(value);
                saveTheme(value);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <h2>Lernen</h2>
      <div className="card-box stack">
        <label htmlFor="newPerDay">Neue Karten pro Tag und Stapel</label>
        <input
          id="newPerDay"
          type="number"
          min={0}
          max={999}
          inputMode="numeric"
          value={settings.newPerDay}
          onChange={(e) => {
            const n = Math.max(0, Math.min(999, Math.round(Number(e.target.value) || 0)));
            void saveSettings({ newPerDay: n });
          }}
        />
        <p className="muted small" style={{ margin: 0 }}>
          Fällige Wiederholungen werden immer alle gezeigt. Dieses Limit gilt nur für Karten, die du noch nie gelernt
          hast. Für ca. 10 Minuten am Tag sind 5–10 ein guter Wert.
        </p>
      </div>

      <h2>Backup</h2>
      <div className="card-box stack">
        <p className="muted small" style={{ margin: 0 }}>
          Deine Karten sind nur in diesem Browser gespeichert. Mach regelmäßig ein Backup!
          <br />
          Letztes Backup: {lastBackup ? new Date(lastBackup).toLocaleString('de-DE') : 'noch nie'}
        </p>
        <button className="btn-primary" onClick={exportJson} disabled={busy}>
          ⬇ Backup herunterladen (JSON)
        </button>
        <label className="btn" style={{ fontWeight: 400 }}>
          ⬆ Backup einspielen …
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void importJson(f);
            }}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          Beim Einspielen vorhandene Daten vorher löschen
        </label>
      </div>

      <h2 id="csv">CSV-Import</h2>
      <div className="card-box stack">
        <p className="muted small" style={{ margin: 0 }}>
          Eine Karte pro Zeile: <code>Vorderseite;Rückseite</code>. Text mit <code>;</code> oder Zeilenumbrüchen in{' '}
          <code>"Anführungszeichen"</code> setzen. LaTeX funktioniert auch, z. B. <code>$F=m\cdot a$;Newton</code>.
        </p>
        <label htmlFor="csvDeck">Ziel-Stapel</label>
        <select id="csvDeck" value={csvDeck} onChange={(e) => setCsvDeck(e.target.value)}>
          <option value="">Neuer Stapel (Name = Dateiname)</option>
          {decks?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="btn" style={{ fontWeight: 400 }}>
          CSV-Datei wählen …
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void importCsv(f);
            }}
          />
        </label>
      </div>

      <p className="muted small" style={{ marginTop: 24 }}>
        Karteikarten · Wiederholungsplanung mit FSRS · alle Daten bleiben auf deinem Gerät.
      </p>
    </>
  );
}
