// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HOLIDAY_STORAGE_KEY,
  initHolidays,
  readEffectsOn,
  storeEffects,
} from './holidays';

/** What BaseLayout renders while it snows (season 2026), plus the footer switch and the canvas. */
function render({ preview = false } = {}) {
  const root = document.documentElement;
  root.setAttribute('data-holiday-season', '2026');
  root.setAttribute('data-holiday-december', '');
  root.setAttribute('data-holiday-snow', '');
  root.toggleAttribute('data-holiday-preview', preview);
  document.body.innerHTML = `
    <div data-holiday-switch-field hidden>
      <label>Празнични ефекти <input type="checkbox" role="switch" data-holiday-switch checked></label>
    </div>
    <canvas data-holiday-snow-canvas hidden></canvas>`;
}

const field = () =>
  document.querySelector<HTMLElement>('[data-holiday-switch-field]')!;
const input = () =>
  document.querySelector<HTMLInputElement>('[data-holiday-switch]')!;
const canvas = () =>
  document.querySelector<HTMLCanvasElement>('[data-holiday-snow-canvas]')!;

function stubMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

describe('the effects switch storage', () => {
  beforeEach(() => localStorage.clear());

  it('is on unless switched off this season', () => {
    expect(readEffectsOn(localStorage, 2026)).toBe(true);
    storeEffects(localStorage, 2026, false);
    expect(JSON.parse(localStorage.getItem(HOLIDAY_STORAGE_KEY)!)).toEqual({
      season: 2026,
      effects: false,
    });
    expect(readEffectsOn(localStorage, 2026)).toBe(false);
    // Last year's choice doesn't count.
    expect(readEffectsOn(localStorage, 2027)).toBe(true);
    storeEffects(localStorage, 2026, true);
    expect(localStorage.getItem(HOLIDAY_STORAGE_KEY)).toBeNull();
  });
});

describe('initHolidays', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const name of [
      'data-holiday-season',
      'data-holiday-december',
      'data-holiday-snow',
      'data-holiday-preview',
    ]) {
      document.documentElement.removeAttribute(name);
    }
  });

  it('shows the switch on and lets it snow', () => {
    stubMotion(false);
    render();
    initHolidays(document, window);
    expect(field().hidden).toBe(false);
    expect(input().checked).toBe(true);
    expect(canvas().hidden).toBe(false);
    expect(document.documentElement.hasAttribute('data-holiday-snow')).toBe(
      true,
    );
  });

  it('switching off stops the snow and the caps, and is remembered', () => {
    stubMotion(false);
    render();
    initHolidays(document, window);
    input().click();

    expect(input().checked).toBe(false);
    expect(canvas().hidden).toBe(true);
    expect(document.documentElement.hasAttribute('data-holiday-snow')).toBe(
      false,
    );
    expect(JSON.parse(localStorage.getItem(HOLIDAY_STORAGE_KEY)!)).toEqual({
      season: 2026,
      effects: false,
    });
  });

  it('starts off when it was switched off this season', () => {
    stubMotion(false);
    storeEffects(localStorage, 2026, false);
    render();
    initHolidays(document, window);
    expect(input().checked).toBe(false);
    expect(canvas().hidden).toBe(true);
  });

  it('keeps the caps but no falling snow when the OS asks for less motion', () => {
    stubMotion(true);
    render();
    initHolidays(document, window);
    expect(canvas().hidden).toBe(true);
    expect(document.documentElement.hasAttribute('data-holiday-snow')).toBe(
      true,
    );
  });

  it('stores nothing on a ?holidayDate= preview', () => {
    stubMotion(false);
    render({ preview: true });
    initHolidays(document, window);
    input().click();
    expect(canvas().hidden).toBe(true);
    expect(localStorage.getItem(HOLIDAY_STORAGE_KEY)).toBeNull();
  });

  it('does nothing when it isn’t snowing', () => {
    stubMotion(false);
    render();
    document.documentElement.removeAttribute('data-holiday-december');
    initHolidays(document, window);
    expect(field().hidden).toBe(true);
  });
});
