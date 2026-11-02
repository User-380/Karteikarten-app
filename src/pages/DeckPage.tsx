import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type FormEvent } from 'react';
import { DueBadges } from '../components/DueBadges';
import { plainPreview } from '../lib/content';
import { db, deleteDeck, renameDeck } from '../lib/db';
import { useOverview } from '../lib/hooks';
import { navigate } from '../lib/router';
import { formatInterval } from '../lib/scheduler';
import { CardState, type Card } from '../lib/types';

export function DeckPage({ deckId }: { deckId: string }) {
  const overview = useOverview();
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).toArray(), [deckId]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  const info = overview?.find((o) => o.deck.id === deckId);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (cards ?? []).filter(
      (c) => !q || c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q),
    );
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [cards, search]);

  if (!overview || !cards) return <p className="muted">Lade …</p>;
  if (!info) {
    return (
      <p>
        Stapel nicht gefunden. <a href="#/">Zur Startseite</a>
      </p>
    );
  }
  const { deck, due } = info;

  async function onRename(e: FormEvent) {
    e.preventDefault();
    await renameDeck(deckId, name);
    setRenaming(false);
  }

  async function onDelete() {
    const ok = confirm(
      `Stapel „${deck.name}“ mit ${cards!.length} Karten wirklich löschen?\nDas kann nicht rückgängig gemacht werden.`,
    );
    if (!ok) return;
    await deleteDeck(deckId);
    navigate('/');
  }

  return (
    <>
      {renaming ? (
        <form className="row" onSubmit={onRename}>
          <input type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn-primary">
            OK
          </button>
          <button type="button" onClick={() => setRenaming(false)}>
            Abbrechen
          </button>
        </form>
      ) : (
        <h1>{deck.name}</h1>
      )}

      <section className="card-box stack">
        <div className="row">
          <DueBadges due={due} />
          <span className="spacer" />
          <span className="muted small">heute fällig: {due.total}</span>
        </div>
        <button
          className="btn-primary btn-big btn-block"
          disabled={due.total === 0}
          onClick={() => navigate(`/study/${deckId}`)}
        >
          {due.total === 0 ? 'Nichts fällig' : 'Lernen'}
        </button>
        <a className="btn btn-block" href={`#/card/new?deck=${deckId}`}>
          + Karte hinzufügen
        </a>
        <div className="row">
          <button
            className="btn-small"
            onClick={() => {
              setName(deck.name);
              setRenaming(true);
            }}
          >
            Umbenennen
          </button>
          <a className="btn btn-small" href={`#/settings?import=${deckId}`}>
            CSV-Import
          </a>
          <span className="spacer" />
          <button className="btn-small btn-danger" onClick={onDelete}>
            Löschen
          </button>
        </div>
      </section>

      <h2>
        Karten <span className="muted small">({cards.length})</span>
      </h2>
      {cards.length > 5 && (
        <input
          type="search"
          placeholder="Karten durchsuchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 10 }}
        />
      )}
      {cards.length === 0 && <p className="muted">Noch keine Karten. Leg die erste an!</p>}
      <ul className="card-list">
        {shown.map((c) => (
          <li key={c.id}>
            <a className="card-list-item" href={`#/card/${c.id}`}>
              <span className="card-list-front">{plainPreview(c.front) || <em>(leer)</em>}</span>
              <span className="muted small">{dueLabel(c)}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function dueLabel(c: Card): string {
  if (c.state === CardState.New) return 'neu';
  const diff = c.due - Date.now();
  if (diff <= 0) return 'fällig';
  return `in ${formatInterval(diff)}`;
}
