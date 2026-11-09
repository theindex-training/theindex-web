import type { APIRoute } from 'astro';
import { getConfig } from '../lib/config';
import { SITEMAP_CONTENT_TYPE, sitemapXml } from '../lib/feeds';
import { fetchSitemap } from '../lib/public-api';

/**
 * The sitemap, built from the API on every request (decision record, sections 4 and 10). When
 * the API fails, the middleware answers with the 503 page, so crawlers come back later.
 */
export const GET: APIRoute = async () => {
  const { siteUrl, apiInternalUrl } = getConfig();
  const sitemap = await fetchSitemap({ apiUrl: apiInternalUrl });
  return new Response(sitemapXml(siteUrl, sitemap), {
    headers: { 'Content-Type': SITEMAP_CONTENT_TYPE },
  });
};
