import { expect, test, type Page } from '@playwright/test';
import { APP_URL } from '../playwright.config';
import {
  DRAFT_PREVIEW,
  FULL_ARTICLE,
  PREVIEW_TOKENS,
  PUBLISHED_PREVIEW,
} from './support/articles';
import { t } from './support/i18n';

const previewUrl = (token: string) =>
  `/preview?token=${encodeURIComponent(token)}`;

const robotsMeta = (page: Page) =>
  page.evaluate(
    () =>
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute('content') ?? null,
  );

test.describe('draft preview', () => {
  test(
    'shows the draft like the article page, marked as a preview, never cached or indexed',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      const response = await page.goto(previewUrl(PREVIEW_TOKENS.draft));
      expect(response?.status()).toBe(200);
      const headers = response?.headers() ?? {};
      expect(headers['cache-control']).toBe('no-store');
      expect(headers['x-robots-tag']).toBe('noindex');
      expect(await robotsMeta(page)).toBe('noindex, follow');
      await expect(page).toHaveTitle(
        `${t('preview.title', { title: DRAFT_PREVIEW.title })} | ${t('common.appName')}`,
      );
      expect(
        await page.evaluate(
          () => document.head.querySelector('link[rel="canonical"]') === null,
        ),
      ).toBe(true);

      const main = page.getByRole('main');
      await expect(main.getByText(t('preview.notice'))).toBeVisible();
      await expect(main.getByText(t('preview.hidden'))).toBeVisible();
      await expect(
        main.getByText(
          t('preview.statusLine', { status: t('preview.status.draft') }),
        ),
      ).toBeVisible();
      // Saved at 22:05 UTC on 8 November: already 9 November in Sofia.
      await expect(
        main.getByText(
          t('preview.saved', { date: '9 ноември 2026 г. в 00:05' }),
        ),
      ).toBeVisible();

      await expect(
        main.getByRole('heading', { level: 1, name: DRAFT_PREVIEW.title }),
      ).toBeVisible();
      await expect(
        main.getByRole('img', { name: DRAFT_PREVIEW.featuredImage?.altText }),
      ).toBeVisible();
      await expect(
        main.getByRole('heading', { level: 2, name: 'Дълбочина' }),
      ).toBeVisible();
      await expect(
        main.getByRole('list', { name: t('article.categories') }),
      ).toContainText('Техника');
      // Never published: no publish date, and no link to a live version.
      await expect(
        page.getByRole('article').getByText(/\d{4} г\./),
      ).toHaveCount(0);
      await expect(
        main.getByRole('link', { name: t('preview.viewPublished') }),
      ).toHaveCount(0);
    },
  );

  test(
    'links a published article’s draft to the live version',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto(previewUrl(PREVIEW_TOKENS.published));
      const main = page.getByRole('main');
      await expect(
        main.getByText(
          t('preview.statusLine', { status: t('preview.status.published') }),
        ),
      ).toBeVisible();
      await expect(
        main.getByRole('heading', { level: 1, name: PUBLISHED_PREVIEW.title }),
      ).toBeVisible();
      await expect(
        main.getByRole('link', { name: t('preview.viewPublished') }),
      ).toHaveAttribute('href', `/articles/${FULL_ARTICLE.slug}`);
    },
  );

  test(
    'names a draft whose title was cleared',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto(previewUrl(PREVIEW_TOKENS.untitled));
      await expect(
        page.getByRole('heading', { level: 1, name: t('preview.untitled') }),
      ).toBeVisible();
    },
  );

  for (const [name, token] of [
    ['an expired or forged token', PREVIEW_TOKENS.expired],
    ['no token', ''],
  ] as const) {
    test(
      `explains ${name} and links back to the back office`,
      { tag: '@desktop' },
      async ({ page }) => {
        const response = await page.goto(
          token ? previewUrl(token) : '/preview',
        );
        expect(response?.status()).toBe(403);
        expect(response?.headers()['cache-control']).toBe('no-store');
        expect(response?.headers()['x-robots-tag']).toBe('noindex');
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: t('preview.invalid.title'),
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('main').getByRole('link', {
            name: t('preview.backOffice'),
          }),
        ).toHaveAttribute('href', `${APP_URL}/content/articles`);
      },
    );
  }

  test(
    'says when the article has been deleted since',
    { tag: '@desktop' },
    async ({ page }) => {
      const response = await page.goto(previewUrl(PREVIEW_TOKENS.deleted));
      expect(response?.status()).toBe(404);
      expect(response?.headers()['cache-control']).toBe('no-store');
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: t('preview.deleted.title'),
        }),
      ).toBeVisible();
    },
  );
});
