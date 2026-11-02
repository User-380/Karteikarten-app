/**
 * CSV-Import. Erwartet zwei Spalten: Vorderseite;Rückseite
 * - Trennzeichen: Semikolon (Tab und Komma werden auch erkannt)
 * - Felder dürfen in "Anführungszeichen" stehen, dann sind auch ; und Zeilenumbrüche erlaubt
 * - "" innerhalb von Anführungszeichen steht für ein einzelnes "
 */

export function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(',')) return ',';
  return ';';
}

export function parseCsv(input: string, sep = detectSeparator(input)): string[][] {
  const text = input.replace(/^﻿/, ''); // BOM (z. B. von Excel) entfernen
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === '') {
      inQuotes = true;
      i++;
    } else if (ch === sep) {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\r' || ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const HEADER_FRONT = /^(vorderseite|front|frage|question)$/i;
const HEADER_BACK = /^(rückseite|rueckseite|back|antwort|answer)$/i;

/** Wandelt CSV-Text in Karten um. Leere Zeilen und eine Kopfzeile werden übersprungen. */
export function csvToCards(text: string): { front: string; back: string }[] {
  const rows = parseCsv(text).filter((r) => r.some((f) => f.trim() !== ''));
  // Kopfzeile nur überspringen, wenn BEIDE Spalten wie Überschriften aussehen
  if (rows.length && HEADER_FRONT.test(rows[0][0]?.trim() ?? '') && HEADER_BACK.test(rows[0][1]?.trim() ?? '')) {
    rows.shift();
  }
  return rows.map((r) => ({
    front: (r[0] ?? '').trim(),
    // Falls die Rückseite selbst ; enthielt und nicht in "" stand: Rest wieder zusammensetzen
    back: r.slice(1).join(';').trim(),
  }));
}
