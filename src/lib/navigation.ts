import {
  fetchPublicCategories,
  type ApiClientOptions,
  type PublicCategoryRef,
} from './public-api';

/**
 * The categories the header links to: every category with a published article, in the admins'
 * order (decision record, section 14). The header is on every page, the 404 page included, so a
 * failing API must not take the page down with it: the header then shows no categories, and the
 * failure is logged.
 */
export async function headerCategories(
  options: ApiClientOptions,
  log: (message: string) => void = console.error,
): Promise<PublicCategoryRef[]> {
  try {
    const categories = await fetchPublicCategories(options);
    return categories.map(({ slug, name }) => ({ slug, name }));
  } catch (error) {
    log(
      `Header categories unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

export function categoryPath(slug: string): string {
  return `/articles/category/${slug}`;
}

/** Whether a header link points at the page being shown, for `aria-current="page"`. */
export function isCurrentPath(linkPath: string, pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === linkPath;
}
