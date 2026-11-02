import { useState, type FormEvent } from 'react';
import { DueBadges } from '../components/DueBadges';
import { createDeck } from '../lib/db';
import { useOverview } from '../lib/hooks';
import { navigate } from '../lib/router';

export function HomePage() {
  const overview = useOverview();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  if (!overview) return <p className="muted">Lade …</p>;

  const total = overview.reduce((n, o) => n + o.due.total, 0);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createDeck(name);
    setName('');
    setAdding(false);
  }

  return (
    <>
      <section className="card-box hero">
        {overview.length === 0 ? (
          <>
            <div className="hero-title">Willkommen!</div>
            <p className="muted">Lege unten deinen ersten Stapel an, z. B. „Statik“ oder „Mathe“.</p>
          </>
        ) : total > 0 ? (
          <>
            <div className="hero-number">{total}</div>
            <div className="muted">{total === 1 ? 'Karte ist heute fällig' : 'Karten sind heute fällig'}</div>
            <button className="btn-primary btn-big btn-block" onClick={() => navigate('/study/all')}>
              Alle lernen
            </button>
          </>
        ) : (
          <>
            <div className="hero-title">Alles erledigt 🎉</div>
            <p className="muted">Für heute ist nichts mehr fällig. Bis morgen!</p>
          </>
        )}
      </section>

      <h2>Stapel</h2>
      <ul className="deck-list">
        {overview.map(({ deck, due, cardCount }) => (
          <li key={deck.id} className="deck-row card-box">
            <a className="deck-link" href={`#/deck/${deck.id}`}>
              <span className="deck-name">{deck.name}</span>
              <span className="muted small">
                {cardCount} {cardCount === 1 ? 'Karte' : 'Karten'}
              </span>
            </a>
            <DueBadges due={due} />
            <button
              className="btn-primary btn-small"
              disabled={due.total === 0}
              onClick={() => navigate(`/study/${deck.id}`)}
            >
              Lernen
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form className="card-box stack" onSubmit={onCreate}>
          <label htmlFor="deck-name">Name des neuen Stapels</label>
          <input
            id="deck-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Elektrotechnik"
          />
          <div className="row">
            <button type="submit" className="btn-primary">
              Anlegen
            </button>
            <button type="button" onClick={() => setAdding(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <button className="btn-block" onClick={() => setAdding(true)}>
          + Neuer Stapel
        </button>
      )}

      {overview.length > 0 && (
        <p className="muted small legend">
          <span className="badge badge-new">neu</span> <span className="badge badge-learn">in Lernphase</span>{' '}
          <span className="badge badge-review">wiederholen</span>
        </p>
      )}
    </>
  );
}
