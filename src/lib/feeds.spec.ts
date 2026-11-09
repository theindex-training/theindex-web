// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { escapeXml, robotsTxt, rssXml, sitemapXml } from './feeds';
import type { PublicArticleSummary } from './public-api';

const SITE = 'https://theindex.training';

/** Parses `xml` the way a feed reader would; a malformed document fails the test. */
function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) throw new Error(`Not well-formed XML: ${error.textContent}`);
  return doc;
}

function summary(
  overrides: Partial<PublicArticleSummary> = {},
): PublicArticleSummary {
  return {
    slug: 'kak-da-zapochnem',
    title: 'Как да започнем',
    excerpt: 'Първите седмици.',
    featuredImage: null,
    categories: [],
    publishedAt: '2026-11-02T08:00:00.000Z',
    updatedAt: '2026-11-02T08:00:00.000Z',
    ...overrides,
  };
}

describe('escapeXml', () => {
  it('escapes markup characters', () => {
    expect(escapeXml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &apos;Jerry&apos;&lt;/b&gt;',
    );
  });

  it('drops control characters XML cannot hold, keeping tabs and line ends', () => {
    expect(escapeXml('a\u0000b\u0008c\u001Fd\te\nf\rg')).toBe('abcd\te\nf\rg');
  });
});

describe('sitemapXml', () => {
  const sitemap = {
    articles: [
      // Newest first publish first, but the older one was updated later.
      { slug: 'nova', lastmod: '2026-11-03T10:00:00.000Z' },
      { slug: 'stara', lastmod: '2026-11-06T09:30:00.000Z' },
    ],
    categories: [{ slug: 'tehnika', lastmod: '2026-11-04T12:00:00.000Z' }],
  };

  function entries(xml: string) {
    const doc = parseXml(xml);
    expect(doc.documentElement.namespaceURI).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9',
    );
    return [...doc.getElementsByTagName('url')].map((url) => ({
      loc: url.getElementsByTagName('loc')[0]?.textContent,
      lastmod: url.getElementsByTagName('lastmod')[0]?.textContent ?? null,
    }));
  }

  it('lists the home page, the article list, every article and every category', () => {
    expect(entries(sitemapXml(SITE, sitemap))).toEqual([
      { loc: `${SITE}/`, lastmod: '2026-11-06T09:30:00.000Z' },
      { loc: `${SITE}/articles`, lastmod: '2026-11-06T09:30:00.000Z' },
      { loc: `${SITE}/articles/nova`, lastmod: '2026-11-03T10:00:00.000Z' },
      { loc: `${SITE}/articles/stara`, lastmod: '2026-11-06T09:30:00.000Z' },
      {
        loc: `${SITE}/articles/category/tehnika`,
        lastmod: '2026-11-04T12:00:00.000Z',
      },
    ]);
  });

  it('writes lastmod in UTC, whatever offset the date came with', () => {
    const xml = sitemapXml(SITE, {
      articles: [{ slug: 'a', lastmod: '2026-11-06T01:30:00+02:00' }],
      categories: [],
    });
    expect(entries(xml)[2].lastmod).toBe('2026-11-05T23:30:00.000Z');
  });

  it('lists only the home page and the article list, without dates, before anything is published', () => {
    expect(entries(sitemapXml(SITE, { articles: [], categories: [] }))).toEqual(
      [
        { loc: `${SITE}/`, lastmod: null },
        { loc: `${SITE}/articles`, lastmod: null },
      ],
    );
  });
});

describe('rssXml', () => {
  const channel = {
    siteUrl: SITE,
    title: 'The Index',
    description: 'Статии от екипа на The Index.',
    language: 'bg',
  };

  it('describes the site as an RSS 2.0 channel with a link to itself', () => {
    const doc = parseXml(rssXml(channel, [summary()]));
    expect(doc.documentElement.tagName).toBe('rss');
    expect(doc.documentElement.getAttribute('version')).toBe('2.0');
    const ch = doc.getElementsByTagName('channel')[0];
    const text = (name: string) =>
      ch.querySelector(`:scope > ${name}`)?.textContent;
    expect(text('title')).toBe('The Index');
    expect(text('link')).toBe(`${SITE}/`);
    expect(text('description')).toBe('Статии от екипа на The Index.');
    expect(text('language')).toBe('bg');
    const self = ch.getElementsByTagNameNS(
      'http://www.w3.org/2005/Atom',
      'link',
    )[0];
    expect(self.getAttribute('href')).toBe(`${SITE}/rss.xml`);
    expect(self.getAttribute('rel')).toBe('self');
  });

  it('lists each article with its address, first publish date, excerpt and categories', () => {
    const doc = parseXml(
      rssXml(channel, [
        summary({
          slug: 'zashto-klekovete',
          title: 'Защо клековете & нападите са <важни>',
          excerpt: 'Кратко „въведение“.',
          categories: [
            { slug: 'tehnika', name: 'Техника' },
            { slug: 'sila', name: 'Сила' },
          ],
          publishedAt: '2026-11-02T08:00:00.000Z',
          updatedAt: '2026-11-05T21:30:00.000Z',
        }),
      ]),
    );
    const item = doc.getElementsByTagName('item')[0];
    const text = (name: string) =>
      item.getElementsByTagName(name)[0]?.textContent;
    expect(text('title')).toBe('Защо клековете & нападите са <важни>');
    expect(text('link')).toBe(`${SITE}/articles/zashto-klekovete`);
    expect(text('guid')).toBe(`${SITE}/articles/zashto-klekovete`);
    expect(
      item.getElementsByTagName('guid')[0].getAttribute('isPermaLink'),
    ).toBe('true');
    expect(text('pubDate')).toBe('Mon, 02 Nov 2026 08:00:00 GMT');
    expect(text('description')).toBe('Кратко „въведение“.');
    expect(
      [...item.getElementsByTagName('category')].map((c) => c.textContent),
    ).toEqual(['Техника', 'Сила']);
  });

  it('keeps the order it is given and dates the feed by its latest publish', () => {
    const doc = parseXml(
      rssXml(channel, [
        summary({
          slug: 'nova',
          publishedAt: '2026-11-04T08:00:00.000Z',
          updatedAt: '2026-11-04T08:00:00.000Z',
        }),
        summary({
          slug: 'stara',
          publishedAt: '2026-11-01T08:00:00.000Z',
          updatedAt: '2026-11-06T18:15:00.000Z',
        }),
      ]),
    );
    expect(
      [...doc.getElementsByTagName('item')].map(
        (item) => item.getElementsByTagName('link')[0].textContent,
      ),
    ).toEqual([`${SITE}/articles/nova`, `${SITE}/articles/stara`]);
    expect(doc.getElementsByTagName('lastBuildDate')[0].textContent).toBe(
      'Fri, 06 Nov 2026 18:15:00 GMT',
    );
  });

  it('leaves out an empty excerpt, and the build date of an empty feed', () => {
    const withoutText = parseXml(rssXml(channel, [summary({ excerpt: '' })]));
    expect(withoutText.getElementsByTagName('description')).toHaveLength(1); // the channel's
    const empty = parseXml(rssXml(channel, []));
    expect(empty.getElementsByTagName('item')).toHaveLength(0);
    expect(empty.getElementsByTagName('lastBuildDate')).toHaveLength(0);
  });
});

describe('robotsTxt', () => {
  it('lets crawlers in and points them at the sitemap', () => {
    expect(robotsTxt(SITE)).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
    );
  });
});
