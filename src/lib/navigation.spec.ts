import { describe, expect, it, vi } from 'vitest';
import { categoryPath, headerCategories, isCurrentPath } from './navigation';

const API = 'http://api:3000/api';

describe('headerCategories', () => {
  it('lists the published categories by slug and name, in the API order', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(
        Response.json([
          {
            slug: 'nachinaeshti',
            name: 'Начинаещи',
            description: 'За първите месеци.',
            articleCount: 3,
          },
          {
            slug: 'tehnika',
            name: 'Техника',
            description: null,
            articleCount: 1,
          },
        ]),
      ),
    );

    await expect(headerCategories({ apiUrl: API, fetch })).resolves.toEqual([
      { slug: 'nachinaeshti', name: 'Начинаещи' },
      { slug: 'tehnika', name: 'Техника' },
    ]);
    expect(fetch.mock.calls[0][0]).toBe(`${API}/public/article-categories`);
  });

  it('is empty and logs when the API fails, so the page still renders', async () => {
    const log = vi.fn();
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json({ statusCode: 500 }, { status: 500 })),
    );

    await expect(
      headerCategories({ apiUrl: API, fetch }, log),
    ).resolves.toEqual([]);
    expect(log).toHaveBeenCalledWith(
      `Header categories unavailable: GET ${API}/public/article-categories answered 500`,
    );
  });
});

describe('categoryPath', () => {
  it('is under /articles/category/', () => {
    expect(categoryPath('tehnika')).toBe('/articles/category/tehnika');
  });
});

describe('isCurrentPath', () => {
  it('matches the same path, with or without a trailing slash', () => {
    expect(isCurrentPath('/articles', '/articles')).toBe(true);
    expect(isCurrentPath('/articles', '/articles/')).toBe(true);
  });

  it('does not match other pages, even below the link', () => {
    expect(isCurrentPath('/articles', '/articles/kak-da-zapochnem')).toBe(
      false,
    );
    expect(isCurrentPath('/articles', '/')).toBe(false);
    expect(
      isCurrentPath(
        '/articles/category/tehnika',
        '/articles/category/tehnika-2',
      ),
    ).toBe(false);
  });
});
