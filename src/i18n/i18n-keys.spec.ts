import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import { allKeys, lookup } from './index';

// Like the portal's i18n-keys.spec.ts: every key the code uses must exist, and every message must
// be valid ICU. Keys are found as the first argument of t('…') in .astro and .ts files under src/.

const SRC = join(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(astro|ts)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')
      ? [path]
      : [];
  });
}

function usedKeys(): { key: string; file: string }[] {
  const pattern = /\bt\(\s*'([a-zA-Z0-9_.]+)'/g;
  return sourceFiles(SRC).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(pattern)].map((match) => ({
      key: match[1],
      file: relative(SRC, file),
    })),
  );
}

describe('translation keys', () => {
  it('finds the keys the code uses (the scan itself works)', () => {
    expect(usedKeys().map(({ key }) => key)).toContain('header.login');
  });

  it('defines every key used in src/', () => {
    const missing = usedKeys().filter(({ key }) => lookup(key) === undefined);
    expect(missing).toEqual([]);
  });

  it('has only valid ICU messages', () => {
    const invalid = allKeys().filter((key) => {
      try {
        new IntlMessageFormat(lookup(key) ?? '', 'bg');
        return false;
      } catch {
        return true;
      }
    });
    expect(invalid).toEqual([]);
  });
});
