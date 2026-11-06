import { describe, expect, it } from 'vitest';
import { currentYear } from './dates';

describe('currentYear', () => {
  it('uses the Sofia date, not UTC, around New Year', () => {
    // 22:30 UTC on 31 December is already 00:30 on 1 January in Sofia (UTC+2 in winter).
    expect(currentYear(new Date('2026-12-31T22:30:00Z'))).toBe(2027);
    expect(currentYear(new Date('2026-12-31T21:30:00Z'))).toBe(2026);
  });
});
