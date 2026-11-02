import { describe, expect, it } from 'vitest';
import { parseContent, plainPreview } from '../content';

describe('parseContent', () => {
  it('Text mit Inline-Formel', () => {
    expect(parseContent('Fläche: $\\int_0^1 x^2\\,dx$ = 1/3')).toEqual([
      { type: 'text', value: 'Fläche: ' },
      { type: 'math', value: '\\int_0^1 x^2\\,dx', display: false },
      { type: 'text', value: ' = 1/3' },
    ]);
  });
  it('abgesetzte Formel über mehrere Zeilen', () => {
    expect(parseContent('$$\n\\sum F_x = 0\n$$')).toEqual([
      { type: 'math', value: '\\sum F_x = 0', display: true },
    ]);
  });
  it('Bild', () => {
    expect(parseContent('Skizze:\n![FKB](media:abc-123)')).toEqual([
      { type: 'text', value: 'Skizze:\n' },
      { type: 'image', alt: 'FKB', id: 'abc-123' },
    ]);
  });
  it('maskiertes Dollarzeichen bleibt Text', () => {
    expect(parseContent('Kostet 5 \\$ und 3 \\$')).toEqual([{ type: 'text', value: 'Kostet 5 $ und 3 $' }]);
  });
  it('einzelnes $ ohne Gegenstück bleibt Text', () => {
    expect(parseContent('nur $ eins')).toEqual([{ type: 'text', value: 'nur $ eins' }]);
  });
  it('plainPreview', () => {
    expect(plainPreview('a\n\n![x](media:1)  b')).toBe('a [Bild] b');
    expect(plainPreview('x'.repeat(200), 10)).toHaveLength(10);
  });
});
