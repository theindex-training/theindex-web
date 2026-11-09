import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, t } from '../i18n';
import { getConfig } from '../lib/config';
import { RSS_CONTENT_TYPE, RSS_ITEM_COUNT, rssXml } from '../lib/feeds';
import { fetchArticlePage } from '../lib/public-api';

/** The RSS feed of the newest articles, built from the API on every request (section 10). */
export const GET: APIRoute = async () => {
  const { siteUrl, apiInternalUrl } = getConfig();
  const { items } = await fetchArticlePage(
    { pageSize: RSS_ITEM_COUNT },
    { apiUrl: apiInternalUrl },
  );
  const xml = rssXml(
    {
      siteUrl,
      title: t('common.appName'),
      description: t('rss.description'),
      language: DEFAULT_LOCALE,
    },
    items,
  );
  return new Response(xml, { headers: { 'Content-Type': RSS_CONTENT_TYPE } });
};
