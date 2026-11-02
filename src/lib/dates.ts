/** Hilfsfunktionen für Kalendertage (immer in lokaler Zeit). */

/** „JJJJ-MM-TT“ für den lokalen Tag von `t`. */
export function dayKey(t: number | Date = Date.now()): string {
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Letzte Millisekunde des lokalen Tages. */
export function endOfDay(t: number = Date.now()): number {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Tag-Schlüssel `n` Tage vor `key` (n darf negativ sein). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  // 12 Uhr mittags, damit Sommer-/Winterzeit nichts verschiebt
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + n);
  return dayKey(date);
}
