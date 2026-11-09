import { largestUrl } from './images';
import type { PublicArticle } from './public-api';

/**
 * Metadata for search engines and link previews (docs/decision-record.md, section 10): the
 * social image of a page, Open Graph values and the JSON-LD (schema.org) a page embeds.
 */

/** The image a link preview shows (Open Graph, Twitter card). */
export interface SocialImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** Open Graph locale per site language. */
export const OG_LOCALES: Readonly<Record<string, string>> = { bg: 'bg_BG' };

/** The logo the JSON-LD names as the publisher's (public/brand/, 640×270). */
const LOGO = { path: '/brand/the-index-logo-red.png', width: 640, height: 270 };

/** Default link preview for pages without an image of their own (public/brand/, 1200×630). */
const DEFAULT_IMAGE = {
  path: '/brand/og-default.png',
  width: 1200,
  height: 630,
};

/** `path` on this site as an absolute URL (canonical links, Open Graph, JSON-LD). */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, `${siteUrl}/`).href;
}

export function articlePath(slug: string): string {
  return `/articles/${slug}`;
}

export function defaultSocialImage(siteUrl: string, alt: string): SocialImage {
  return {
    url: absoluteUrl(siteUrl, DEFAULT_IMAGE.path),
    width: DEFAULT_IMAGE.width,
    height: DEFAULT_IMAGE.height,
    alt,
  };
}

/** The featured image's 1200×630 crop, or null when the article has none. */
export function articleSocialImage(
  article: Pick<PublicArticle, 'featuredImage'>,
): SocialImage | null {
  const image = article.featuredImage;
  if (!image) return null;
  return { ...image.ogImage, alt: image.altText };
}

type JsonLd = Record<string, unknown>;

/** The site's organization, which is the author and publisher of every article (D11). */
export function organizationJsonLd(siteUrl: string, name: string): JsonLd {
  return {
    '@type': 'Organization',
    name,
    url: absoluteUrl(siteUrl, '/'),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(siteUrl, LOGO.path),
      width: LOGO.width,
      height: LOGO.height,
    },
  };
}

/**
 * schema.org `Article`: headline, description, images, dates, language and sections, with the
 * organization as author and publisher. Without a featured image, the default site image.
 */
export function articleJsonLd(
  article: PublicArticle,
  { siteUrl, organizationName }: { siteUrl: string; organizationName: string },
): JsonLd {
  const url = absoluteUrl(siteUrl, articlePath(article.slug));
  const organization = organizationJsonLd(siteUrl, organizationName);
  const image = article.featuredImage;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: article.title,
    description: article.description,
    image: image
      ? [image.ogImage.url, largestUrl(image)]
      : [absoluteUrl(siteUrl, DEFAULT_IMAGE.path)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: article.language,
    ...(article.categories.length
      ? { articleSection: article.categories.map((c) => c.name) }
      : {}),
    author: organization,
    publisher: organization,
  };
}

export interface Breadcrumb {
  name: string;
  /** Path on this site. */
  path: string;
}

/** schema.org `BreadcrumbList`, the trail from the home page to the current page. */
export function breadcrumbJsonLd(siteUrl: string, trail: Breadcrumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(siteUrl, crumb.path),
    })),
  };
}

/**
 * JSON for a `<script type="application/ld+json">`. `<`, `>` and `&` are escaped as `<`…, so
 * a title like "</script><script>…" can't end the script element early; the JSON means the same.
 * U+2028 and U+2029 are escaped too, as older parsers treat them as line ends.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
