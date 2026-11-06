/**
 * Runtime configuration of the site's server, read from the environment when the server starts.
 *
 * It reads `process.env` on purpose: Astro and Vite inline `import.meta.env` values at build time,
 * and the same Docker image must run with different URLs. See `.env.example` for each value.
 */
export interface SiteConfig {
  /** Public URL of this site, without a trailing slash, e.g. https://theindex.training */
  siteUrl: string;
  /** The back office (theindex-front), e.g. https://app.theindex.training */
  appUrl: string;
  /** theindex-api as the server reaches it, e.g. http://api:3000/api */
  apiInternalUrl: string;
}

type Env = Record<string, string | undefined>;

const SETTINGS: { key: keyof SiteConfig; env: string; devDefault: string }[] = [
  { key: 'siteUrl', env: 'SITE_URL', devDefault: 'http://localhost:4321' },
  { key: 'appUrl', env: 'APP_URL', devDefault: 'http://localhost:4200' },
  {
    key: 'apiInternalUrl',
    env: 'API_INTERNAL_URL',
    devDefault: 'http://localhost:3000/api',
  },
];

/**
 * Builds the config from `env`. In production every value is required, so a missing setting
 * fails loudly instead of sending links to localhost; in development each has a default.
 */
export function loadConfig(
  env: Env,
  { production }: { production: boolean },
): SiteConfig {
  const config = {} as SiteConfig;
  const problems: string[] = [];

  for (const { key, env: name, devDefault } of SETTINGS) {
    const raw = env[name]?.trim() || (production ? undefined : devDefault);
    if (!raw) {
      problems.push(`${name} is required`);
      continue;
    }
    const url = parseHttpUrl(raw);
    if (!url) {
      problems.push(`${name} must be an absolute http(s) URL, got "${raw}"`);
      continue;
    }
    config[key] = url;
  }

  if (problems.length) {
    throw new Error(`Invalid site configuration: ${problems.join('; ')}`);
  }
  return config;
}

/** The URL without a trailing slash, or undefined if it isn't an absolute http(s) URL. */
function parseHttpUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.href.replace(/\/+$/, '');
  } catch {
    return undefined;
  }
}

let cached: SiteConfig | undefined;

/** The server's config, loaded once from `process.env`. */
export function getConfig(): SiteConfig {
  cached ??= loadConfig(process.env, {
    production: process.env.NODE_ENV === 'production',
  });
  return cached;
}
