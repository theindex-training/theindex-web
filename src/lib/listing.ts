import { ARTICLES_PAGE_MAX, SEARCH_MAX_LENGTH } from './public-api';

/**
 * The query string of the article lists (`/articles`, `/articles/category/<slug>`): `?page=` for
 * pagination and, on `/articles`, `?q=` for search (decision record, section 4).
 */

/**
 * The page asked for: 1 without `?page=`, else a whole number from 1 to the API's maximum
 * written without a sign or leading zeros. Anything else is null, which the pages answer with a
 * 404, so `?page=abc` or `?page=02` never becomes another URL for the same content.
 */
export function parsePage(value: string | null): number | null {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,4}$/.test(value)) return null;
  const page = Number(value);
  return page <= ARTICLES_PAGE_MAX ? page : null;
}

/**
 * The search as the API takes it: trimmed, inner whitespace collapsed, and cut to the API's
 * limit (a longer one would be a 400 there) without splitting a character in two. '' is no search.
 */
export function normalizeQuery(value: string | null): string {
  const collapsed = (value ?? '').replace(/\s+/g, ' ').trim();
  if (collapsed.length <= SEARCH_MAX_LENGTH) return collapsed;
  let cut = '';
  for (const char of collapsed) {
    if (cut.length + char.length > SEARCH_MAX_LENGTH) break;
    cut += char;
  }
  return cut.trimEnd();
}

/** How many pages `total` items fill; 1 for an empty list, which still has its page. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The URL of page `page` of a list at `path`, keeping its search. Page 1 has no `?page=`, so the
 * first page has one address (the one the header and the canonical link use).
 */
export function pageHref(path: string, page: number, q = ''): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
