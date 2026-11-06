import { defineConfig, devices } from '@playwright/test';

/**
 * E2E journeys against the production build: `astro build`, then the real Node server, so pages,
 * middleware and headers are exactly what the Docker image serves. Journeys pick their viewports
 * with tags, as in theindex-front: `@desktop` (1280×800) and/or `@mobile` (390×844).
 *
 * The site renders on the server, so API calls can't be intercepted in the browser with
 * page.route(). Once pages read from theindex-api, the journeys will start a stub API server
 * and point API_INTERNAL_URL at it.
 */
const PORT = 4322;
export const APP_URL = 'https://app.example.test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI']
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    timezoneId: 'Europe/Sofia',
    locale: 'bg-BG',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      grep: /@desktop/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      grep: /@mobile/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run build && node ./dist/server/entry.mjs',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    env: {
      NODE_ENV: 'production',
      ASTRO_TELEMETRY_DISABLED: '1',
      HOST: '127.0.0.1',
      PORT: String(PORT),
      SITE_URL: `http://127.0.0.1:${PORT}`,
      APP_URL,
      // Nothing listens here yet; no page calls the API so far.
      API_INTERNAL_URL: 'http://127.0.0.1:4399/api',
    },
  },
});
