import { expect, test, type Page } from '@playwright/test';
import { SITE_URL } from '../playwright.config';
import {
  ARTICLES_NEWEST_FIRST,
  CATEGORIES,
  FAILING_QUERY,
  FAILING_SLUG,
  FULL_ARTICLE,
  UNSAFE_ARTICLE,
  WORKOUTS_COUNT,
} from './support/articles';
import { t } from './support/i18n';

/** What the page tells search engines: robots, canonical link and JSON-LD. */
async function readHead(page: Page) {
  return page.evaluate(() => ({
    robots:
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute('content') ?? null,
    canonical:
      document.head
        .querySelector('link[rel="canonical"]')
        ?.getAttribute('href') ?? null,
    jsonLd: Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
      (el) => JSON.parse(el.textContent ?? 'null') as Record<string, unknown>,
    ),
  }));
}

/** The titles of the article cards in a list, in order (each card's one link). */
const cardTitles = (page: Page, listName: string) =>
  page.getByRole('list', { name: listName, exact: true }).getByRole('link');

const titlesOf = (articles: readonly { title: string }[]) =>
  articles.map((a) => a.title);

const pagination = (page: Page) =>
  page.getByRole('navigation', { name: t('pagination.label') });

const workouts = ARTICLES_NEWEST_FIRST.filter((a) =>
  a.categories.some((c) => c.slug === 'trenirovki'),
);

test.describe('home page', () => {
  test(
    'features the newest article, lists the next six and links to all articles',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(t('common.appName'));
      await expect(
        page.getByRole('heading', { level: 1, name: t('home.heading') }),
      ).toBeVisible();

      const [newest, ...next] = ARTICLES_NEWEST_FIRST;
      expect(newest).toBe(FULL_ARTICLE);
      const featured = page.getByRole('region', { name: t('home.featured') });
      await expect(featured.getByRole('link')).toHaveText(newest.title);
      await expect(featured.getByRole('link')).toHaveAttribute(
        'href',
        `/articles/${newest.slug}`,
      );
      await expect(featured).toContainText('Начинаещи · Техника');
      await expect(featured).toContainText('2 ноември 2026 г.');
      // The largest image on screen loads at once.
      await expect(featured.getByRole('img')).toHaveAttribute(
        'fetchpriority',
        'high',
      );

      await expect(cardTitles(page, t('home.latest'))).toHaveText(
        titlesOf(next.slice(0, 6)),
      );

      await page.getByRole('link', { name: t('home.allArticles') }).click();
      await expect(page).toHaveURL('/articles');
    },
  );

  test(
    'opens an article from its card',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto('/');
      await page
        .getByRole('region', { name: t('home.featured') })
        .getByRole('link')
        .click();
      await expect(page).toHaveURL(`/articles/${FULL_ARTICLE.slug}`);
      await expect(
        page.getByRole('heading', { level: 1, name: FULL_ARTICLE.title }),
      ).toBeVisible();
    },
  );

  test(
    'describes the site with WebSite JSON-LD and a canonical link',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto('/');
      const { canonical, robots, jsonLd } = await readHead(page);
      expect(canonical).toBe(`${SITE_URL}/`);
      expect(robots).toBeNull();
      expect(jsonLd).toEqual([
        expect.objectContaining({
          '@type': 'WebSite',
          name: t('common.appName'),
          url: `${SITE_URL}/`,
          inLanguage: 'bg',
        }),
      ]);
    },
  );

  test(
    'shows titles from the API as text',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto('/');
      await expect(
        cardTitles(page, t('home.latest')).filter({
          hasText: UNSAFE_ARTICLE.title,
        }),
      ).toHaveCount(1);
      expect(
        await page.evaluate(() => (window as { pwned?: boolean }).pwned),
      ).toBeUndefined();
    },
  );
});

test.describe('header navigation', () => {
  test(
    'links to all articles and to every published category, in order',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto('/');
      const nav = page
        .getByRole('banner')
        .getByRole('navigation', { name: t('header.navLabel') });
      await expect(nav.getByRole('link')).toHaveText([
        t('header.articles'),
        ...CATEGORIES.map((c) => c.name),
      ]);

      await nav.getByRole('link', { name: 'Тренировки' }).click();
      await expect(page).toHaveURL('/articles/category/trenirovki');
      await expect(
        nav.getByRole('link', { name: 'Тренировки' }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        nav.getByRole('link', { name: t('header.articles') }),
      ).not.toHaveAttribute('aria-current');

      await nav.getByRole('link', { name: t('header.articles') }).click();
      await expect(page).toHaveURL('/articles');
      await expect(
        nav.getByRole('link', { name: t('header.articles') }),
      ).toHaveAttribute('aria-current', 'page');
    },
  );
});

test.describe('all articles', () => {
  test(
    'lists 12 articles a page, newest first, with previous and next links',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto('/articles');
      await expect(page).toHaveTitle(
        `${t('articles.title')} | ${t('common.appName')}`,
      );
      await expect(
        page.getByRole('heading', { level: 1, name: t('articles.title') }),
      ).toBeVisible();
      await expect(cardTitles(page, t('articles.listLabel'))).toHaveText(
        titlesOf(ARTICLES_NEWEST_FIRST.slice(0, 12)),
      );
      await expect(pagination(page)).toContainText(
        t('pagination.status', { page: 1, pages: 2 }),
      );
      await expect(
        pagination(page).getByRole('link', { name: t('pagination.previous') }),
      ).toHaveCount(0);

      await pagination(page)
        .getByRole('link', { name: t('pagination.next') })
        .click();
      await expect(page).toHaveURL('/articles?page=2');
      await expect(page).toHaveTitle(
        `${t('articles.pageTitle', { page: 2 })} | ${t('common.appName')}`,
      );
      await expect(cardTitles(page, t('articles.listLabel'))).toHaveText(
        titlesOf(ARTICLES_NEWEST_FIRST.slice(12)),
      );
      await expect(
        pagination(page).getByRole('link', { name: t('pagination.next') }),
      ).toHaveCount(0);

      await pagination(page)
        .getByRole('link', { name: t('pagination.previous') })
        .click();
      await expect(page).toHaveURL('/articles');
    },
  );

  test(
    'gives each page its own canonical URL and breadcrumbs',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto('/articles?page=2&utm_source=test');
      const { canonical, robots, jsonLd } = await readHead(page);
      expect(canonical).toBe(`${SITE_URL}/articles?page=2`);
      expect(robots).toBeNull();
      expect(jsonLd).toEqual([
        expect.objectContaining({
          '@type': 'BreadcrumbList',
          itemListElement: [
            expect.objectContaining({ name: t('breadcrumbs.home') }),
            expect.objectContaining({
              name: t('breadcrumbs.articles'),
              item: `${SITE_URL}/articles`,
            }),
          ],
        }),
      ]);

      await page.goto('/articles?page=1');
      expect((await readHead(page)).canonical).toBe(`${SITE_URL}/articles`);
    },
  );

  for (const [what, query] of [
    ['a page past the last one', 'page=3'],
    ['a page number with a leading zero', 'page=02'],
    ['a page that is not a number', 'page=abc'],
    ['page 0', 'page=0'],
    ['a page beyond the API limit', 'page=10001'],
  ]) {
    test(
      `answers ${what} with the 404 page`,
      { tag: '@desktop' },
      async ({ page }) => {
        const response = await page.goto(`/articles?${query}`);
        expect(response?.status()).toBe(404);
        await expect(
          page.getByRole('heading', { level: 1, name: t('notFound.title') }),
        ).toBeVisible();
      },
    );
  }

  test(
    'answers a failing API with an error that is not cached',
    { tag: '@desktop' },
    async ({ page }) => {
      const response = await page.goto(`/articles?q=${FAILING_QUERY}`);
      expect(response?.status()).toBe(500);
      // A bare 500 until item 14's 503 page; never marked cacheable.
      expect(response?.headers()['cache-control'] ?? '').not.toContain(
        'public',
      );
    },
  );
});

test.describe('search', () => {
  test(
    'finds articles by their text, kept out of search engines',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto('/articles');
      await page
        .getByRole('searchbox', { name: t('articles.search.label') })
        .fill('  ден 1 ');
      await page
        .getByRole('button', { name: t('articles.search.submit') })
        .click();

      await expect(page).toHaveURL(/\/articles\?q=/);
      expect(new URL(page.url()).searchParams.get('q')).toBe('  ден 1 ');
      await expect(page).toHaveTitle(
        `${t('articles.search.title', { q: 'ден 1' })} | ${t('common.appName')}`,
      );
      await expect(
        page.getByRole('searchbox', { name: t('articles.search.label') }),
      ).toHaveValue('ден 1');
      // Days 13, 12, 11, 10 and 1.
      await expect(
        page.getByText(t('articles.search.results', { count: 5, q: 'ден 1' })),
      ).toBeVisible();
      await expect(cardTitles(page, t('articles.listLabel'))).toHaveText([
        'Тренировка на деня 13',
        'Тренировка на деня 12',
        'Тренировка на деня 11',
        'Тренировка на деня 10',
        'Тренировка на деня 1',
      ]);
      await expect(pagination(page)).toHaveCount(0);

      const { robots, canonical, jsonLd } = await readHead(page);
      expect(robots).toBe('noindex, follow');
      expect(canonical).toBeNull();
      expect(jsonLd).toEqual([]);

      await page
        .getByRole('link', { name: t('articles.search.clear') })
        .click();
      await expect(page).toHaveURL('/articles');
      await expect(
        page.getByRole('searchbox', { name: t('articles.search.label') }),
      ).toHaveValue('');
    },
  );

  test(
    'keeps the search on every page of the results',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto(`/articles?q=${encodeURIComponent('НА ДЕНЯ')}`);
      await expect(
        page.getByText(
          t('articles.search.results', {
            count: WORKOUTS_COUNT,
            q: 'НА ДЕНЯ',
          }),
        ),
      ).toBeVisible();

      await pagination(page)
        .getByRole('link', { name: t('pagination.next') })
        .click();
      const url = new URL(page.url());
      expect(url.pathname).toBe('/articles');
      expect(url.searchParams.get('q')).toBe('НА ДЕНЯ');
      expect(url.searchParams.get('page')).toBe('2');
      await expect(cardTitles(page, t('articles.listLabel'))).toHaveText(
        titlesOf(workouts.slice(12)),
      );
    },
  );

  test(
    'says so when nothing matches',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      const response = await page.goto('/articles?q=несъществуваща');
      expect(response?.status()).toBe(200);
      await expect(
        page.getByText(t('articles.search.noResults', { q: 'несъществуваща' })),
      ).toBeVisible();
      await expect(
        page.getByRole('list', { name: t('articles.listLabel'), exact: true }),
      ).toHaveCount(0);
    },
  );

  test(
    'cuts a search longer than the API accepts instead of failing',
    { tag: '@desktop' },
    async ({ page }) => {
      const response = await page.goto(`/articles?q=${'а'.repeat(150)}`);
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole('searchbox', { name: t('articles.search.label') }),
      ).toHaveValue('а'.repeat(100));
    },
  );
});

test.describe('category page', () => {
  test(
    'shows the category and its articles, 12 a page',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      const response = await page.goto('/articles/category/trenirovki');
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`Тренировки | ${t('common.appName')}`);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Тренировки' }),
      ).toBeVisible();
      await expect(
        page.getByText('Тренировката на деня с бележки от треньорите.'),
      ).toBeVisible();
      await expect(
        page.getByText(t('category.count', { count: WORKOUTS_COUNT })),
      ).toBeVisible();

      const listName = t('category.listLabel', { name: 'Тренировки' });
      await expect(cardTitles(page, listName)).toHaveText(
        titlesOf(workouts.slice(0, 12)),
      );

      await pagination(page)
        .getByRole('link', { name: t('pagination.next') })
        .click();
      await expect(page).toHaveURL('/articles/category/trenirovki?page=2');
      await expect(page).toHaveTitle(
        `${t('category.pageTitle', { name: 'Тренировки', page: 2 })} | ${t('common.appName')}`,
      );
      await expect(cardTitles(page, listName)).toHaveText(
        titlesOf(workouts.slice(12)),
      );
    },
  );

  test(
    'falls back to a description of its own and has a canonical URL and breadcrumbs',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto('/articles/category/tehnika');
      await expect(
        page.getByText(t('category.count', { count: 1 })),
      ).toBeVisible();
      const description = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(description).toBe(t('category.description', { name: 'Техника' }));

      const { canonical, jsonLd } = await readHead(page);
      expect(canonical).toBe(`${SITE_URL}/articles/category/tehnika`);
      expect(jsonLd).toEqual([
        expect.objectContaining({
          '@type': 'BreadcrumbList',
          itemListElement: [
            expect.objectContaining({ position: 1 }),
            expect.objectContaining({ position: 2 }),
            expect.objectContaining({
              position: 3,
              name: 'Техника',
              item: `${SITE_URL}/articles/category/tehnika`,
            }),
          ],
        }),
      ]);
    },
  );

  test(
    'is reached from the categories on an article',
    { tag: '@mobile' },
    async ({ page }) => {
      await page.goto(`/articles/${FULL_ARTICLE.slug}`);
      await page
        .getByRole('article')
        .getByRole('list', { name: t('article.categories') })
        .getByRole('link', { name: 'Начинаещи' })
        .click();
      await expect(page).toHaveURL('/articles/category/nachinaeshti');
      await expect(
        cardTitles(page, t('category.listLabel', { name: 'Начинаещи' })),
      ).toHaveText([FULL_ARTICLE.title]);
    },
  );

  for (const [what, path] of [
    ['an unknown category', '/articles/category/nyama-takava'],
    ['a path that cannot be a slug', '/articles/category/Тренировки'],
    ['a page past the last one', '/articles/category/trenirovki?page=3'],
    ['/articles/category itself', '/articles/category'],
  ]) {
    test(
      `answers ${what} with the 404 page`,
      { tag: '@desktop' },
      async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
      },
    );
  }

  test(
    'answers a failing API with an error that is not cached',
    { tag: '@desktop' },
    async ({ page }) => {
      const response = await page.goto(`/articles/category/${FAILING_SLUG}`);
      expect(response?.status()).toBe(500);
      // A bare 500 until item 14's 503 page; never marked cacheable.
      expect(response?.headers()['cache-control'] ?? '').not.toContain(
        'public',
      );
    },
  );
});
