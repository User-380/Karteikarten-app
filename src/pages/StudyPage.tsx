import { useCallback, useEffect, useState } from 'react';
import { CardContent } from '../components/CardContent';
import { answerCard, db, getSettings, newDoneToday, undoAnswer } from '../lib/db';
import { buildSession, isLearning, pickNext, staysInSession } from '../lib/queue';
import { navigate } from '../lib/router';
import { formatInterval, preview, scheduleOf } from '../lib/scheduler';
import { CardState, Rating, type Card } from '../lib/types';

const BUTTONS: { rating: Rating; label: string; cls: string }[] = [
  { rating: Rating.Again, label: 'Nochmal', cls: 'rate-again' },
  { rating: Rating.Hard, label: 'Schwer', cls: 'rate-hard' },
  { rating: Rating.Good, label: 'Gut', cls: 'rate-good' },
  { rating: Rating.Easy, label: 'Leicht', cls: 'rate-easy' },
];

interface Undo {
  previous: Card;
  logId: number;
  session: Card[];
}

/** Lernmodus. deckId = "all" lernt alle Stapel gemeinsam. */
export function StudyPage({ deckId }: { deckId: string }) {
  const [session, setSession] = useState<Card[] | null>(null);
  const [current, setCurrent] = useState<Card | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [doneCount, setDoneCount] = useState(0);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  // Sitzung beim Öffnen zusammenstellen
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const [cards, settings, newDone, deck] = await Promise.all([
        deckId === 'all' ? db.cards.toArray() : db.cards.where('deckId').equals(deckId).toArray(),
        getSettings(),
        newDoneToday(now),
        deckId === 'all' ? null : db.decks.get(deckId),
      ]);
      if (cancelled) return;
      const s = buildSession(cards, now, settings.newPerDay, newDone);
      setDeckName(deck ? deck.name : 'Alle Stapel');
      setSession(s);
      setCurrent(pickNext(s, now));
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Wenn gerade nichts dran ist, aber noch Lernkarten warten: regelmäßig prüfen
  useEffect(() => {
    if (current || !session?.length) return;
    const t = setInterval(() => {
      const next = pickNext(session, Date.now());
      if (next) {
        setCurrent(next);
        setRevealed(false);
      } else setTick((x) => x + 1);
    }, 10_000);
    return () => clearInterval(t);
  }, [current, session]);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!current || !session || busy) return;
      setBusy(true);
      try {
        const now = Date.now();
        const { card: updated, logId } = await answerCard(current, rating, now);
        const rest = session.filter((c) => c.id !== current.id);
        const next = staysInSession(updated, now) ? [...rest, updated] : rest;
        setUndo({ previous: current, logId, session });
        setSession(next);
        setCurrent(pickNext(next, now));
        setRevealed(false);
        setDoneCount((n) => n + 1);
      } finally {
        setBusy(false);
      }
    },
    [current, session, busy],
  );

  const onUndo = useCallback(async () => {
    if (!undo || busy) return;
    setBusy(true);
    try {
      await undoAnswer(undo.previous, undo.logId);
      setSession(undo.session);
      setCurrent(undo.previous);
      setRevealed(true);
      setDoneCount((n) => Math.max(0, n - 1));
      setUndo(null);
    } finally {
      setBusy(false);
    }
  }, [undo, busy]);

  // Tastatur: Leertaste/Enter = Antwort zeigen, 1–4 = Bewertung, Z = rückgängig
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && current && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void rate(Number(e.key) as Rating);
      } else if (revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        void rate(Rating.Good);
      } else if (e.key.toLowerCase() === 'z' && undo) {
        void onUndo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, current, rate, undo, onUndo]);

  if (!session) return <p className="muted">Lade …</p>;

  const backTo = deckId === 'all' ? '/' : `/deck/${deckId}`;

  if (!current) {
    const waiting = session.filter(isLearning).sort((a, b) => a.due - b.due);
    return (
      <div className="study-done card-box">
        {waiting.length > 0 ? (
          <>
            <div className="hero-title">Kurze Pause ☕</div>
            <p className="muted">
              {waiting.length} {waiting.length === 1 ? 'Karte kommt' : 'Karten kommen'} in{' '}
              {formatInterval(Math.max(0, waiting[0].due - Date.now()))} wieder. Du kannst die Seite offen lassen oder
              später zurückkommen.
            </p>
          </>
        ) : (
          <>
            <div className="hero-title">Geschafft! 🎉</div>
            <p className="muted">
              {doneCount > 0
                ? `Du hast ${doneCount} ${doneCount === 1 ? 'Karte' : 'Karten'} gelernt. Für heute ist alles erledigt.`
                : 'Hier ist heute nichts fällig.'}
            </p>
          </>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          {undo && <button onClick={onUndo}>↶ Rückgängig</button>}
          <button className="btn-primary" onClick={() => navigate(backTo)}>
            Zurück
          </button>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const intervals = revealed ? preview(scheduleOf(current), now) : null;
  const counts = {
    new: session.filter((c) => c.state === CardState.New).length,
    learning: session.filter(isLearning).length,
    review: session.filter((c) => c.state === CardState.Review).length,
  };

  return (
    <div className="study">
      <div className="study-head row">
        <a className="btn btn-small" href={`#${backTo}`} aria-label="Lernen beenden">
          ✕
        </a>
        <span className="study-deck">{deckName}</span>
        <span className="spacer" />
        <span className="badges">
          <span className={`badge badge-new ${current.state === CardState.New ? 'is-current' : ''}`}>{counts.new}</span>
          <span className={`badge badge-learn ${isLearning(current) ? 'is-current' : ''}`}>{counts.learning}</span>
          <span className={`badge badge-review ${current.state === CardState.Review ? 'is-current' : ''}`}>
            {counts.review}
          </span>
        </span>
      </div>

      <div className="study-card card-box">
        <CardContent text={current.front} />
        {revealed && (
          <>
            <hr className="divider" />
            <CardContent text={current.back} />
          </>
        )}
      </div>

      <div className="study-actions">
        {!revealed ? (
          <button className="btn-primary btn-big btn-block" onClick={() => setRevealed(true)}>
            Antwort zeigen
          </button>
        ) : (
          <div className="rate-grid">
            {BUTTONS.map((b) => (
              <button key={b.rating} className={`rate-btn ${b.cls}`} disabled={busy} onClick={() => void rate(b.rating)}>
                <span className="rate-label">{b.label}</span>
                <span className="rate-ivl">{formatInterval(intervals![b.rating] - now)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="row study-foot">
          {undo ? (
            <button className="btn-small" onClick={onUndo} disabled={busy}>
              ↶ Rückgängig
            </button>
          ) : (
            <span />
          )}
          <span className="spacer" />
          <a className="btn btn-small" href={`#/card/${current.id}`}>
            Bearbeiten
          </a>
        </div>
      </div>
    </div>
  );
}
