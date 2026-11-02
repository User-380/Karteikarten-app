import { describe, expect, it } from 'vitest';
import { csvToCards, parseCsv } from '../csv';

describe('CSV', () => {
  it('einfache Zeilen mit Semikolon', () => {
    expect(csvToCards('F = m·a;Newton 2\nE = mc^2;Einstein')).toEqual([
      { front: 'F = m·a', back: 'Newton 2' },
      { front: 'E = mc^2', back: 'Einstein' },
    ]);
  });
  it('überspringt Kopfzeile, leere Zeilen und BOM; versteht \\r\\n', () => {
    expect(csvToCards('﻿Vorderseite;Rückseite\r\n\r\na;b\r\n')).toEqual([{ front: 'a', back: 'b' }]);
  });
  it('Anführungszeichen mit ; , Zeilenumbruch und ""', () => {
    expect(csvToCards('"a;b";"Zeile 1\nZeile ""2"""')).toEqual([{ front: 'a;b', back: 'Zeile 1\nZeile "2"' }]);
  });
  it('LaTeX bleibt erhalten', () => {
    expect(csvToCards('$\\int_0^1 x^2\\,dx$;$\\frac{1}{3}$')).toEqual([
      { front: '$\\int_0^1 x^2\\,dx$', back: '$\\frac{1}{3}$' },
    ]);
  });
  it('erkennt Tab als Trennzeichen', () => {
    expect(parseCsv('a\tb\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
  it('ungequotetes ; in der Rückseite wird wieder zusammengesetzt', () => {
    expect(csvToCards('Frage;Teil 1;Teil 2')).toEqual([{ front: 'Frage', back: 'Teil 1;Teil 2' }]);
  });
});

describe('CSV Kopfzeile', () => {
  it('eine Karte mit der Vorderseite „Frage“ wird nicht als Kopfzeile verworfen', () => {
    expect(csvToCards('Frage;Was ist ein Lager?')).toEqual([{ front: 'Frage', back: 'Was ist ein Lager?' }]);
  });
  it('englische Kopfzeile', () => {
    expect(csvToCards('Front;Back\nx;y')).toEqual([{ front: 'x', back: 'y' }]);
  });
});
