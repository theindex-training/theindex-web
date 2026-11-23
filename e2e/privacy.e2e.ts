import { expect, test } from '@playwright/test';
import { SITE_URL } from '../playwright.config';
import { t } from './support/i18n';

/**
 * The privacy policy (`/privacy`): Google's consent screen and the portal's consent checkboxes
 * link here, so it must render on its own address and be reachable from every page.
 */
test.describe('privacy policy', () => {
  test(
    'opens from the footer and names the controller',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto('/');

      await page
        .getByRole('contentinfo')
        .getByRole('navigation', { name: t('footer.links') })
        .getByRole('link', { name: t('footer.privacy') })
        .click();

      await expect(page).toHaveURL(/\/privacy$/);
      await expect(page).toHaveTitle(
        `${t('privacy.title')} | ${t('common.appName')}`,
      );
      await expect(
        page.getByRole('heading', { level: 1, name: t('privacy.title') }),
      ).toBeVisible();
      await expect(page.getByTestId('privacy-controller')).toHaveText(
        t('privacy.controller.text'),
      );
      await expect(
        page.getByRole('heading', {
          level: 2,
          name: t('privacy.rights.heading'),
        }),
      ).toBeVisible();
    },
  );

  test(
    'is indexable at its canonical address',
    { tag: '@desktop' },
    async ({ page }) => {
      const response = await page.goto('/privacy');
      expect(response?.status()).toBe(200);

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${SITE_URL}/privacy`,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        t('privacy.description'),
      );
    },
  );
});
