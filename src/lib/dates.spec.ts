import { describe, expect, it } from 'vitest';
import { currentYear, formatDateTime, formatLongDate, sofiaDay } from './dates';

describe('currentYear', () => {
  it('uses the Sofia date, not UTC, around New Year', () => {
    // 22:30 UTC on 31 December is already 00:30 on 1 January in Sofia (UTC+2 in winter).
    expect(currentYear(new Date('2026-12-31T22:30:00Z'))).toBe(2027);
    expect(currentYear(new Date('2026-12-31T21:30:00Z'))).toBe(2026);
  });
});

describe('formatLongDate', () => {
  it('writes the Sofia date in Bulgarian', () => {
    expect(formatLongDate('2026-11-02T08:00:00.000Z')).toBe(
      '2 ноември 2026 г.',
    );
  });

  it('uses the Sofia day, not UTC, around midnight', () => {
    // 22:30 UTC on 6 November is 00:30 on 7 November in Sofia.
    expect(formatLongDate(new Date('2026-11-06T22:30:00Z'))).toBe(
      '7 ноември 2026 г.',
    );
  });
});

describe('sofiaDay', () => {
  it('is the Sofia calendar day of a moment', () => {
    expect(sofiaDay('2026-11-06T21:59:00Z')).toBe('2026-11-06');
    expect(sofiaDay('2026-11-06T22:00:00Z')).toBe('2026-11-07');
  });
});

describe('formatDateTime', () => {
  it('writes the Sofia date and 24-hour time in Bulgarian, midnight as 00', () => {
    // 22:05 UTC on 5 November is 00:05 on 6 November in Sofia.
    expect(formatDateTime('2026-11-05T22:05:00Z')).toBe(
      '6 ноември 2026 г. в 00:05',
    );
    expect(formatDateTime('2026-11-02T13:45:00Z')).toBe(
      '2 ноември 2026 г. в 15:45',
    );
  });
});
