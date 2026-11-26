import { Snowfall } from './snowfall';

/**
 * The holidays in the browser: the falling snow and the "Празнични ефекти" switch in the footer.
 * The server decides what is on (lib/holidays.ts) and marks <html>:
 * - `data-holiday-season="2026"` from Dec 1 to Jan 10,
 * - `data-holiday-december` while it snows (Dec 1 – Jan 6), and `data-holiday-christmas`
 *   (Dec 20 – 27), when it snows harder,
 * - `data-holiday-snow` for the snow caps (removed before the first paint when the person
 *   switched the effects off, by the inline script in BaseLayout.astro),
 * - `data-holiday-preview` on a `?holidayDate=` preview, which stores nothing.
 *
 * - `data-holiday-new-year` (Dec 31 – Jan 2: the fireworks show, once a day) and
 *   `data-holiday-survachka` (Jan 1 – 6: the сурвачка's wish), with `data-holiday-day`.
 *
 * The same storage as the portal's HolidayService (theindex-front): one key, `holidays`, holding
 * `{ season, effects?: false, show?, survachka? }`, never read for another season and deleted
 * outside the season.
 */
export const HOLIDAY_STORAGE_KEY = 'holidays';

/** December's snowfall is light, heavier over Christmas, as in the portal. */
const DECEMBER_INTENSITY = 0.6;
const CHRISTMAS_INTENSITY = 1;

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;
type HolidayStorage = ReadableStorage & WritableStorage;

/** What the site keeps for the season (the portal keeps more under the same key on its own origin). */
export interface StoredHolidays {
  season: number;
  /** Present (false) only when the person switched the effects off. */
  effects?: false;
  /** The last day ('YYYY-MM-DD') the New Year's fireworks show played. */
  show?: string;
  /** The сурвачка's wish was seen (it opens by itself once a season). */
  survachka?: true;
}

/** The season's stored value; a fresh one when there is none, it is another season's or unreadable. */
export function readStored(
  storage: ReadableStorage | undefined,
  season: number,
): StoredHolidays {
  try {
    const value = JSON.parse(
      storage?.getItem(HOLIDAY_STORAGE_KEY) ?? 'null',
    ) as Partial<StoredHolidays> | null;
    return value?.season === season ? (value as StoredHolidays) : { season };
  } catch {
    return { season };
  }
}

/** Stores the value; with nothing in it but the season, deletes the key. */
export function writeStored(
  storage: WritableStorage | undefined,
  value: StoredHolidays,
): void {
  try {
    if (Object.keys(value).length === 1) {
      storage?.removeItem(HOLIDAY_STORAGE_KEY);
    } else {
      storage?.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    // Without storage the choice lasts for this visit only.
  }
}

/** Whether the person kept the effects on this season (on unless they switched them off). */
export function readEffectsOn(
  storage: ReadableStorage | undefined,
  season: number,
): boolean {
  return readStored(storage, season).effects !== false;
}

/** Remembers the switch for the season; on is the default, so only off is stored. */
export function storeEffects(
  storage: HolidayStorage | undefined,
  season: number,
  on: boolean,
): void {
  const next = { ...readStored(storage, season) };
  if (on) delete next.effects;
  else next.effects = false;
  writeStored(storage, next);
}

/**
 * Whether the New Year's fireworks show plays today: once a day. Answering yes remembers the day.
 * Without storage (a preview) it plays on every page.
 */
export function takeFireworksShow(
  storage: HolidayStorage | undefined,
  season: number,
  day: string,
): boolean {
  const stored = readStored(storage, season);
  if (stored.show === day) return false;
  writeStored(storage, { ...stored, show: day });
  return true;
}

function safeStorage(win: Window): Storage | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Starts the snow (unless the effects are off or the OS asks for less motion), wires the footer
 * switch (`[data-holiday-switch]`, hidden until this runs, since it needs JavaScript) and, at New
 * Year, the fireworks and the сурвачка's wish.
 */
export function initHolidays(doc: Document, win: Window): void {
  const root = doc.documentElement;
  const season = Number(root.getAttribute('data-holiday-season'));
  if (!season || !root.hasAttribute('data-holiday-december')) return;
  const storage = root.hasAttribute('data-holiday-preview')
    ? undefined
    : safeStorage(win);
  const day = root.getAttribute('data-holiday-day') ?? '';
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
      snowfall.setIntensity(
        root.hasAttribute('data-holiday-christmas')
          ? CHRISTMAS_INTENSITY
          : DECEMBER_INTENSITY,
      );
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

  // New Year (Dec 31 – Jan 2): the day's show, once the сурвачка's wish (if it opens) is closed.
  const playShow = () => {
    if (
      root.hasAttribute('data-holiday-new-year') &&
      on &&
      snowfall &&
      takeFireworksShow(storage, season, day)
    ) {
      snowfall.show();
    }
  };
  if (!initSurvachka(doc, storage, season, reducedMotion, playShow)) {
    playShow();
  }
}

/**
 * Jan 1 – 6: opens the сурвачка's wish by itself the first time this season (effects on or off:
 * it is a greeting), and from the сурвачка by the logo. Closing it remembers it was seen and calls
 * `closed`. Answers whether the wish opened by itself now.
 */
function initSurvachka(
  doc: Document,
  storage: HolidayStorage | undefined,
  season: number,
  reducedMotion: boolean,
  closed: () => void,
): boolean {
  const dialog = doc.querySelector<HTMLDialogElement>(
    '[data-survachka-dialog]',
  );
  if (!dialog || !doc.documentElement.hasAttribute('data-holiday-survachka')) {
    return false;
  }
  const open = () => {
    if (dialog.open) return;
    dialog.classList.toggle('is-tapping', !reducedMotion);
    dialog.showModal();
    // showModal() focuses the button at the end, which scrolls a tall wish down on a short
    // screen: start at the top, where the сурвачка taps the logo.
    dialog.scrollTop = 0;
  };
  dialog.addEventListener('close', () => {
    dialog.classList.remove('is-tapping');
    const stored = readStored(storage, season);
    if (!stored.survachka) writeStored(storage, { ...stored, survachka: true });
    closed();
  });
  dialog.addEventListener('click', (event) => {
    // A click on the backdrop (the dialog element itself) closes it.
    if (event.target === dialog) dialog.close();
  });
  dialog
    .querySelector('[data-survachka-close]')
    ?.addEventListener('click', () => dialog.close());
  for (const button of doc.querySelectorAll<HTMLButtonElement>(
    '[data-survachka-open]',
  )) {
    button.hidden = false;
    button.addEventListener('click', open);
  }
  if (readStored(storage, season).survachka) return false;
  open();
  return true;
}
