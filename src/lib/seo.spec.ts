import { describe, expect, it } from 'vitest';
import type { PublicArticle, PublicMedia } from './public-api';
import {
  absoluteUrl,
  articleJsonLd,
  articleSocialImage,
  breadcrumbJsonLd,
  defaultSocialImage,
  serializeJsonLd,
} from './seo';

const SITE = 'https://theindex.training';
const M = 'https://media.theindex.training/abc';

const IMAGE: PublicMedia = {
  url: `${M}/master.jpg`,
  width: 3000,
  height: 2000,
  altText: 'Щанга',
  variants: [{ url: `${M}/2400.webp`, width: 2400, height: 1600 }],
  ogImage: { url: `${M}/og.jpg`, width: 1200, height: 630 },
};

const ARTICLE: PublicArticle = {
  slug: 'kak-da-zapochnem',
  language: 'bg',
  title: 'Как да започнем',
  seoTitle: 'Как да започнем с КросФит',
  description: 'Първите седмици.',
  excerpt: 'Първите седмици.',
  featuredImage: IMAGE,
  categories: [
    { slug: 'nachinaeshti', name: 'Начинаещи' },
    { slug: 'tehnika', name: 'Техника' },
  ],
  publishedAt: '2026-11-02T08:00:00.000Z',
  updatedAt: '2026-11-05T21:30:00.000Z',
  content: { blocks: [] },
};

const ORGANIZATION = {
  '@type': 'Organization',
  name: 'The Index',
  url: `${SITE}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE}/brand/the-index-logo-red.png`,
    width: 640,
    height: 270,
  },
};

describe('absoluteUrl', () => {
  it('puts a path on the site URL', () => {
    expect(absoluteUrl(SITE, '/articles/a')).toBe(`${SITE}/articles/a`);
    expect(absoluteUrl(SITE, '/')).toBe(`${SITE}/`);
  });
});

describe('articleJsonLd', () => {
  it('describes the article with the organization as author and publisher', () => {
    expect(
      articleJsonLd(ARTICLE, { siteUrl: SITE, organizationName: 'The Index' }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${SITE}/articles/kak-da-zapochnem#article`,
      mainEntityOfPage: `${SITE}/articles/kak-da-zapochnem`,
      url: `${SITE}/articles/kak-da-zapochnem`,
      headline: 'Как да започнем',
      description: 'Първите седмици.',
      image: [`${M}/og.jpg`, `${M}/master.jpg`],
      datePublished: '2026-11-02T08:00:00.000Z',
      dateModified: '2026-11-05T21:30:00.000Z',
      inLanguage: 'bg',
      articleSection: ['Начинаещи', 'Техника'],
      author: ORGANIZATION,
      publisher: ORGANIZATION,
    });
  });

  it('uses the default site image and leaves out sections when there are none', () => {
    const data = articleJsonLd(
      { ...ARTICLE, featuredImage: null, categories: [] },
      { siteUrl: SITE, organizationName: 'The Index' },
    );
    expect(data['image']).toEqual([`${SITE}/brand/og-default.png`]);
    expect(data).not.toHaveProperty('articleSection');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the trail from 1 with absolute URLs', () => {
    expect(
      breadcrumbJsonLd(SITE, [
        { name: 'Начало', path: '/' },
        { name: 'Статии', path: '/articles' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Начало', item: `${SITE}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Статии',
          item: `${SITE}/articles`,
        },
      ],
    });
  });
});

describe('social images', () => {
  it('uses the featured image’s 1200×630 crop with its alt text', () => {
    expect(articleSocialImage(ARTICLE)).toEqual({
      url: `${M}/og.jpg`,
      width: 1200,
      height: 630,
      alt: 'Щанга',
    });
  });

  it('has none without a featured image, so the default applies', () => {
    expect(articleSocialImage({ featuredImage: null })).toBeNull();
    expect(defaultSocialImage(SITE, 'The Index')).toEqual({
      url: `${SITE}/brand/og-default.png`,
      width: 1200,
      height: 630,
      alt: 'The Index',
    });
  });
});

describe('serializeJsonLd', () => {
  it('cannot end the script element early, and parses back to the same data', () => {
    const data = { headline: '</script><script>alert(1)</script> & \u2028' };
    const json = serializeJsonLd(data);
    expect(json).not.toMatch(/[<>&\u2028]/);
    expect(json).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(json)).toEqual(data);
  });
});
