import { describe, expect, it } from 'vitest';
import { holidayState, pageHolidays, parseDayKey } from './holidays';

describe('holidayState', () => {
  it('is off outside Dec 1 – Jan 10', () => {
    for (const day of ['2026-11-30', '2027-01-11', '2026-07-15']) {
      expect(holidayState(day)).toMatchObject({
        active: false,
        season: null,
        december: false,
        advent: false,
        snowDepth: 0,
      });
    }
  });

  it('snows from Dec 1 to Jan 6, deeper up to Christmas Eve, melting in January', () => {
    expect(holidayState('2026-12-01')).toMatchObject({
      season: 2026,
      december: true,
      advent: true,
    });
    expect(holidayState('2026-12-12').snowDepth).toBeCloseTo(0.5);
    expect(holidayState('2026-12-24').snowDepth).toBe(1);
    expect(holidayState('2027-01-01')).toMatchObject({
      season: 2026,
      december: true,
      advent: false,
    });
    expect(holidayState('2027-01-06').snowDepth).toBeCloseTo(1 / 7);
    expect(holidayState('2027-01-07')).toMatchObject({
      december: false,
      active: true,
    });
  });

  it('has Christmas, New Year and the сурвачка in their windows', () => {
    expect(holidayState('2026-12-19').christmas).toBe(false);
    expect(holidayState('2026-12-20').christmas).toBe(true);
    expect(holidayState('2026-12-27').christmas).toBe(true);
    expect(holidayState('2026-12-31').newYear).toBe(true);
    expect(holidayState('2027-01-02').newYear).toBe(true);
    expect(holidayState('2027-01-03').newYear).toBe(false);
    expect(holidayState('2027-01-06').survachka).toBe(true);
    expect(holidayState('2027-01-07').survachka).toBe(false);
  });
});

describe('parseDayKey', () => {
  it('keeps real days only', () => {
    expect(parseDayKey('2026-12-24')).toBe('2026-12-24');
    expect(parseDayKey('2026-02-30')).toBeNull();
    expect(parseDayKey('xmas')).toBeNull();
  });
});

describe('pageHolidays', () => {
  it('uses the Sofia day: Dec 1 starts at midnight in Sofia, not UTC', () => {
    const url = new URL('https://theindex.training/');
    expect(
      pageHolidays(url, new Date('2026-11-30T22:30:00Z')).state.december,
    ).toBe(true);
    expect(
      pageHolidays(url, new Date('2026-11-30T21:30:00Z')).state.december,
    ).toBe(false);
  });

  it('previews ?holidayDate= and says so', () => {
    const url = new URL(
      'https://theindex.training/articles?holidayDate=2026-12-24',
    );
    const holidays = pageHolidays(url, new Date('2026-11-25T10:00:00Z'));
    expect(holidays.preview).toBe(true);
    expect(holidays.state.adventDay).toBe(24);
  });

  it('ignores a ?holidayDate= that is not a day', () => {
    const url = new URL('https://theindex.training/?holidayDate=soon');
    const holidays = pageHolidays(url, new Date('2026-11-25T10:00:00Z'));
    expect(holidays.preview).toBe(false);
    expect(holidays.state.active).toBe(false);
  });
});
