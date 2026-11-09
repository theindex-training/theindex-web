/**
 * The public part of theindex-api (`/api/public/...`), as the site's server reads it.
 *
 * The types mirror `src/public-content/public-content.ts` and `PublicMedia` in theindex-api by
 * hand (docs/decision-record.md, section 8). Dates arrive as ISO strings. Only the server calls
 * these: browser code never talks to the API.
 */

export interface PublicMediaFile {
  url: string;
  width: number;
  height: number;
}

export interface PublicMedia extends PublicMediaFile {
  altText: string;
  /** WebP versions for `srcset`, narrowest first. */
  variants: PublicMediaFile[];
  /** 1200×630 JPEG crop for social previews. */
  ogImage: PublicMediaFile;
}

export interface PublicCategoryRef {
  slug: string;
  name: string;
}

export interface ListItem {
  /** Inline HTML. */
  content: string;
  items: ListItem[];
}

/** A content block. Text fields are inline HTML (`b`, `i`, `a[href]`, `br`). */
export type PublicBlock =
  | { type: 'paragraph'; data: { text: string } }
  | { type: 'header'; data: { text: string; level: 2 | 3 } }
  | {
      type: 'list';
      data: { style: 'ordered' | 'unordered'; items: ListItem[] };
    }
  | { type: 'quote'; data: { text: string; caption: string } }
  | { type: 'image'; data: { image: PublicMedia; caption: string } }
  | {
      type: 'embed';
      data: { service: 'youtube'; videoId: string; caption: string };
    }
  | { type: 'delimiter'; data: Record<string, never> };

export interface PublicArticleSummary {
  slug: string;
  title: string;
  /** The excerpt, or the start of the text when the article has none. */
  excerpt: string;
  featuredImage: PublicMedia | null;
  categories: PublicCategoryRef[];
  /** First publish (`datePublished`), ISO 8601. */
  publishedAt: string;
  /** Last publish (`dateModified`), ISO 8601. */
  updatedAt: string;
}

export interface PublicArticle extends PublicArticleSummary {
  language: string;
  /** The SEO title, or the title. */
  seoTitle: string;
  /** The SEO description, else the excerpt, else the start of the text (≤160 characters). */
  description: string;
  content: { blocks: PublicBlock[] };
}

/** The API could not be reached or answered with an error other than 404. */
export class ApiUnavailableError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export interface ApiClientOptions {
  /** theindex-api as the server reaches it (`getConfig().apiInternalUrl`). */
  apiUrl: string;
  /** Injected in tests; the global fetch otherwise. */
  fetch?: typeof fetch;
  /** Give up after this long, so a hung API doesn't hold the reader's request. */
  timeoutMs?: number;
}

export const API_TIMEOUT_MS = 10_000;

/**
 * Article slugs as the API makes them (decision record, section 4): Latin letters, digits and
 * `-`, at most 80 characters. Anything else can't be an article, so it isn't sent to the API.
 */
const SLUG = /^[a-z0-9-]{1,80}$/;

export function isSlug(value: string | undefined): value is string {
  return value !== undefined && SLUG.test(value);
}

/** A published article by its slug, or null when there is none (404). */
export async function fetchPublicArticle(
  slug: string | undefined,
  options: ApiClientOptions,
): Promise<PublicArticle | null> {
  if (!isSlug(slug)) return null;
  return getJson<PublicArticle>(`/public/articles/${slug}`, options);
}

/**
 * GETs `path` under the API's URL. A 404 is null; any other failure (network, timeout, 5xx, a
 * body that isn't JSON) throws ApiUnavailableError.
 */
export async function getJson<T>(
  path: string,
  {
    apiUrl,
    fetch: doFetch = fetch,
    timeoutMs = API_TIMEOUT_MS,
  }: ApiClientOptions,
): Promise<T | null> {
  const url = `${apiUrl}${path}`;
  let response: Response;
  try {
    response = await doFetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ApiUnavailableError(
      `GET ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new ApiUnavailableError(
      `GET ${url} answered ${response.status}`,
      response.status,
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiUnavailableError(`GET ${url} did not answer with JSON`);
  }
}
