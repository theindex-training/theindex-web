import { expect, test, type Page } from '@playwright/test';
import { APP_URL } from '../playwright.config';
import { t } from './support/i18n';

/**
 * The holidays: from Dec 1 it snows (with a footer switch to stop it) and members are pointed to
 * the app's Advent calendar. The server decides from the Sofia date, so these journeys pick the
 * day with `?holidayDate=` (a preview, which stores nothing).
 */
const stored = (page: Page) =>
  page.evaluate(() => localStorage.getItem('holidays'));
const effects = (page: Page) =>
  page
    .getByRole('contentinfo')
    .getByRole('switch', { name: t('holidays.effects') });

test.describe('holidays', () => {
  test(
    'in December it snows, members are pointed to the Advent calendar, and the snow can be stopped',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto('/?holidayDate=2026-12-12');

      const teaser = page.getByRole('complementary', {
        name: t('holidays.advent.label'),
      });
      await expect(teaser).toContainText(t('holidays.advent.text'));
      await expect(
        teaser.getByRole('link', { name: t('holidays.advent.open') }),
      ).toHaveAttribute('href', APP_URL);

      await expect(page.getByTestId('holiday-snow')).toBeVisible();
      await expect(effects(page)).toBeChecked();
      await effects(page).uncheck();
      await expect(page.getByTestId('holiday-snow')).toBeHidden();
      // A preview stores nothing.
      expect(await stored(page)).toBeNull();
    },
  );

  test(
    'outside December nothing shows, and the holidays’ storage is deleted',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.addInitScript(() => {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem(
            'holidays',
            JSON.stringify({ season: 2026, effects: false }),
          );
          sessionStorage.setItem('seeded', '1');
        }
      });
      await page.goto('/?holidayDate=2027-01-11');

      await expect(
        page.getByRole('heading', { level: 1, name: t('home.heading') }),
      ).toBeVisible();
      await expect(page.getByTestId('advent-teaser')).toHaveCount(0);
      await expect(page.getByTestId('holiday-snow')).toHaveCount(0);
      await expect(effects(page)).toHaveCount(0);
      expect(await stored(page)).toBeNull();
    },
  );
});
