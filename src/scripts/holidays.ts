import { Snowfall } from './snowfall';

/**
 * The holidays in the browser: the falling snow and the "Празнични ефекти" switch in the footer.
 * The server decides what is on (lib/holidays.ts) and marks <html>:
 * - `data-holiday-season="2026"` from Dec 1 to Jan 10,
 * - `data-holiday-december` while it snows (Dec 1 – Jan 6),
 * - `data-holiday-snow` for the snow caps (removed before the first paint when the person
 *   switched the effects off, by the inline script in BaseLayout.astro),
 * - `data-holiday-preview` on a `?holidayDate=` preview, which stores nothing.
 *
 * The same storage as the portal's HolidayService (theindex-front): one key, `holidays`, holding
 * `{ season, effects?: false }`, never read for another season and deleted outside the season.
 */
export const HOLIDAY_STORAGE_KEY = 'holidays';

/** December's snowfall is light, as in the portal. */
const DECEMBER_INTENSITY = 0.6;

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

/** Whether the person kept the effects on this season (on unless they switched them off). */
export function readEffectsOn(
  storage: ReadableStorage | undefined,
  season: number,
): boolean {
  try {
    const stored: unknown = JSON.parse(
      storage?.getItem(HOLIDAY_STORAGE_KEY) ?? 'null',
    );
    const value = stored as { season?: unknown; effects?: unknown } | null;
    return !(value?.season === season && value.effects === false);
  } catch {
    return true;
  }
}

/** Remembers the switch for the season; on is the default, so it is stored only when off. */
export function storeEffects(
  storage: WritableStorage | undefined,
  season: number,
  on: boolean,
): void {
  try {
    if (on) storage?.removeItem(HOLIDAY_STORAGE_KEY);
    else
      storage?.setItem(
        HOLIDAY_STORAGE_KEY,
        JSON.stringify({ season, effects: false }),
      );
  } catch {
    // Without storage the choice lasts for this visit only.
  }
}

function safeStorage(win: Window): Storage | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Starts the snow (unless the effects are off or the OS asks for less motion) and wires the
 * footer switch (`[data-holiday-switch]`, hidden until this runs, since it needs JavaScript).
 */
export function initHolidays(doc: Document, win: Window): void {
  const root = doc.documentElement;
  const season = Number(root.getAttribute('data-holiday-season'));
  if (!season || !root.hasAttribute('data-holiday-december')) return;
  const storage = root.hasAttribute('data-holiday-preview')
    ? undefined
    : safeStorage(win);
  const reducedMotion =
    win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const canvas = doc.querySelector<HTMLCanvasElement>(
    '[data-holiday-snow-canvas]',
  );
  let snowfall: Snowfall | null = null;

  const apply = (on: boolean) => {
    root.toggleAttribute('data-holiday-snow', on);
    const falling = on && !reducedMotion && !!canvas;
    if (canvas) canvas.hidden = !falling;
    if (falling) {
      snowfall ??= new Snowfall(canvas, win);
      snowfall.setIntensity(DECEMBER_INTENSITY);
    } else {
      snowfall?.setIntensity(0);
    }
  };

  let on = readEffectsOn(storage, season);
  const switches = Array.from(
    doc.querySelectorAll<HTMLInputElement>('input[data-holiday-switch]'),
  );
  for (const input of switches) {
    input.checked = on;
    input
      .closest<HTMLElement>('[data-holiday-switch-field]')
      ?.removeAttribute('hidden');
    input.addEventListener('change', () => {
      on = input.checked;
      storeEffects(storage, season, on);
      for (const other of switches) other.checked = on;
      apply(on);
    });
  }
  apply(on);
}
