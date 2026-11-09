import { expect, test, type Page } from '@playwright/test';
import { SITE_URL } from '../playwright.config';
import {
  BLOCK_IMAGE,
  FEATURED_IMAGE,
  FULL_ARTICLE,
  PLAIN_ARTICLE,
  SECOND_VIDEO_ID,
  UNSAFE_ARTICLE,
  VIDEO_ID,
} from './support/articles';
import { t } from './support/i18n';

const articleUrl = (slug: string) => `/articles/${slug}`;

/** What the page tells search engines and link previews: meta tags, canonical link, JSON-LD. */
async function readHead(page: Page) {
  return page.evaluate(() => {
    const meta: Record<string, string[]> = {};
    for (const el of document.head.querySelectorAll('meta')) {
      const key = el.getAttribute('property') ?? el.getAttribute('name');
      if (key) (meta[key] ??= []).push(el.getAttribute('content') ?? '');
    }
    return {
      meta,
      canonical:
        document.head
          .querySelector('link[rel="canonical"]')
          ?.getAttribute('href') ?? null,
      jsonLd: Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
        (el) => JSON.parse(el.textContent ?? 'null') as Record<string, unknown>,
      ),
    };
  });
}

/**
 * Answers YouTube's hosts in the browser (the journeys never reach the internet) and records
 * which of them the page asked for.
 */
async function stubYoutube(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(
    /^https:\/\/(www\.youtube-nocookie\.com|www\.youtube\.com|i\.ytimg\.com)\//,
    (route) => {
      requested.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<p>Player</p>',
      });
    },
  );
  return requested;
}

test.describe('article page', () => {
  test(
    'shows the title, categories, byline, dates and every kind of block',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await stubYoutube(page);
      const response = await page.goto(articleUrl(FULL_ARTICLE.slug));
      expect(response?.status()).toBe(200);

      await expect(page).toHaveTitle(
        `${FULL_ARTICLE.seoTitle} | ${t('common.appName')}`,
      );
      const article = page.getByRole('article');
      await expect(
        article.getByRole('heading', { level: 1, name: FULL_ARTICLE.title }),
      ).toBeVisible();

      // Categories link to their pages (backlog item 13).
      const categories = article.getByRole('list', {
        name: t('article.categories'),
      });
      await expect(categories.getByRole('link')).toHaveText([
        'Начинаещи',
        'Техника',
      ]);
      await expect(
        categories.getByRole('link', { name: 'Техника' }),
      ).toHaveAttribute('href', '/articles/category/tehnika');

      // A fixed byline (D11), the first publish and the last update, as Sofia dates.
      await expect(article.getByText(t('article.byline'))).toBeVisible();
      await expect(article.getByText('2 ноември 2026 г.')).toHaveAttribute(
        'datetime',
        FULL_ARTICLE.publishedAt,
      );
      await expect(
        article.getByText(t('article.updated', { date: '5 ноември 2026 г.' })),
      ).toHaveAttribute('datetime', FULL_ARTICLE.updatedAt);

      // Paragraph with bold, italic and a link.
      await expect(
        article.getByRole('link', { name: 'ръководството' }),
      ).toHaveAttribute('href', 'https://example.com/guide');
      // Stored as <b> and <i>, shown as <strong> and <em>.
      await expect(article.getByRole('strong')).toHaveText(['най-трудната']);
      await expect(article.getByRole('emphasis')).toHaveText(['не', 'гърбът']);

      // Headings keep their levels under the title.
      await expect(
        article.getByRole('heading', { level: 2, name: 'Преди да дойдете' }),
      ).toBeVisible();
      await expect(
        article.getByRole('heading', { level: 3, name: 'Първата седмица' }),
      ).toBeVisible();

      // Lists, nested items included.
      const water = article.getByRole('listitem').filter({ hasText: 'Вода' });
      await expect(water.getByRole('list').getByRole('listitem')).toHaveText([
        'Поне един литър',
      ]);
      await expect(
        article.getByRole('listitem').filter({ hasText: 'Загрявка' }),
      ).toBeVisible();

      // Quote with its source, image with its caption, delimiter.
      await expect(
        article.getByRole('blockquote').filter({
          hasText: 'Техниката идва преди тежестта.',
        }),
      ).toBeVisible();
      await expect(
        article.getByRole('figure', { name: 'Треньорите на The Index' }),
      ).toBeVisible();
      const imageFigure = article.getByRole('figure', {
        name: 'Клекът: гърбът е изправен.',
      });
      await expect(
        imageFigure.getByRole('img', { name: BLOCK_IMAGE.altText }),
      ).toBeVisible();
      await expect(article.getByRole('separator')).toHaveCount(1);
    },
  );

  test(
    'loads the featured image at once and the images in the text lazily, in WebP sizes',
    { tag: '@desktop' },
    async ({ page }) => {
      await stubYoutube(page);
      await page.goto(articleUrl(FULL_ARTICLE.slug));

      const featured = page.getByRole('img', { name: FEATURED_IMAGE.altText });
      await expect(featured).toHaveAttribute('loading', 'eager');
      await expect(featured).toHaveAttribute('fetchpriority', 'high');
      await expect(featured).toHaveAttribute('width', '3000');
      await expect(featured).toHaveAttribute('height', '2000');
      await expect(featured).toHaveAttribute(
        'srcset',
        FEATURED_IMAGE.variants.map((v) => `${v.url} ${v.width}w`).join(', '),
      );

      const inText = page.getByRole('img', { name: BLOCK_IMAGE.altText });
      await expect(inText).toHaveAttribute('loading', 'lazy');
      await expect(inText).toHaveAttribute(
        'src',
        BLOCK_IMAGE.variants.find((v) => v.width === 1600)?.url ?? '',
      );
      await expect(inText).toHaveAttribute('sizes', /44rem/);
    },
  );

  test(
    'tells search engines and link previews about the article',
    { tag: '@desktop' },
    async ({ page }) => {
      await stubYoutube(page);
      await page.goto(articleUrl(FULL_ARTICLE.slug));
      const canonical = `${SITE_URL}${articleUrl(FULL_ARTICLE.slug)}`;
      const { meta, canonical: link, jsonLd } = await readHead(page);

      expect(link).toBe(canonical);
      expect(meta).toMatchObject({
        description: [FULL_ARTICLE.description],
        'og:type': ['article'],
        'og:site_name': [t('common.appName')],
        'og:locale': ['bg_BG'],
        'og:title': [FULL_ARTICLE.seoTitle],
        'og:description': [FULL_ARTICLE.description],
        'og:url': [canonical],
        'og:image': [FEATURED_IMAGE.ogImage.url],
        'og:image:width': ['1200'],
        'og:image:height': ['630'],
        'og:image:alt': [FEATURED_IMAGE.altText],
        'article:published_time': [FULL_ARTICLE.publishedAt],
        'article:modified_time': [FULL_ARTICLE.updatedAt],
        'article:section': ['Начинаещи', 'Техника'],
        'twitter:card': ['summary_large_image'],
      });

      const organization = expect.objectContaining({
        '@type': 'Organization',
        name: t('common.appName'),
        url: `${SITE_URL}/`,
      });
      expect(jsonLd).toEqual([
        expect.objectContaining({
          '@context': 'https://schema.org',
          '@type': 'Article',
          mainEntityOfPage: canonical,
          headline: FULL_ARTICLE.title,
          description: FULL_ARTICLE.description,
          image: [FEATURED_IMAGE.ogImage.url, FEATURED_IMAGE.url],
          datePublished: FULL_ARTICLE.publishedAt,
          dateModified: FULL_ARTICLE.updatedAt,
          inLanguage: 'bg',
          author: organization,
          publisher: organization,
        }),
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: t('breadcrumbs.home'),
              item: `${SITE_URL}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: t('breadcrumbs.articles'),
              item: `${SITE_URL}/articles`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: FULL_ARTICLE.title,
              item: canonical,
            },
          ],
        },
      ]);
    },
  );

  test(
    'falls back to the site image, and shows no categories or update date when there are none',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      await page.goto(articleUrl(PLAIN_ARTICLE.slug));

      const article = page.getByRole('article');
      await expect(
        article.getByRole('heading', { level: 1, name: PLAIN_ARTICLE.title }),
      ).toBeVisible();
      await expect(article.getByText('1 ноември 2026 г.')).toBeVisible();
      await expect(
        article.getByText(t('article.updated', { date: '1 ноември 2026 г.' })),
      ).toHaveCount(0);
      await expect(
        article.getByRole('list', { name: t('article.categories') }),
      ).toHaveCount(0);
      await expect(article.getByRole('img')).toHaveCount(0);

      const { meta, jsonLd } = await readHead(page);
      expect(meta).toMatchObject({
        'og:image': [`${SITE_URL}/brand/og-default.png`],
        'og:image:alt': [t('common.appName')],
      });
      expect(meta['article:section']).toBeUndefined();
      expect(jsonLd[0]).toMatchObject({
        image: [`${SITE_URL}/brand/og-default.png`],
      });
    },
  );

  test(
    'has no horizontal scroll on a 320px phone',
    { tag: '@mobile' },
    async ({ page }) => {
      await stubYoutube(page);
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(articleUrl(FULL_ARTICLE.slug));
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    },
  );
});

test.describe('YouTube videos', () => {
  test(
    'load the player from youtube-nocookie.com only when play is pressed',
    { tag: ['@desktop', '@mobile'] },
    async ({ page }) => {
      const requested = await stubYoutube(page);
      await page.goto(articleUrl(FULL_ARTICLE.slug));

      const play = page.getByRole('button', { name: t('article.video.play') });
      await expect(play).toHaveCount(2);
      await expect(play.first()).toHaveAccessibleDescription(
        'Как изглежда една тренировка',
      );
      await play.first().scrollIntoViewIfNeeded();
      expect(requested.filter((url) => !url.includes('i.ytimg.com'))).toEqual(
        [],
      );

      await play.first().click();

      const player = page.getByTitle(t('article.video.playerTitle'));
      await expect(player).toHaveCount(1);
      await expect(player).toHaveAttribute(
        'src',
        `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`,
      );
      await expect(player).toBeFocused();
      await expect
        .poll(() => requested)
        .toContain(
          `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`,
        );
      // The other video is still a play button.
      await expect(play).toHaveCount(1);
      expect(requested.join(' ')).not.toContain(
        `youtube-nocookie.com/embed/${SECOND_VIDEO_ID}`,
      );
    },
  );

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test(
      'link to the video on YouTube',
      { tag: '@desktop' },
      async ({ page }) => {
        await stubYoutube(page);
        await page.goto(articleUrl(FULL_ARTICLE.slug));

        const watch = page.getByRole('link', {
          name: t('article.video.watch'),
        });
        await expect(watch).toHaveCount(2);
        await expect(watch.first()).toHaveAttribute(
          'href',
          `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        );
      },
    );
  });
});

test.describe('article content from the API', () => {
  test(
    'is sanitized again before it is shown, JSON-LD included',
    { tag: '@desktop' },
    async ({ page }) => {
      await page.goto(articleUrl(UNSAFE_ARTICLE.slug));

      const article = page.getByRole('article');
      await expect(
        article.getByRole('heading', { level: 1, name: UNSAFE_ARTICLE.title }),
      ).toBeVisible();
      // The javascript: link lost its href, so it is no link; the img with onerror is gone.
      await expect(article.getByText('връзка')).toBeVisible();
      await expect(article.getByRole('link')).toHaveCount(0);
      await expect(article.getByRole('img')).toHaveCount(0);
      // A video id that isn't one is left out.
      await expect(
        article.getByRole('button', { name: t('article.video.play') }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => (window as unknown as { pwned?: boolean }).pwned,
        ),
      ).toBeUndefined();

      const { jsonLd } = await readHead(page);
      expect(jsonLd[0]).toMatchObject({ headline: UNSAFE_ARTICLE.title });
    },
  );
});

test.describe('missing articles', () => {
  for (const [what, path] of [
    ['an unknown or unpublished slug', '/articles/no-such-article'],
    ['something that is not a slug', '/articles/Not_A_Slug'],
  ]) {
    test(
      `answer ${what} with the 404 page`,
      { tag: '@desktop' },
      async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
        await expect(
          page.getByRole('heading', { level: 1, name: t('notFound.title') }),
        ).toBeVisible();
      },
    );
  }
});
