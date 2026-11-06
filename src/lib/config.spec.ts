import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const PRODUCTION_ENV = {
  SITE_URL: 'https://theindex.training',
  APP_URL: 'https://app.theindex.training',
  API_INTERNAL_URL: 'http://api:3000/api',
};

describe('loadConfig', () => {
  it('reads all three URLs in production', () => {
    expect(loadConfig(PRODUCTION_ENV, { production: true })).toEqual({
      siteUrl: 'https://theindex.training',
      appUrl: 'https://app.theindex.training',
      apiInternalUrl: 'http://api:3000/api',
    });
  });

  it('uses local defaults in development', () => {
    expect(loadConfig({}, { production: false })).toEqual({
      siteUrl: 'http://localhost:4321',
      appUrl: 'http://localhost:4200',
      apiInternalUrl: 'http://localhost:3000/api',
    });
  });

  it('lets the environment override a development default', () => {
    const config = loadConfig(
      { APP_URL: 'https://app.example.test' },
      { production: false },
    );
    expect(config.appUrl).toBe('https://app.example.test');
    expect(config.siteUrl).toBe('http://localhost:4321');
  });

  it('requires every value in production, naming each missing one', () => {
    expect(() =>
      loadConfig(
        { SITE_URL: 'https://theindex.training' },
        { production: true },
      ),
    ).toThrow(/APP_URL is required; API_INTERNAL_URL is required/);
  });

  it('treats a blank value as missing', () => {
    expect(() =>
      loadConfig({ ...PRODUCTION_ENV, APP_URL: '  ' }, { production: true }),
    ).toThrow(/APP_URL is required/);
  });

  it('rejects values that are not absolute http(s) URLs', () => {
    expect(() =>
      loadConfig(
        { ...PRODUCTION_ENV, SITE_URL: 'theindex.training' },
        { production: true },
      ),
    ).toThrow(/SITE_URL must be an absolute http\(s\) URL/);
    expect(() =>
      loadConfig(
        { ...PRODUCTION_ENV, APP_URL: 'ftp://app.theindex.training' },
        { production: true },
      ),
    ).toThrow(/APP_URL must be an absolute http\(s\) URL/);
  });

  it('drops trailing slashes, so paths can be appended safely', () => {
    const config = loadConfig(
      {
        ...PRODUCTION_ENV,
        SITE_URL: 'https://theindex.training/',
        API_INTERNAL_URL: 'http://api:3000/api/',
      },
      { production: true },
    );
    expect(config.siteUrl).toBe('https://theindex.training');
    expect(config.apiInternalUrl).toBe('http://api:3000/api');
  });
});
