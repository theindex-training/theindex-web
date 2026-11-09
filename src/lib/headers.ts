/**
 * Default response headers for pages the server renders (applied in src/middleware.ts).
 *
 * Caching follows docs/decision-record.md, section 10: HTML may be reused for a minute and served
 * stale for five more while it is refreshed, so an unpublished article disappears within about a
 * minute and a CDN can be put in front later without code changes. Hashed assets under /_astro/
 * get their one-year immutable header from @astrojs/node, not from here.
 */
export const PAGE_CACHE_CONTROL =
  'public, max-age=60, stale-while-revalidate=300';

/** Server errors are never cached, so a short API outage doesn't outlive itself. */
export const ERROR_CACHE_CONTROL = 'no-store';

/** How long the 503 page asks browsers and crawlers to wait before trying again, in seconds. */
export const RETRY_AFTER_SECONDS = 60;

/**
 * The draft preview (decision record, section 10): never stored by a browser or a cache, and
 * kept out of search engines even if its address leaks.
 */
export const PREVIEW_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};

/**
 * Responses the server renders that get the page caching: HTML pages and the sitemap, RSS feed
 * and robots.txt. Anything else (e.g. JSON) is left alone.
 */
const CACHED_TYPES = [
  'text/html',
  'application/xml',
  'application/rss+xml',
  'text/plain',
];

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Adds the defaults to `headers` without overriding what a page already set (e.g. the preview
 * page, which sends `Cache-Control: no-store`). Only the types in CACHED_TYPES get a
 * Cache-Control default.
 */
export function applyDefaultHeaders(headers: Headers, status: number): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  const type = headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  const cached = type !== undefined && CACHED_TYPES.includes(type);
  if (cached && !headers.has('Cache-Control')) {
    headers.set(
      'Cache-Control',
      status >= 500 ? ERROR_CACHE_CONTROL : PAGE_CACHE_CONTROL,
    );
  }
}
