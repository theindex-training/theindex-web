import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// Server-rendered on every request (docs/decision-record.md, D2 and D3): publishing in the back
// office shows up without a rebuild. Runtime settings (site URL, API URL) are read from the
// environment by src/lib/config.ts, not set here, so one image runs in every environment.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'never',
  i18n: {
    // Bulgarian only for now, without a URL prefix. Other languages get one later (/en/...).
    defaultLocale: 'bg',
    locales: ['bg'],
    routing: { prefixDefaultLocale: false },
  },
});
