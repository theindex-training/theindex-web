import type { APIRoute } from 'astro';
import { getConfig } from '../lib/config';
import { ROBOTS_CONTENT_TYPE, robotsTxt } from '../lib/feeds';

/** robots.txt, with the sitemap's absolute address from SITE_URL (a route, not a static file). */
export const GET: APIRoute = () =>
  new Response(robotsTxt(getConfig().siteUrl), {
    headers: { 'Content-Type': ROBOTS_CONTENT_TYPE },
  });
