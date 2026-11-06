import { expect, test, type Page } from '@playwright/test';
import { APP_URL } from '../playwright.config';
import { t } from './support/i18n';

const themeGroup = (page: Page) =>
  page.getByRole('group', { name: t('common.theme.label') });

async function chooseTheme(page: Page, key: string) {
  await themeGroup(page).getByText(t(key), { exact: true }).click();
}

test.describe('page shell', () => {
  test(
    'renders the header, the page and the footer in Bulgarian',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'bg');
      await expect(page).toHaveTitle(
        `${t('home.title')} | ${t('common.appName')}`,
      );
      await expect(
        page.getByRole('heading', { level: 1, name: t('home.title') }),
      ).toBeVisible();

      const banner = page.getByRole('banner');
      await expect(
        banner.getByRole('link', { name: t('header.homeLink') }),
      ).toHaveAttribute('href', '/');
      // "Вход" leads to the back office, wherever APP_URL points.
      await expect(
        banner.getByRole('link', { name: t('header.login') }),
      ).toHaveAttribute('href', APP_URL);

      await expect(page.getByRole('contentinfo')).toContainText(
        t('footer.copyright', { year: String(new Date().getFullYear()) }),
      );
    },
  );

  test(
    'sends the page cache and security headers',
    { tag: '@desktop' },
    async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      const headers = response?.headers() ?? {};
      expect(headers['cache-control']).toBe(
        'public, max-age=60, stale-while-revalidate=300',
      );
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
    },
  );

  test(
    'the skip link is the first tab stop and moves focus to the content',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto('/');
      await page.keyboard.press('Tab');

      const skipLink = page.getByRole('link', {
        name: t('common.skipToContent'),
      });
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeInViewport();

      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
    },
  );

  test(
    'has no horizontal scroll on a 320px phone',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    },
  );
});

test.describe('theme switch', () => {
  test(
    'follows the OS by default, live',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');

      await expect(
        page.getByRole('radio', { name: t('common.theme.system') }),
      ).toBeChecked();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      await page.emulateMedia({ colorScheme: 'light' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    },
  );

  test(
    'keeps an explicit choice across reloads, until Auto is chosen again',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto('/');

      await chooseTheme(page, 'common.theme.dark');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(
        page.getByRole('radio', { name: t('common.theme.dark') }),
      ).toBeChecked();

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(
        page.getByRole('radio', { name: t('common.theme.dark') }),
      ).toBeChecked();

      await chooseTheme(page, 'common.theme.system');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      expect(
        await page.evaluate(() => localStorage.getItem('theme')),
      ).toBeNull();
    },
  );

  test(
    'applies the stored theme before the page is painted',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark');
        // Record the theme as soon as the parser creates <body>, before anything is painted
        // and before the (deferred) theme switch module runs.
        const observer = new MutationObserver(() => {
          if (!document.body) return;
          document.documentElement.dataset['themeAtBody'] =
            document.documentElement.getAttribute('data-theme') ?? 'none';
          observer.disconnect();
        });
        observer.observe(document, { childList: true, subtree: true });
      });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme-at-body',
        'dark',
      );
    },
  );
});

test.describe('not found', () => {
  test(
    'answers unknown URLs with a 404 page that links home',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      const response = await page.goto('/no-such-page');
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(
        `${t('notFound.title')} | ${t('common.appName')}`,
      );
      await expect(
        page.getByRole('heading', { level: 1, name: t('notFound.title') }),
      ).toBeVisible();

      await page.getByRole('link', { name: t('notFound.back') }).click();
      await expect(page).toHaveURL('/');
    },
  );
});
