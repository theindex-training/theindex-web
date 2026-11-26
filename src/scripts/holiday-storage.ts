/**
 * The holidays' pre-paint script, inlined in BaseLayout.astro's <head> (as a string, so it runs
 * before the first paint without a module; `holiday-storage.spec.ts` runs the same text):
 * - outside the season (no `data-holiday-season`) or for another season, the `holidays` storage
 *   key is deleted, so nothing is kept past the holidays;
 * - when the effects were switched off this season, `data-holiday-snow` is removed, so the snow
 *   caps never show;
 * - a `?holidayDate=` preview (`data-holiday-preview`, any valid day, in the season or not)
 *   neither reads nor changes it.
 * Same key and shape as src/scripts/holidays.ts and the portal's HolidayService.
 */
export const HOLIDAY_STORAGE_SCRIPT = `(function () {
  var root = document.documentElement;
  if (root.hasAttribute('data-holiday-preview')) return;
  var season = Number(root.getAttribute('data-holiday-season')) || 0;
  try {
    var stored = JSON.parse(localStorage.getItem('holidays') || 'null');
    if (stored && (!season || stored.season !== season)) {
      localStorage.removeItem('holidays');
    } else if (stored && stored.effects === false) {
      root.removeAttribute('data-holiday-snow');
    }
  } catch (e) {
    try {
      localStorage.removeItem('holidays');
    } catch (e2) {}
  }
})();`;
