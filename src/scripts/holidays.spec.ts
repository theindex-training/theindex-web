// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HOLIDAY_STORAGE_KEY,
  initHolidays,
  readEffectsOn,
  storeEffects,
  takeFireworksShow,
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

describe('the season’s storage', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the switch, the show and the wish together', () => {
    storeEffects(localStorage, 2026, false);
    expect(takeFireworksShow(localStorage, 2026, '2026-12-31')).toBe(true);
    expect(takeFireworksShow(localStorage, 2026, '2026-12-31')).toBe(false);
    expect(JSON.parse(localStorage.getItem(HOLIDAY_STORAGE_KEY)!)).toEqual({
      season: 2026,
      effects: false,
      show: '2026-12-31',
    });
    // Switching back on keeps the rest.
    storeEffects(localStorage, 2026, true);
    expect(JSON.parse(localStorage.getItem(HOLIDAY_STORAGE_KEY)!)).toEqual({
      season: 2026,
      show: '2026-12-31',
    });
    // A new day gets its show.
    expect(takeFireworksShow(localStorage, 2026, '2027-01-01')).toBe(true);
  });

  it('plays the show on every page of a preview (no storage)', () => {
    expect(takeFireworksShow(undefined, 2026, '2026-12-31')).toBe(true);
    expect(takeFireworksShow(undefined, 2026, '2026-12-31')).toBe(true);
  });
});

describe('the сурвачка’s wish', () => {
  const dialogProto = HTMLDialogElement.prototype as unknown as Record<
    string,
    unknown
  >;

  function renderJanuary({ preview = false } = {}) {
    const root = document.documentElement;
    root.setAttribute('data-holiday-season', '2026');
    root.setAttribute('data-holiday-december', '');
    root.setAttribute('data-holiday-snow', '');
    root.setAttribute('data-holiday-survachka', '');
    root.setAttribute('data-holiday-day', '2027-01-01');
    root.toggleAttribute('data-holiday-preview', preview);
    document.body.innerHTML = `
      <button data-survachka-open hidden>Сурвачка</button>
      <dialog data-survachka-dialog><button data-survachka-close>Благодаря!</button></dialog>
      <canvas data-holiday-snow-canvas hidden></canvas>`;
  }

  const dialog = () =>
    document.querySelector<HTMLDialogElement>('[data-survachka-dialog]')!;
  const openButton = () =>
    document.querySelector<HTMLButtonElement>('[data-survachka-open]')!;
  const close = () =>
    document.querySelector<HTMLButtonElement>('[data-survachka-close]')!;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    dialogProto['showModal'] = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    dialogProto['close'] = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete dialogProto['showModal'];
    delete dialogProto['close'];
    for (const name of [
      'data-holiday-season',
      'data-holiday-december',
      'data-holiday-snow',
      'data-holiday-survachka',
      'data-holiday-day',
      'data-holiday-preview',
    ]) {
      document.documentElement.removeAttribute(name);
    }
  });

  it('opens by itself the first time, taps the logo, and is remembered once closed', () => {
    stubMotion(false);
    renderJanuary();
    initHolidays(document, window);
    expect(dialog().open).toBe(true);
    expect(dialog().classList).toContain('is-tapping');
    expect(openButton().hidden).toBe(false);

    close().click();
    expect(dialog().open).toBe(false);
    expect(JSON.parse(localStorage.getItem(HOLIDAY_STORAGE_KEY)!)).toEqual({
      season: 2026,
      survachka: true,
    });
  });

  it('doesn’t open by itself once seen; the сурвачка by the logo opens it', () => {
    stubMotion(false);
    localStorage.setItem(
      HOLIDAY_STORAGE_KEY,
      JSON.stringify({ season: 2026, survachka: true }),
    );
    renderJanuary();
    initHolidays(document, window);
    expect(dialog().open).toBe(false);
    openButton().click();
    expect(dialog().open).toBe(true);
  });

  it('greets even with the effects off, without the tapping when the OS asks for less motion', () => {
    stubMotion(true);
    localStorage.setItem(
      HOLIDAY_STORAGE_KEY,
      JSON.stringify({ season: 2026, effects: false }),
    );
    renderJanuary();
    initHolidays(document, window);
    expect(dialog().open).toBe(true);
    expect(dialog().classList).not.toContain('is-tapping');
  });

  it('stores nothing on a preview', () => {
    stubMotion(false);
    renderJanuary({ preview: true });
    initHolidays(document, window);
    close().click();
    expect(localStorage.getItem(HOLIDAY_STORAGE_KEY)).toBeNull();
  });
});
