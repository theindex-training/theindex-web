import { defineMiddleware } from 'astro:middleware';
import { getConfig } from './lib/config';
import { applyDefaultHeaders } from './lib/headers';
import { ApiUnavailableError } from './lib/public-api';

/** The route that renders the 503 page; it only answers as a rewrite from here. */
export const UNAVAILABLE_ROUTE = '/503';

export const onRequest = defineMiddleware(async (context, next) => {
  // Fail before rendering when the environment is incomplete (logged by Astro, answered with a
  // 500), instead of streaming a 200 page that breaks halfway through.
  getConfig();

  let response: Response;
  try {
    response = await next();
  } catch (error) {
    // The API is down or failing (decision record, section 10): the reader gets the 503 page
    // with a way to try again, never a stack trace. Any other error is a bug, left to Astro.
    if (!(error instanceof ApiUnavailableError)) throw error;
    console.error(
      `${context.request.method} ${context.url.pathname}: ${error.message}`,
    );
    context.locals.retryPath = `${context.url.pathname}${context.url.search}`;
    const page = await context.rewrite(UNAVAILABLE_ROUTE);
    response = new Response(page.body, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: page.headers,
    });
  }

  try {
    applyDefaultHeaders(response.headers, response.status);
  } catch {
    // Some responses (e.g. Response.redirect()) have immutable headers; copy them first.
    response = new Response(response.body, response);
    applyDefaultHeaders(response.headers, response.status);
  }
  return response;
});
