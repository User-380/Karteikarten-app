import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { FieldEditor } from '../components/FieldEditor';
import { addCard, db, deleteCard, resetCard, updateCard } from '../lib/db';
import { hashParam, navigate } from '../lib/router';
import { CardState } from '../lib/types';

/** Karte neu anlegen (cardId = "new") oder bearbeiten. */
export function CardEditorPage({ cardId }: { cardId: string }) {
  const isNew = cardId === 'new';
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), []);
  const card = useLiveQuery(async () => (isNew ? null : ((await db.cards.get(cardId)) ?? null)), [cardId]);

  const [deckId, setDeckId] = useState<string>(hashParam('deck') ?? '');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const [savedMsg, setSavedMsg] = useState('');
  const [formKey, setFormKey] = useState(0);

  // Vorhandene Karte einmalig in das Formular laden
  useEffect(() => {
    if (!isNew && card && !loaded) {
      setDeckId(card.deckId);
      setFront(card.front);
      setBack(card.back);
      setLoaded(true);
    }
  }, [card, isNew, loaded]);

  // Wenn kein Stapel vorgegeben ist: den ersten nehmen
  useEffect(() => {
    if (!deckId && decks && decks.length) setDeckId(decks[0].id);
  }, [decks, deckId]);

  if (!decks || (!isNew && card === undefined)) return <p className="muted">Lade …</p>;
  if (!isNew && card === null) return <p>Karte nicht gefunden.</p>;
  if (decks.length === 0) {
    return (
      <p>
        Lege zuerst auf der <a href="#/">Startseite</a> einen Stapel an.
      </p>
    );
  }

  const canSave = deckId && (front.trim() || back.trim());

  async function save(andNext: boolean) {
    if (!canSave) return;
    if (isNew) {
      await addCard(deckId, front, back);
    } else {
      await updateCard(cardId, { front, back, deckId });
    }
    if (andNext) {
      setFront('');
      setBack('');
      setFormKey((k) => k + 1);
      setSavedMsg('Gespeichert ✓');
      setTimeout(() => setSavedMsg(''), 1500);
    } else if (!isNew && history.length > 1) {
      history.back(); // zurück dorthin, wo man herkam (z. B. Lernmodus)
    } else {
      navigate(`/deck/${deckId}`);
    }
  }

  async function onDelete() {
    if (!confirm('Diese Karte wirklich löschen?')) return;
    await deleteCard(cardId);
    navigate(`/deck/${deckId}`);
  }

  async function onReset() {
    if (!confirm('Lernfortschritt dieser Karte zurücksetzen? Sie gilt dann wieder als neu.')) return;
    await resetCard(cardId);
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void save(isNew);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void save(isNew);
        }
      }}
    >
      <h1>{isNew ? 'Neue Karte' : 'Karte bearbeiten'}</h1>

      <div>
        <label htmlFor="deck">Stapel</label>
        <select id="deck" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <FieldEditor key={`f${formKey}`} id="front" label="Vorderseite (Frage)" value={front} onChange={setFront} autoFocus={isNew} />
      <FieldEditor key={`b${formKey}`} id="back" label="Rückseite (Antwort)" value={back} onChange={setBack} />

      <p className="muted small">
        Formeln: <code>$a^2+b^2=c^2$</code> im Text oder <code>$$ … $$</code> als eigene Zeile. Bilder auch per Einfügen
        (Strg+V). Speichern mit Strg+Enter.
      </p>

      <div className="row sticky-actions">
        {isNew ? (
          <>
            <button type="submit" className="btn-primary" disabled={!canSave}>
              Speichern &amp; nächste
            </button>
            <button type="button" onClick={() => void save(false)} disabled={!canSave}>
              Speichern &amp; fertig
            </button>
          </>
        ) : (
          <button type="button" className="btn-primary" onClick={() => void save(false)} disabled={!canSave}>
            Speichern
          </button>
        )}
        <button type="button" onClick={() => history.back()}>
          Abbrechen
        </button>
        <span className="muted small">{savedMsg}</span>
      </div>

      {!isNew && card && (
        <div className="row">
          <span className="muted small">
            {card.state === CardState.New
              ? 'Noch nicht gelernt'
              : `${card.reps}× wiederholt · ${card.lapses}× vergessen · nächster Termin ${new Date(card.due).toLocaleDateString('de-DE')}`}
          </span>
          <span className="spacer" />
          {card.state !== CardState.New && (
            <button type="button" className="btn-small" onClick={onReset}>
              Zurücksetzen
            </button>
          )}
          <button type="button" className="btn-small btn-danger" onClick={onDelete}>
            Löschen
          </button>
        </div>
      )}
    </form>
  );
}
