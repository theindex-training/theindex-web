import type { PublicMedia } from './public-api';

/**
 * How wide an image in the article column is drawn, for `sizes`: the column is at most 44rem
 * (see ArticlePage styles), and below that the page width minus the 16px gutters.
 */
export const ARTICLE_IMAGE_SIZES =
  '(min-width: 47rem) 44rem, calc(100vw - 2rem)';

/** `srcset` from the WebP variants ("url 480w, url 960w, …"); empty when there are none. */
export function srcsetOf(image: PublicMedia): string {
  return image.variants.map((v) => `${v.url} ${v.width}w`).join(', ');
}

/**
 * The `src` for browsers that ignore `srcset`: the widest variant up to `maxWidth`, else the
 * narrowest one, else the master (which can be up to 4096 px, so it is the last resort).
 */
export function fallbackSrc(image: PublicMedia, maxWidth = 1600): string {
  const fitting = image.variants.filter((v) => v.width <= maxWidth);
  const pick = fitting.at(-1) ?? image.variants[0];
  return pick?.url ?? image.url;
}

/** The largest file of the image (the widest variant or the master, whichever is wider). */
export function largestUrl(image: PublicMedia): string {
  const widest = image.variants.at(-1);
  return widest && widest.width > image.width ? widest.url : image.url;
}
