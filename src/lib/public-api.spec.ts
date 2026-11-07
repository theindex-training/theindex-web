import { describe, expect, it, vi } from 'vitest';
import {
  ApiUnavailableError,
  fetchPublicArticle,
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
