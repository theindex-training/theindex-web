import type { APIRoute } from 'astro';
import { getConfig } from '../lib/config';

/**
 * `/login` was the portal's login page while the portal lived on this domain; it is the only old
 * portal path the site keeps (decision record, section 4). It moves permanently to the back
 * office's login page.
 */
export const GET: APIRoute = () =>
  new Response(null, {
    status: 301,
    headers: { Location: `${getConfig().appUrl}/login` },
  });
