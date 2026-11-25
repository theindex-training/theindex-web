// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOLIDAY_STORAGE_SCRIPT } from './holiday-storage';

/** Marks <html> as BaseLayout does, then runs the pre-paint script as the page would. */
function load(attributes: Record<string, string>) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(attributes)) {
    root.setAttribute(name, value);
  }
  // Runs the very text BaseLayout inlines, as the browser does before the first paint.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the test's subject is that text
  const run = new Function(HOLIDAY_STORAGE_SCRIPT) as () => void;
  run();
}

const stored = () => localStorage.getItem('holidays');

describe('the holidays’ pre-paint script', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    for (const name of [
      'data-holiday-season',
      'data-holiday-snow',
      'data-holiday-preview',
    ]) {
      document.documentElement.removeAttribute(name);
    }
  });

  it('deletes the holidays’ storage outside the season', () => {
    localStorage.setItem(
      'holidays',
      JSON.stringify({ season: 2026, effects: false }),
    );
    load({});
    expect(stored()).toBeNull();
  });

  it('deletes another season’s storage and keeps the snow', () => {
    localStorage.setItem(
      'holidays',
      JSON.stringify({ season: 2025, effects: false }),
    );
    load({ 'data-holiday-season': '2026', 'data-holiday-snow': '' });
    expect(stored()).toBeNull();
    expect(document.documentElement.hasAttribute('data-holiday-snow')).toBe(
      true,
    );
  });

  it('leaves the snow caps off when the effects were switched off this season', () => {
    const value = JSON.stringify({ season: 2026, effects: false });
    localStorage.setItem('holidays', value);
    load({ 'data-holiday-season': '2026', 'data-holiday-snow': '' });
    expect(stored()).toBe(value);
    expect(document.documentElement.hasAttribute('data-holiday-snow')).toBe(
      false,
    );
  });

  it('deletes unreadable storage', () => {
    localStorage.setItem('holidays', '{oops');
    load({ 'data-holiday-season': '2026' });
    expect(stored()).toBeNull();
  });

  it('leaves the storage alone on a preview, even of a day outside the season', () => {
    const value = JSON.stringify({ season: 2026, effects: false });
    localStorage.setItem('holidays', value);
    load({ 'data-holiday-preview': '' });
    expect(stored()).toBe(value);
  });
});
