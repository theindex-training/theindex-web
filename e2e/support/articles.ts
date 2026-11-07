import type { PublicArticle, PublicMedia } from '../../src/lib/public-api.ts';

/**
 * Articles the stub API serves (e2e/support/stub-api.ts), shaped like theindex-api's public
 * responses (`src/public-content/public-content.ts` there). Journeys read the same objects to
 * know what the page should show.
 */
export const STUB_API_PORT = 4399;
export const STUB_API_URL = `http://127.0.0.1:${STUB_API_PORT}`;

/** A slug the stub answers with a 500, as when the API's database is down. */
export const FAILING_SLUG = 'api-failure';

function media(id: string, altText: string): PublicMedia {
  const base = `${STUB_API_URL}/media/${id}`;
  return {
    url: `${base}/master.jpg`,
    width: 3000,
    height: 2000,
    altText,
    variants: [480, 960, 1600, 2400].map((width) => ({
      url: `${base}/${width}.webp`,
      width,
      height: Math.round((width * 2) / 3),
    })),
    ogImage: { url: `${base}/og.jpg`, width: 1200, height: 630 },
  };
}

export const FEATURED_IMAGE = media(
  '0b8a3c1e-5a43-4c55-9d0f-6f1f7a3f2b10',
  'Трениращ вдига щанга в залата',
);
export const BLOCK_IMAGE = media(
  '6d1c2f4e-8b7a-4e1f-a3c2-9f0e5d4b3a21',
  'Клек с тежест, изглед отстрани',
);
export const VIDEO_ID = 'dQw4w9WgXcQ';
export const SECOND_VIDEO_ID = 'aqz-KE-bpKQ';

/** Every block type, a featured image, two categories, and an update days after the first publish. */
export const FULL_ARTICLE: PublicArticle = {
  slug: 'kak-da-zapochnem-s-krosfit',
  language: 'bg',
  title: 'Как да започнем с КросФит',
  seoTitle: 'Как да започнем с КросФит: първите седмици',
  description:
    'Какво да очаквате от първите си тренировки, как да се подготвите и защо техниката идва преди тежестта.',
  excerpt: 'Какво да очаквате от първите си тренировки.',
  featuredImage: FEATURED_IMAGE,
  categories: [
    { slug: 'nachinaeshti', name: 'Начинаещи' },
    { slug: 'tehnika', name: 'Техника' },
  ],
  publishedAt: '2026-11-02T08:00:00.000Z',
  // 23:30 on 5 November in Sofia, still 5 November there.
  updatedAt: '2026-11-05T21:30:00.000Z',
  content: {
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: 'Първата тренировка е <b>най-трудната</b>, но <i>не</i> и най-тежката. Прочетете <a href="https://example.com/guide">ръководството</a> преди това.',
        },
      },
      { type: 'header', data: { text: 'Преди да дойдете', level: 2 } },
      {
        type: 'list',
        data: {
          style: 'unordered',
          items: [
            { content: 'Удобни обувки', items: [] },
            {
              content: 'Вода',
              items: [{ content: 'Поне един литър', items: [] }],
            },
          ],
        },
      },
      { type: 'header', data: { text: 'Първата седмица', level: 3 } },
      {
        type: 'list',
        data: {
          style: 'ordered',
          items: [
            { content: 'Загрявка', items: [] },
            { content: 'Техника', items: [] },
          ],
        },
      },
      {
        type: 'quote',
        data: {
          text: 'Техниката идва преди тежестта.',
          caption: 'Треньорите на The Index',
        },
      },
      {
        type: 'image',
        data: {
          image: BLOCK_IMAGE,
          caption: 'Клекът: <i>гърбът</i> е изправен.',
        },
      },
      { type: 'delimiter', data: {} },
      {
        type: 'embed',
        data: {
          service: 'youtube',
          videoId: VIDEO_ID,
          caption: 'Как изглежда една тренировка',
        },
      },
      {
        type: 'embed',
        data: { service: 'youtube', videoId: SECOND_VIDEO_ID, caption: '' },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Дълъг адрес, който не бива да разширява страницата: https://example.com/a-very-long-path-without-any-spaces-at-all-that-keeps-going-and-going',
        },
      },
    ],
  },
};

/** The least an article can have: no featured image, no categories, never updated. */
export const PLAIN_ARTICLE: PublicArticle = {
  slug: 'kratka-statia',
  language: 'bg',
  title: 'Кратка статия',
  seoTitle: 'Кратка статия',
  description: 'Само един абзац текст.',
  excerpt: 'Само един абзац текст.',
  featuredImage: null,
  categories: [],
  publishedAt: '2026-11-06T09:15:00.000Z',
  updatedAt: '2026-11-06T09:15:00.000Z',
  content: {
    blocks: [{ type: 'paragraph', data: { text: 'Само един абзац текст.' } }],
  },
};

/**
 * Markup the API would never return (it sanitizes on save), to show the site sanitizes again:
 * a title that tries to end the JSON-LD script, an event handler, a javascript: link, a script.
 */
export const UNSAFE_ARTICLE: PublicArticle = {
  ...PLAIN_ARTICLE,
  slug: 'opasen-tekst',
  title: 'Заглавие </script><script>window.pwned = true</script>',
  seoTitle: 'Опасен текст',
  content: {
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: 'Текст <img src="x" onerror="window.pwned = true"><a href="javascript:window.pwned = true">връзка</a><script>window.pwned = true</script> край.',
        },
      },
      {
        type: 'embed',
        data: {
          service: 'youtube',
          videoId: '"><script>window.pwned=true</script>',
          caption: '',
        },
      },
    ],
  },
};

export const ARTICLES: readonly PublicArticle[] = [
  FULL_ARTICLE,
  PLAIN_ARTICLE,
  UNSAFE_ARTICLE,
];
