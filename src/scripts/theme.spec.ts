// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  initThemeSwitches,
  readStoredMode,
  resolveTheme,
  storeMode,
} from './theme';

const brokenStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('readStoredMode', () => {
  beforeEach(() => localStorage.clear());

  it('returns an explicit light or dark choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredMode(localStorage)).toBe('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readStoredMode(localStorage)).toBe('light');
  });

  it('falls back to system for nothing stored, junk or unusable storage', () => {
    expect(readStoredMode(localStorage)).toBe('system');
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    expect(readStoredMode(localStorage)).toBe('system');
    expect(readStoredMode(brokenStorage)).toBe('system');
    expect(readStoredMode(undefined)).toBe('system');
  });
});

describe('storeMode', () => {
  beforeEach(() => localStorage.clear());

  it('stores an explicit choice and clears the key for system', () => {
    storeMode(localStorage, 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    storeMode(localStorage, 'system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('does not throw when storage is unusable', () => {
    expect(() => storeMode(brokenStorage, 'dark')).not.toThrow();
  });
});

describe('resolveTheme', () => {
  it('follows the OS only in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('initThemeSwitches', () => {
  let osPrefersDark: boolean;
  let osListeners: ((event: { matches: boolean }) => void)[];

  function setOsTheme(dark: boolean) {
    osPrefersDark = dark;
    for (const listener of osListeners) listener({ matches: dark });
  }

  function radio(value: string): HTMLInputElement {
    return document.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
  }

  function choose(value: string) {
    radio(value).checked = true;
    radio(value).dispatchEvent(new Event('change'));
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    document.body.innerHTML = `
      <fieldset data-theme-switch>
        <input type="radio" name="theme" value="light" />
        <input type="radio" name="theme" value="dark" />
        <input type="radio" name="theme" value="system" checked />
      </fieldset>`;
    osPrefersDark = false;
    osListeners = [];
    // jsdom has no matchMedia; stub the OS dark-mode query.
    vi.stubGlobal(
      'matchMedia',
      () =>
        ({
          get matches() {
            return osPrefersDark;
          },
          addEventListener: (
            _type: string,
            listener: (event: { matches: boolean }) => void,
          ) => osListeners.push(listener),
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('checks the stored choice when the page loads', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    initThemeSwitches(document, window);
    expect(radio('dark').checked).toBe(true);
    expect(radio('system').checked).toBe(false);
  });

  it('applies and stores an explicit choice', () => {
    initThemeSwitches(document, window);
    choose('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('going back to Auto clears the stored choice and follows the OS', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    osPrefersDark = true;
    initThemeSwitches(document, window);
    choose('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('follows OS changes live in Auto mode only', () => {
    initThemeSwitches(document, window);
    setOsTheme(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    choose('light');
    setOsTheme(false);
    setOsTheme(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
