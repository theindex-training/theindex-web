import { expect, test } from '@playwright/test';
import {
  FAILING_QUERY,
  FAILING_SLUG,
  PREVIEW_TOKENS,
} from './support/articles';
import { t } from './support/i18n';

test.describe('API unavailable', () => {
  for (const path of [
    `/articles/${FAILING_SLUG}`,
    `/articles/category/${FAILING_SLUG}`,
    `/articles?q=${FAILING_QUERY}&page=2`,
    `/preview?token=${PREVIEW_TOKENS.failing}`,
  ]) {
    test(
      `answers ${path} with the 503 page, not cached, with a way to try again`,
      { tag: '@desktop' },
      async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(503);
        const headers = response?.headers() ?? {};
        expect(headers['cache-control']).toBe('no-store');
        expect(headers['retry-after']).toBe('60');

        await expect(
          page.getByRole('heading', {
            level: 1,
            name: t('unavailable.title'),
          }),
        ).toBeVisible();
        await expect(page.getByText(t('unavailable.text'))).toBeVisible();
        // The same address again, query string included.
        await expect(
          page
            .getByRole('main')
            .getByRole('link', { name: t('unavailable.retry') }),
        ).toHaveAttribute('href', path);
        // The header doesn't wait for the API it knows is down: only "Статии".
        await expect(
          page
            .getByRole('navigation', { name: t('header.navLabel') })
            .getByRole('link'),
        ).toHaveText([t('header.articles')]);
      },
    );
  }

  test('has no address of its own', { tag: '@desktop' }, async ({ page }) => {
    const response = await page.goto('/503');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: t('notFound.title') }),
    ).toBeVisible();
  });
});
