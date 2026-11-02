import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { addDays, dayKey, endOfDay } from '../lib/dates';
import { useNow } from '../lib/hooks';
import { cardsPerDay, lastDays, reviewsPerDay, streak } from '../lib/stats';
import { CardState, Rating } from '../lib/types';

const DAYS_SHOWN = 30;

export function StatsPage() {
  const now = useNow(60_000);
  const today = dayKey(now);
  const data = useLiveQuery(async () => {
    const [logs, cards] = await Promise.all([db.reviews.toArray(), db.cards.toArray()]);
    return { logs, cards };
  }, []);

  if (!data) return <p className="muted">Lade …</p>;
  const { logs, cards } = data;

  const perDay = cardsPerDay(logs);
  const reviews = reviewsPerDay(logs);
  const s = streak(new Set(perDay.keys()), today);
  const days = lastDays(today, DAYS_SHOWN);
  const max = Math.max(1, ...days.map((d) => perDay.get(d) ?? 0));

  // Trefferquote der letzten 30 Tage (nur gelernte Karten, nicht neue)
  const since = days[0];
  const recent = logs.filter((l) => l.day >= since && l.stateBefore === CardState.Review);
  const correct = recent.filter((l) => l.rating !== Rating.Again).length;

  // Vorschau: wie viele Karten werden an den nächsten 7 Tagen fällig?
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const end = endOfDay(new Date(`${day}T12:00:00`).getTime());
    const start = i === 0 ? -Infinity : endOfDay(new Date(`${addDays(day, -1)}T12:00:00`).getTime());
    const n = cards.filter((c) => c.state !== CardState.New && c.due > start && c.due <= end).length;
    return { day, n };
  });

  const byState = {
    new: cards.filter((c) => c.state === CardState.New).length,
    learning: cards.filter((c) => c.state === CardState.Learning || c.state === CardState.Relearning).length,
    review: cards.filter((c) => c.state === CardState.Review).length,
  };

  return (
    <>
      <h1>Statistik</h1>
      <div className="stat-grid">
        <div className="card-box stat">
          <div className="stat-num">{s.current} 🔥</div>
          <div className="muted small">Tage Lernserie</div>
        </div>
        <div className="card-box stat">
          <div className="stat-num">{perDay.get(today) ?? 0}</div>
          <div className="muted small">Karten heute</div>
        </div>
        <div className="card-box stat">
          <div className="stat-num">{s.longest}</div>
          <div className="muted small">längste Serie</div>
        </div>
        <div className="card-box stat">
          <div className="stat-num">{recent.length ? `${Math.round((100 * correct) / recent.length)} %` : '–'}</div>
          <div className="muted small">gewusst (30 Tage)</div>
        </div>
      </div>
      {!s.learnedToday && s.current > 0 && (
        <p className="muted small">Lerne heute noch, damit deine Serie weiterläuft!</p>
      )}

      <h2>Gelernte Karten pro Tag</h2>
      <div className="card-box">
        <div className="bars" role="img" aria-label="Balkendiagramm der gelernten Karten in den letzten 30 Tagen">
          {days.map((d) => {
            const n = perDay.get(d) ?? 0;
            return (
              <div
                key={d}
                className={`bar ${d === today ? 'bar-today' : ''}`}
                style={{ height: `${(n / max) * 100}%` }}
                title={`${new Date(`${d}T12:00:00`).toLocaleDateString('de-DE')}: ${n} Karten, ${reviews.get(d) ?? 0} Bewertungen`}
              />
            );
          })}
        </div>
        <div className="row muted small">
          <span>vor {DAYS_SHOWN - 1} Tagen</span>
          <span className="spacer" />
          <span>heute</span>
        </div>
      </div>

      <h2>Fällig in den nächsten 7 Tagen</h2>
      <div className="card-box">
        <table className="table">
          <tbody>
            {forecast.map((f, i) => (
              <tr key={f.day}>
                <td>
                  {i === 0
                    ? 'heute'
                    : i === 1
                      ? 'morgen'
                      : new Date(`${f.day}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long' })}
                </td>
                <td className="num">{f.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Karten</h2>
      <div className="card-box">
        <table className="table">
          <tbody>
            <tr>
              <td>neu</td>
              <td className="num">{byState.new}</td>
            </tr>
            <tr>
              <td>in Lernphase</td>
              <td className="num">{byState.learning}</td>
            </tr>
            <tr>
              <td>gelernt</td>
              <td className="num">{byState.review}</td>
            </tr>
            <tr>
              <td>
                <strong>gesamt</strong>
              </td>
              <td className="num">
                <strong>{cards.length}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
