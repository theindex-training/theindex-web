import { describe, expect, it } from 'vitest';
import { normalizeQuery, pageCount, pageHref, parsePage } from './listing';

describe('parsePage', () => {
  it('is page 1 without ?page=', () => {
    expect(parsePage(null)).toBe(1);
  });

  it('reads whole page numbers up to the API maximum', () => {
    expect(parsePage('1')).toBe(1);
    expect(parsePage('2')).toBe(2);
    expect(parsePage('10000')).toBe(10_000);
  });

  it('is null for anything else, so the page answers 404', () => {
    for (const value of [
      '',
      '0',
      '-1',
      '+2',
      '02',
      '1.5',
      '1e2',
      'abc',
      ' 2',
      '10001',
      '99999',
      '100000',
    ]) {
      expect(parsePage(value), value).toBeNull();
    }
  });
});

describe('normalizeQuery', () => {
  it('trims and collapses whitespace; blank is no search', () => {
    expect(normalizeQuery('  клек   с\tтежест \n')).toBe('клек с тежест');
    expect(normalizeQuery('   ')).toBe('');
    expect(normalizeQuery(null)).toBe('');
  });

  it('cuts a search to the API limit of 100 characters', () => {
    expect(normalizeQuery('а'.repeat(150))).toBe('а'.repeat(100));
    expect(normalizeQuery('а'.repeat(100))).toBe('а'.repeat(100));
  });

  it('never splits a character in two or ends with a space when cutting', () => {
    // 99 letters and an emoji (two UTF-16 units) would be 101 units: the emoji is dropped.
    expect(normalizeQuery(`${'а'.repeat(99)}💪 още`)).toBe('а'.repeat(99));
    expect(normalizeQuery(`${'а'.repeat(99)} още`)).toBe('а'.repeat(99));
  });
});

describe('pageCount', () => {
  it('rounds up, with at least one page', () => {
    expect(pageCount(0, 12)).toBe(1);
    expect(pageCount(12, 12)).toBe(1);
    expect(pageCount(13, 12)).toBe(2);
    expect(pageCount(25, 12)).toBe(3);
  });
});

describe('pageHref', () => {
  it('leaves ?page= out for the first page', () => {
    expect(pageHref('/articles', 1)).toBe('/articles');
    expect(pageHref('/articles/category/tehnika', 3)).toBe(
      '/articles/category/tehnika?page=3',
    );
  });

  it('keeps the search, encoded', () => {
    expect(pageHref('/articles', 1, 'клек & тяга')).toBe(
      '/articles?q=%D0%BA%D0%BB%D0%B5%D0%BA+%26+%D1%82%D1%8F%D0%B3%D0%B0',
    );
    expect(pageHref('/articles', 2, 'клек')).toBe(
      '/articles?q=%D0%BA%D0%BB%D0%B5%D0%BA&page=2',
    );
  });
});
