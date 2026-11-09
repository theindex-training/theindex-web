/**
 * A stand-in for theindex-api's public endpoints, for the E2E journeys. The site renders on the
 * server, so page.route() can't mock its API calls; the Playwright config starts this server
 * instead and points API_INTERNAL_URL at it. Node runs it as TypeScript (type stripping), so it
 * uses only erasable syntax and imports with `.ts` extensions.
 *
 * - GET /api/public/articles?category&q&page&pageSize: summaries, newest first, filtered and
 *   paginated like the API (including its 400s for values out of range); a `category` or `q` of
 *   FAILING_SLUG / FAILING_QUERY answers 500.
 * - GET /api/public/articles/:slug: an article from articles.ts, else a NestJS-shaped 404;
 *   FAILING_SLUG answers 500.
 * - GET /api/public/article-categories and /:slug: the categories with their article counts,
 *   else a 404; FAILING_SLUG answers 500.
 * - GET /media/...: a 1×1 PNG for every image URL in the fixtures.
 * - GET /health: for Playwright to know the server is up.
 */
import { createServer, type ServerResponse } from 'node:http';
import type { PublicArticle } from '../../src/lib/public-api.ts';
import {
  ARTICLES,
  ARTICLES_NEWEST_FIRST,
  CATEGORIES,
  FAILING_QUERY,
  FAILING_SLUG,
  STUB_API_PORT,
  categoryWithCount,
  summaryOf,
} from './articles.ts';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8tmFDPQAH7wLyGOO9VQAAAABJRU5ErkJggg==',
  'base64',
);

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

/** The text the API searches: title, excerpt and the blocks' plain text. */
function searchableText(article: PublicArticle): string {
  const parts = [article.title, article.excerpt];
  for (const block of article.content.blocks) {
    if ('text' in block.data) parts.push(block.data.text);
    if (block.type === 'list') {
      const walk = (items: typeof block.data.items) => {
        for (const item of items) {
          parts.push(item.content);
          walk(item.items);
        }
      };
      walk(block.data.items);
    }
  }
  return parts.join(' ').toLocaleLowerCase('bg');
}

/** An integer query value within [min, max], its default when absent, or null (a 400). */
function intParam(
  params: URLSearchParams,
  name: string,
  fallback: number,
  max: number,
): number | null {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= max ? value : null;
}

function listArticles(res: ServerResponse, params: URLSearchParams): void {
  const category = params.get('category')?.trim() ?? '';
  const q = params.get('q')?.trim() ?? '';
  const page = intParam(params, 'page', 1, 10_000);
  const pageSize = intParam(params, 'pageSize', 12, 50);
  if (page === null || pageSize === null || q.length > 100) {
    json(res, 400, { statusCode: 400, message: ['Bad Request'] });
    return;
  }
  if (category === FAILING_SLUG || q === FAILING_QUERY) {
    json(res, 500, { statusCode: 500, message: 'Internal server error' });
    return;
  }

  const needle = q.toLocaleLowerCase('bg');
  const matching = ARTICLES_NEWEST_FIRST.filter(
    (a) =>
      (!category || a.categories.some((c) => c.slug === category)) &&
      (!needle || searchableText(a).includes(needle)),
  );
  json(res, 200, {
    items: matching
      .slice((page - 1) * pageSize, page * pageSize)
      .map(summaryOf),
    total: matching.length,
    page,
    pageSize,
  });
}

const server = createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url ?? '/', 'http://stub');

  if (req.method !== 'GET') {
    json(res, 405, { statusCode: 405, message: 'Method Not Allowed' });
    return;
  }
  if (pathname === '/health') {
    json(res, 200, { ok: true });
    return;
  }
  if (pathname.startsWith('/media/')) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(PIXEL);
    return;
  }

  if (pathname === '/api/public/articles') {
    listArticles(res, searchParams);
    return;
  }
  if (pathname === '/api/public/article-categories') {
    json(res, 200, CATEGORIES.map(categoryWithCount));
    return;
  }
  const category = /^\/api\/public\/article-categories\/([^/]+)$/.exec(
    pathname,
  );
  if (category) {
    const slug = decodeURIComponent(category[1]);
    if (slug === FAILING_SLUG) {
      json(res, 500, { statusCode: 500, message: 'Internal server error' });
      return;
    }
    const found = CATEGORIES.find((c) => c.slug === slug);
    if (found) json(res, 200, categoryWithCount(found));
    else json(res, 404, { statusCode: 404, message: 'Category not found' });
    return;
  }

  const article = /^\/api\/public\/articles\/([^/]+)$/.exec(pathname);
  if (article) {
    const slug = decodeURIComponent(article[1]);
    if (slug === FAILING_SLUG) {
      json(res, 500, { statusCode: 500, message: 'Internal server error' });
      return;
    }
    const found = ARTICLES.find((a) => a.slug === slug);
    if (found) json(res, 200, found);
    else json(res, 404, { statusCode: 404, message: 'Article not found' });
    return;
  }

  json(res, 404, { statusCode: 404, message: `Cannot GET ${pathname}` });
});

server.listen(STUB_API_PORT, '127.0.0.1', () => {
  console.log(`Stub API on http://127.0.0.1:${STUB_API_PORT}`);
});
