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

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Adds the defaults to `headers` without overriding what a page already set (e.g. a preview page
 * that sends `Cache-Control: no-store`). Only HTML responses get a Cache-Control default.
 */
export function applyDefaultHeaders(headers: Headers, status: number): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  const isHtml = headers.get('Content-Type')?.startsWith('text/html') ?? false;
  if (isHtml && !headers.has('Cache-Control')) {
    headers.set(
      'Cache-Control',
      status >= 500 ? ERROR_CACHE_CONTROL : PAGE_CACHE_CONTROL,
    );
  }
}
