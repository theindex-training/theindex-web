import { defineConfig } from 'vitest/config';

// Unit tests for plain TypeScript logic (src/**/*.spec.ts). Pages and components are covered by
// the Playwright journeys in e2e/, which run against the built server.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
