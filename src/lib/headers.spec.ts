import { describe, expect, it } from 'vitest';
import {
  ERROR_CACHE_CONTROL,
  PAGE_CACHE_CONTROL,
  SECURITY_HEADERS,
  applyDefaultHeaders,
} from './headers';

function html(extra: Record<string, string> = {}): Headers {
  return new Headers({ 'Content-Type': 'text/html', ...extra });
}

describe('applyDefaultHeaders', () => {
  it('lets pages be cached for a minute (stale for five more)', () => {
    const headers = html();
    applyDefaultHeaders(headers, 200);
    expect(headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
    expect(PAGE_CACHE_CONTROL).toBe(headers.get('Cache-Control'));
  });

  it('caches a 404 like a page, so an unpublished article stays gone', () => {
    const headers = html();
    applyDefaultHeaders(headers, 404);
    expect(headers.get('Cache-Control')).toBe(PAGE_CACHE_CONTROL);
  });

  it('never caches server errors', () => {
    const headers = html();
    applyDefaultHeaders(headers, 503);
    expect(headers.get('Cache-Control')).toBe(ERROR_CACHE_CONTROL);
    expect(ERROR_CACHE_CONTROL).toBe('no-store');
  });

  it('keeps a Cache-Control the page set itself', () => {
    const headers = html({ 'Cache-Control': 'no-store' });
    applyDefaultHeaders(headers, 200);
    expect(headers.get('Cache-Control')).toBe('no-store');
  });

  it('adds no Cache-Control to responses that are not HTML', () => {
    const headers = new Headers({ 'Content-Type': 'application/xml' });
    applyDefaultHeaders(headers, 200);
    expect(headers.has('Cache-Control')).toBe(false);
  });

  it('adds the security headers to every response', () => {
    const headers = new Headers({ 'Content-Type': 'application/xml' });
    applyDefaultHeaders(headers, 200);
    expect(Object.fromEntries(headers)).toMatchObject({
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'DENY',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    });
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(4);
  });

  it('keeps a security header the page set itself', () => {
    const headers = html({ 'X-Frame-Options': 'SAMEORIGIN' });
    applyDefaultHeaders(headers, 200);
    expect(headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });
});
