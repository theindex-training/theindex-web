/**
 * A stand-in for theindex-api's public endpoints, for the E2E journeys. The site renders on the
 * server, so page.route() can't mock its API calls; the Playwright config starts this server
 * instead and points API_INTERNAL_URL at it. Node runs it as TypeScript (type stripping), so it
 * uses only erasable syntax and imports with `.ts` extensions.
 *
 * - GET /api/public/articles/:slug: an article from articles.ts, else a NestJS-shaped 404;
 *   FAILING_SLUG answers 500.
 * - GET /media/...: a 1×1 PNG for every image URL in the fixtures.
 * - GET /health: for Playwright to know the server is up.
 */
import { createServer, type ServerResponse } from 'node:http';
import { ARTICLES, FAILING_SLUG, STUB_API_PORT } from './articles.ts';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8tmFDPQAH7wLyGOO9VQAAAABJRU5ErkJggg==',
  'base64',
);

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://stub');

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
