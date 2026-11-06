import { describe, expect, it } from 'vitest';
import { allKeys, lookup, t } from './index';

describe('t', () => {
  it('returns the Bulgarian text for a nested key', () => {
    expect(t('header.login')).toBe('Вход');
    expect(t('common.theme.dark')).toBe('Тъмна');
  });

  it('fills in ICU parameters', () => {
    expect(t('footer.copyright', { year: '2026' })).toBe('© 2026 The Index');
  });

  it('renders a missing key as the key itself', () => {
    expect(t('header.doesNotExist')).toBe('header.doesNotExist');
  });

  it('does not treat a group of keys as a message', () => {
    expect(lookup('common.theme')).toBeUndefined();
    expect(t('common.theme')).toBe('common.theme');
  });
});

describe('allKeys', () => {
  it('lists leaf keys with dots', () => {
    const keys = allKeys();
    expect(keys).toContain('common.theme.label');
    expect(keys).not.toContain('common.theme');
  });
});
