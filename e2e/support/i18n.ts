import { lookup, t as translate, type MessageParams } from '../../src/i18n';

/**
 * The text the site shows for a translation key (ICU params included). Selectors use it instead
 * of literal copy, as in theindex-front: reworded text doesn't break a test, a missing key does.
 */
export function t(key: string, params?: MessageParams): string {
  if (lookup(key) === undefined) {
    throw new Error(`Missing translation key: ${key}`);
  }
  return translate(key, params);
}
