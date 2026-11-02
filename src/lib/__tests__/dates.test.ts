import { describe, expect, it } from 'vitest';
import { addDays, dayKey, endOfDay } from '../dates';

describe('dates', () => {
  it('dayKey nutzt die lokale Zeit', () => {
    expect(dayKey(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05');
    expect(dayKey(new Date(2026, 2, 6, 0, 1))).toBe('2026-03-06');
  });
  it('endOfDay', () => {
    const e = new Date(endOfDay(new Date(2026, 2, 5, 8).getTime()));
    expect([e.getDate(), e.getHours(), e.getMinutes()]).toEqual([5, 23, 59]);
  });
  it('addDays über Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // Zeitumstellung
  });
});
