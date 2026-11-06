import { defineMiddleware } from 'astro:middleware';
import { getConfig } from './lib/config';
import { applyDefaultHeaders } from './lib/headers';

export const onRequest = defineMiddleware(async (_context, next) => {
  // Fail before rendering when the environment is incomplete (logged by Astro, answered with a
  // 500), instead of streaming a 200 page that breaks halfway through.
  getConfig();

  let response = await next();
  try {
    applyDefaultHeaders(response.headers, response.status);
  } catch {
    // Some responses (e.g. Response.redirect()) have immutable headers; copy them first.
    response = new Response(response.body, response);
    applyDefaultHeaders(response.headers, response.status);
  }
  return response;
});
