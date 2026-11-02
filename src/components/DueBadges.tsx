import type { DueCounts } from '../lib/queue';

/** Drei farbige Zahlen wie bei Anki: neu · in Lernphase · Wiederholung */
export function DueBadges({ due }: { due: DueCounts }) {
  return (
    <span className="badges" aria-label={`${due.new} neu, ${due.learning} in Lernphase, ${due.review} Wiederholungen`}>
      <span className="badge badge-new" title="Neu">{due.new}</span>
      <span className="badge badge-learn" title="In Lernphase">{due.learning}</span>
      <span className="badge badge-review" title="Wiederholen">{due.review}</span>
    </span>
  );
}
