/**
 * Light / dark / system theme, the same model as the portal's ThemeService
 * (theindex-front/src/app/services/theme.service.ts):
 * - `system` (the default) follows `prefers-color-scheme`, live.
 * - An explicit choice is stored in localStorage under `theme`; choosing `system` clears it.
 * - The theme is applied as `data-theme="light|dark"` (and `color-scheme`) on <html>.
 *
 * The inline script in BaseLayout.astro applies the stored theme before the first paint; keep its
 * key and values in sync with this file.
 */
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

export function readStoredMode(
  storage: ReadableStorage | undefined,
): ThemeMode {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return 'system';
  }
}

export function storeMode(
  storage: WritableStorage | undefined,
  mode: ThemeMode,
): void {
  try {
    if (mode === 'system') storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Without storage the choice lasts for this visit only.
  }
}

export function resolveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

export function applyTheme(root: HTMLElement, theme: ResolvedTheme): void {
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

function isThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function safeStorage(win: Window): Storage | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Wires every theme switch on the page (radios with `data-theme-switch` on their fieldset):
 * checks the stored mode, applies a new choice, and follows the OS while the mode is `system`.
 */
export function initThemeSwitches(doc: Document, win: Window): void {
  const storage = safeStorage(win);
  const media = win.matchMedia?.(DARK_QUERY);
  let mode = readStoredMode(storage);

  const radios = Array.from(
    doc.querySelectorAll<HTMLInputElement>(
      '[data-theme-switch] input[type="radio"]',
    ),
  );
  const syncRadios = () => {
    for (const radio of radios) radio.checked = radio.value === mode;
  };

  syncRadios();
  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (!radio.checked || !isThemeMode(radio.value)) return;
      mode = radio.value;
      storeMode(storage, mode);
      applyTheme(
        doc.documentElement,
        resolveTheme(mode, media?.matches ?? false),
      );
      syncRadios();
    });
  }

  // resolveTheme() ignores the OS for an explicit choice, so only Auto follows these changes.
  media?.addEventListener('change', (event) =>
    applyTheme(doc.documentElement, resolveTheme(mode, event.matches)),
  );
}
