import { IntlMessageFormat } from 'intl-messageformat';
import bg from './bg.json' with { type: 'json' };

/**
 * UI text for the site. Every user-facing string lives in a translation file (bg.json for now);
 * messages use ICU syntax, so plurals work as in the portal ("{count, plural, one {…} other {…}}").
 * Article content is not translated here: it comes from the API in its own language.
 */
export type Locale = 'bg';

export const DEFAULT_LOCALE: Locale = 'bg';

export type MessageParams = Record<string, string | number>;

type MessageTree = { [key: string]: string | MessageTree };

const MESSAGES: Record<Locale, MessageTree> = { bg };

const compiled = new Map<string, IntlMessageFormat>();

/** The raw ICU message for `key` (dot-separated, e.g. "header.login"), or undefined. */
export function lookup(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
): string | undefined {
  let node: string | MessageTree | undefined = MESSAGES[locale];
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Translates `key`. A missing key renders as the key itself, so a page never breaks over a
 * typo in production; `i18n-keys.spec.ts` fails the build-time checks for keys that don't exist.
 */
export function t(
  key: string,
  params?: MessageParams,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const message = lookup(key, locale);
  if (message === undefined) return key;

  const cacheKey = `${locale}:${key}`;
  let format = compiled.get(cacheKey);
  if (!format) {
    format = new IntlMessageFormat(message, locale);
    compiled.set(cacheKey, format);
  }
  return String(format.format(params));
}

/** Every key in a locale's file, dot-separated. Used by the key checks. */
export function allKeys(locale: Locale = DEFAULT_LOCALE): string[] {
  const keys: string[] = [];
  const walk = (node: MessageTree, prefix: string) => {
    for (const [name, value] of Object.entries(node)) {
      const key = prefix ? `${prefix}.${name}` : name;
      if (typeof value === 'string') keys.push(key);
      else walk(value, key);
    }
  };
  walk(MESSAGES[locale], '');
  return keys;
}
