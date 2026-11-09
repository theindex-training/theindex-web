import { describe, expect, it, vi } from 'vitest';
import {
  ApiUnavailableError,
  fetchArticlePage,
  fetchPublicArticle,
  fetchPublicCategories,
  fetchPublicCategory,
  getJson,
  isSlug,
} from './public-api';

const API = 'http://api:3000/api';

function respond(status: number, body: unknown = {}) {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

describe('fetchPublicArticle', () => {
  it('GETs the article by slug from the public endpoint', async () => {
    const article = { slug: 'kak-da-zapochnem', title: 'Как да започнем' };
    const fetch = respond(200, article);

    await expect(
      fetchPublicArticle('kak-da-zapochnem', { apiUrl: API, fetch }),
    ).resolves.toEqual(article);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${API}/public/articles/kak-da-zapochnem`);
    expect(init?.headers).toEqual({ Accept: 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('is null when the API has no such published article (404)', async () => {
    const fetch = respond(404, { statusCode: 404, message: 'Not found' });
    await expect(
      fetchPublicArticle('unpublished', { apiUrl: API, fetch }),
    ).resolves.toBeNull();
  });

  it('is null without asking the API for anything that is not a slug', async () => {
    const fetch = respond(200);
    for (const slug of [
      undefined,
      '',
      'Uppercase',
      'with space',
      '..',
      'a/b',
      'кирилица',
      'x'.repeat(81),
    ]) {
      await expect(
        fetchPublicArticle(slug, { apiUrl: API, fetch }),
      ).resolves.toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('fetchArticlePage', () => {
  const PAGE = { items: [], total: 0, page: 1, pageSize: 12 };

  it('asks for the first 12 articles by default', async () => {
    const fetch = respond(200, PAGE);
    await expect(fetchArticlePage({}, { apiUrl: API, fetch })).resolves.toEqual(
      PAGE,
    );
    expect(fetch.mock.calls[0][0]).toBe(
      `${API}/public/articles?page=1&pageSize=12`,
    );
  });

  it('sends the category, the search (encoded), the page and the page size', async () => {
    const fetch = respond(200, PAGE);
    await fetchArticlePage(
      { category: 'tehnika', q: 'клек & тяга', page: 3, pageSize: 7 },
      { apiUrl: API, fetch },
    );
    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/public/articles');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      category: 'tehnika',
      q: 'клек & тяга',
      page: '3',
      pageSize: '7',
    });
  });

  it('leaves a blank search and category out', async () => {
    const fetch = respond(200, PAGE);
    await fetchArticlePage(
      { category: '', q: '', page: 2 },
      { apiUrl: API, fetch },
    );
    expect(fetch.mock.calls[0][0]).toBe(
      `${API}/public/articles?page=2&pageSize=12`,
    );
  });

  it('throws ApiUnavailableError for a 404, which the list never answers', async () => {
    await expect(
      fetchArticlePage({}, { apiUrl: API, fetch: respond(404) }),
    ).rejects.toMatchObject({ name: 'ApiUnavailableError', status: 404 });
  });
});

describe('fetchPublicCategories', () => {
  it('GETs the published categories', async () => {
    const categories = [
      { slug: 'tehnika', name: 'Техника', description: null, articleCount: 2 },
    ];
    const fetch = respond(200, categories);
    await expect(
      fetchPublicCategories({ apiUrl: API, fetch }),
    ).resolves.toEqual(categories);
    expect(fetch.mock.calls[0][0]).toBe(`${API}/public/article-categories`);
  });

  it('throws ApiUnavailableError for a 404', async () => {
    await expect(
      fetchPublicCategories({ apiUrl: API, fetch: respond(404) }),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });
});

describe('fetchPublicCategory', () => {
  it('GETs one category by slug', async () => {
    const category = {
      slug: 'tehnika',
      name: 'Техника',
      description: null,
      articleCount: 2,
    };
    const fetch = respond(200, category);
    await expect(
      fetchPublicCategory('tehnika', { apiUrl: API, fetch }),
    ).resolves.toEqual(category);
    expect(fetch.mock.calls[0][0]).toBe(
      `${API}/public/article-categories/tehnika`,
    );
  });

  it('is null for a category without published articles (404)', async () => {
    await expect(
      fetchPublicCategory('prazna', { apiUrl: API, fetch: respond(404) }),
    ).resolves.toBeNull();
  });

  it('is null without asking the API for anything that is not a slug', async () => {
    const fetch = respond(200);
    for (const slug of [undefined, '', 'Техника', 'a/b', '..']) {
      await expect(
        fetchPublicCategory(slug, { apiUrl: API, fetch }),
      ).resolves.toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('getJson', () => {
  it('throws ApiUnavailableError with the status for other errors', async () => {
    const error = await getJson('/public/articles/x', {
      apiUrl: API,
      fetch: respond(500, { statusCode: 500 }),
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiUnavailableError);
    expect(error).toMatchObject({
      status: 500,
      message: `GET ${API}/public/articles/x answered 500`,
    });
  });

  it('throws ApiUnavailableError when the API cannot be reached', async () => {
    const unreachable = vi.fn<typeof fetch>(() =>
      Promise.reject(new TypeError('fetch failed')),
    );
    await expect(
      getJson('/public/articles/x', { apiUrl: API, fetch: unreachable }),
    ).rejects.toThrow(
      new ApiUnavailableError(
        `GET ${API}/public/articles/x failed: fetch failed`,
      ),
    );
  });

  it('gives up when the API does not answer in time', async () => {
    // Never answers, but honours the abort signal like the real fetch.
    const hanging = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason as Error),
          ),
        ),
    );
    await expect(
      getJson('/public/articles/x', {
        apiUrl: API,
        fetch: hanging,
        timeoutMs: 20,
      }),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('throws ApiUnavailableError for a body that is not JSON', async () => {
    await expect(
      getJson('/public/articles/x', {
        apiUrl: API,
        fetch: respond(200, '<html>proxy error</html>'),
      }),
    ).rejects.toBeInstanceOf(ApiUnavailableError);
  });
});

describe('isSlug', () => {
  it('accepts slugs as the API makes them', () => {
    expect(isSlug('kak-da-zapochnem-s-krosfit')).toBe(true);
    expect(isSlug('statia-2')).toBe(true);
    expect(isSlug('x'.repeat(80))).toBe(true);
  });
});
