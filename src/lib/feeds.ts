import { categoryPath } from './navigation';
import type { PublicArticleSummary, PublicSitemap } from './public-api';
import { absoluteUrl, articlePath } from './seo';

/**
 * The machine-readable files of the site (docs/decision-record.md, sections 4 and 10):
 * `/sitemap.xml`, `/rss.xml` and `/robots.txt`, built on every request from the API's data.
 * Pure functions; the routes in src/pages fetch the data and send the result.
 */

export const SITEMAP_PATH = '/sitemap.xml';
export const RSS_PATH = '/rss.xml';

export const SITEMAP_CONTENT_TYPE = 'application/xml; charset=utf-8';
export const RSS_CONTENT_TYPE = 'application/rss+xml; charset=utf-8';
export const ROBOTS_CONTENT_TYPE = 'text/plain; charset=utf-8';

/** How many of the newest articles the RSS feed lists. */
export const RSS_ITEM_COUNT = 20;

/** Characters XML 1.0 doesn't allow at all (control characters other than tab and line ends). */
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/** Text for an XML element or attribute: markup escaped, characters XML can't hold dropped. */
export function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML_CHARS, '')
    .replace(/[&<>"']/g, (char) => XML_ENTITIES[char]);
}

/** The latest of some ISO 8601 moments, or undefined for none. */
function latest(dates: string[]): string | undefined {
  let best: string | undefined;
  let bestTime = -Infinity;
  for (const date of dates) {
    const time = Date.parse(date);
    if (time > bestTime) {
      best = date;
      bestTime = time;
    }
  }
  return best;
}

/** An ISO 8601 moment as the sitemap protocol writes it (W3C datetime, UTC). */
function w3cDate(date: string): string {
  return new Date(date).toISOString();
}

/**
 * `sitemap.xml`: the home page, `/articles`, every published article and every category with
 * one. The home page and `/articles` list the articles, so they change when one is published.
 * Further list pages (`?page=2`) and search results are left out: Google finds the pages through
 * the articles, and search results are `noindex`.
 */
export function sitemapXml(siteUrl: string, sitemap: PublicSitemap): string {
  const listsChanged = latest(sitemap.articles.map((a) => a.lastmod));
  const entries = [
    { path: '/', lastmod: listsChanged },
    { path: '/articles', lastmod: listsChanged },
    ...sitemap.articles.map((a) => ({
      path: articlePath(a.slug),
      lastmod: a.lastmod,
    })),
    ...sitemap.categories.map((c) => ({
      path: categoryPath(c.slug),
      lastmod: c.lastmod,
    })),
  ];

  const urls = entries.map(({ path, lastmod }) => {
    const loc = `<loc>${escapeXml(absoluteUrl(siteUrl, path))}</loc>`;
    return lastmod
      ? `  <url>${loc}<lastmod>${w3cDate(lastmod)}</lastmod></url>`
      : `  <url>${loc}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

export interface RssChannel {
  siteUrl: string;
  title: string;
  description: string;
  /** The site's language, e.g. "bg". */
  language: string;
}

/** RSS dates are RFC 822 (`Mon, 02 Nov 2026 08:00:00 GMT`). */
function rfc822(date: string): string {
  return new Date(date).toUTCString();
}

/**
 * `rss.xml` (RSS 2.0): the newest articles, newest first publish first, each with its title,
 * address, first publish date, excerpt and categories. `lastBuildDate` is the latest publish
 * among them, so the feed's text only changes when its content does.
 */
export function rssXml(
  channel: RssChannel,
  articles: PublicArticleSummary[],
): string {
  const { siteUrl } = channel;
  const lastBuild = latest(articles.map((a) => a.updatedAt));
  const items = articles.map((article) => {
    const link = escapeXml(absoluteUrl(siteUrl, articlePath(article.slug)));
    return [
      '    <item>',
      `      <title>${escapeXml(article.title)}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <pubDate>${rfc822(article.publishedAt)}</pubDate>`,
      ...(article.excerpt
        ? [`      <description>${escapeXml(article.excerpt)}</description>`]
        : []),
      ...article.categories.map(
        (c) => `      <category>${escapeXml(c.name)}</category>`,
      ),
      '    </item>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(absoluteUrl(siteUrl, '/'))}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language)}</language>`,
    `    <atom:link href="${escapeXml(absoluteUrl(siteUrl, RSS_PATH))}" rel="self" type="application/rss+xml"/>`,
    ...(lastBuild
      ? [`    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>`]
      : []),
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/**
 * `robots.txt`: everything may be crawled, and the sitemap's absolute address. Nothing is
 * disallowed on purpose: pages that must stay out of search results (search results, the draft
 * preview) say so with `noindex`, which a crawler can only read on a page it may fetch.
 */
export function robotsTxt(siteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl(siteUrl, SITEMAP_PATH)}`,
    '',
  ].join('\n');
}
