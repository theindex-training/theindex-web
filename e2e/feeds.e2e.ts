import { expect, test } from '@playwright/test';
import { APP_URL, SITE_URL } from '../playwright.config';
import {
  ARTICLES,
  ARTICLES_NEWEST_FIRST,
  CATEGORIES,
  FULL_ARTICLE,
} from './support/articles';
import { t } from './support/i18n';

const PAGE_CACHE = 'public, max-age=60, stale-while-revalidate=300';

const ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&',
};

/**
 * The text of every `<name>` element in an XML document, in order, with entities decoded as a
 * feed reader would. Markup inside an element (unescaped `<`) would end the match early.
 */
function elements(xml: string, name: string): string[] {
  return Array.from(
    xml.matchAll(new RegExp(`<${name}(?: [^>]*)?>([^<]*)</${name}>`, 'g')),
    (match) =>
      match[1].replace(/&(?:lt|gt|quot|apos|amp);/g, (e) => ENTITIES[e]),
  );
}

test.describe('sitemap.xml', () => {
  test(
    'lists the home page, the article list, every article and every category',
    { tag: '@desktop' },
    async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe(
        'application/xml; charset=utf-8',
      );
      expect(response.headers()['cache-control']).toBe(PAGE_CACHE);

      const xml = await response.text();
      expect(xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(elements(xml, 'loc')).toEqual([
        `${SITE_URL}/`,
        `${SITE_URL}/articles`,
        ...ARTICLES_NEWEST_FIRST.map((a) => `${SITE_URL}/articles/${a.slug}`),
        ...CATEGORIES.map((c) => `${SITE_URL}/articles/category/${c.slug}`),
      ]);
      // An article's lastmod is its last publish; the lists changed with the latest of those.
      expect(xml).toContain(
        `<loc>${SITE_URL}/articles/${FULL_ARTICLE.slug}</loc><lastmod>${FULL_ARTICLE.updatedAt}</lastmod>`,
      );
      const latest = ARTICLES.map((a) => a.updatedAt)
        .sort()
        .at(-1);
      expect(xml).toContain(
        `<loc>${SITE_URL}/</loc><lastmod>${latest}</lastmod>`,
      );
    },
  );
});

test.describe('rss.xml', () => {
  test(
    'lists the newest articles with their addresses, dates and excerpts',
    { tag: '@desktop' },
    async ({ request }) => {
      const response = await request.get('/rss.xml');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe(
        'application/rss+xml; charset=utf-8',
      );
      expect(response.headers()['cache-control']).toBe(PAGE_CACHE);

      const xml = await response.text();
      // The stub has 16 articles: all of them, so the feed asks for more than the API's default
      // page of 12 (it asks for 20).
      const newest = ARTICLES_NEWEST_FIRST;
      expect(newest.length).toBeGreaterThan(12);
      expect(newest.length).toBeLessThanOrEqual(20);
      expect(elements(xml, 'guid')).toEqual(
        newest.map((a) => `${SITE_URL}/articles/${a.slug}`),
      );
      // The channel's title, then one per item.
      expect(elements(xml, 'title')).toEqual([
        t('common.appName'),
        ...newest.map((a) => a.title),
      ]);
      expect(xml).toContain(`<language>bg</language>`);
      expect(xml).toContain(
        `<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`,
      );

      const full = xml.slice(xml.indexOf(`<title>${FULL_ARTICLE.title}`));
      const item = full.slice(0, full.indexOf('</item>'));
      expect(elements(item, 'pubDate')).toEqual([
        new Date(FULL_ARTICLE.publishedAt).toUTCString(),
      ]);
      expect(elements(item, 'description')).toEqual([FULL_ARTICLE.excerpt]);
      expect(elements(item, 'category')).toEqual(
        FULL_ARTICLE.categories.map((c) => c.name),
      );
    },
  );

  test(
    'every page points feed readers at it',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto('/');
      const feed = await page.evaluate(() =>
        document.head
          .querySelector('link[rel="alternate"][type="application/rss+xml"]')
          ?.getAttribute('href'),
      );
      expect(feed).toBe(`${SITE_URL}/rss.xml`);
    },
  );
});

test.describe('robots.txt', () => {
  test(
    'lets crawlers in and gives the sitemap at SITE_URL',
    { tag: '@desktop' },
    async ({ request }) => {
      const response = await request.get('/robots.txt');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(await response.text()).toBe(
        `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      );
    },
  );
});

test.describe('/login', () => {
  test(
    'moves permanently to the back office login',
    { tag: '@desktop' },
    async ({ request }) => {
      const response = await request.get('/login', { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers()['location']).toBe(`${APP_URL}/login`);
    },
  );
});
