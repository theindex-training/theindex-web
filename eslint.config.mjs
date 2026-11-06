// @ts-check
// Set up like theindex-api and theindex-front (ESLint flat config, type-checked typescript-eslint,
// Prettier as an ESLint rule for TypeScript), plus eslint-plugin-astro for .astro files.
import eslint from '@eslint/js';
import astro from 'eslint-plugin-astro';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/',
      '.astro/',
      'playwright-report/',
      'test-results/',
      'coverage/',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      eslintPluginPrettierRecommended,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Same relaxations as theindex-api and theindex-front.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // .astro files: Astro's recommended rules and the strict accessibility rules (jsx-a11y-x is the
  // ESLint 10 fork of jsx-a11y). Their formatting is checked by `npm run format:check` only.
  ...astro.configs['flat/recommended'],
  ...astro.configs['flat/jsx-a11y-strict'],
);
