# theindex-web

Public website of The Index (articles), served at `theindex.training`. Server-rendered Astro; content comes from theindex-api and is managed in the back office (theindex-front at `app.theindex.training`).

**`docs/decision-record.md` is the reference** for what this site is and how it is built: architecture, URLs, data model, caching, SEO and the ordered MVP backlog. Read it before starting a backlog item, and update it in the same PR when a decision changes.

## Stack
- Astro 7 with `output: 'server'` and `@astrojs/node` (standalone): every page renders on request, so publishing in the back office needs no rebuild.
- TypeScript ~6.0 (strict; `@astrojs/check` doesn't support TypeScript 7 yet), SCSS for the global stylesheet, scoped `<style>` in components.
- `intl-messageformat` for UI text (ICU messages, as in the portal).
- Fonts self-hosted from Fontsource (Sofia Sans, Sofia Sans Condensed; Latin + Cyrillic).
- Tests: Vitest 5 (+ jsdom per file) for logic, Playwright 1.63 (pinned to the pre-installed Chromium, like theindex-front) for journeys against the production build.
- Lint and format, set up like the other two repos: ESLint 10 flat config (`@eslint/js`, type-checked typescript-eslint, eslint-plugin-prettier for `.ts`; eslint-plugin-astro with the strict jsx-a11y-x rules for `.astro`), Prettier 3 with `prettier-plugin-astro`.
- Node 24 LTS (`.nvmrc`); Docker image `node:24-alpine` running the Astro server on port 4321.

## Commands
```bash
npm ci                 # install
npm run dev            # astro dev on :4321 (config defaults point at a local API on :3000 and the portal on :4200)
npm run build          # production build -> dist/ (server in dist/server, assets in dist/client)
npm start              # run the built server (node ./dist/server/entry.mjs); see "Configuration"
npm run check          # astro check: type-checks .astro and .ts, including e2e/ (CI gate)
npm test               # unit tests once (Vitest); `npm run test:watch` for watch mode
npm run e2e            # Playwright journeys; builds and starts the production server itself
npm run lint:check     # ESLint without fixing; fails on any error or warning (CI gate)
npm run lint           # NOTE: runs eslint --fix and rewrites files
# Both lint scripts run `astro sync` first: type-aware rules need Astro's generated types (.astro/),
# which a fresh checkout doesn't have until a sync, check or build.
npm run format:check   # Prettier check (CI gate)
npm run format         # prettier --write .
```
Astro collects anonymous telemetry; the Docker image and the E2E server set `ASTRO_TELEMETRY_DISABLED=1`. Locally, opt out with `npx astro telemetry disable` if you want to.

Known baseline (Nov 2026): build passes, all unit tests and E2E journeys pass, and `check`, `lint:check` and `format:check` are clean (0 errors, 0 warnings). Keep it that way.

## Folder structure
```
astro.config.ts          # server output, Node adapter, i18n (bg, no prefix), trailingSlash: 'never'
src/
  middleware.ts          # checks the config, then adds default headers (lib/headers.ts) to every response
  layouts/BaseLayout.astro  # <html lang>, <head> (title, description, icons, pre-paint theme script), fonts, skip link, header, <main>, footer
  components/            # SiteHeader, SiteFooter, Brand, ThemeSwitch
  pages/                 # routes (index.astro, 404.astro, later articles/…)
  styles/global.scss     # design tokens and global classes, copied from theindex-front (see "Design system")
  scripts/theme.ts       # theme switch logic (client side), mirrors the portal's ThemeService
  lib/                   # config.ts (runtime env), headers.ts (cache + security headers), dates.ts (Sofia time)
  i18n/                  # bg.json + t(); key checks in i18n-keys.spec.ts
public/                  # favicon, apple-touch-icon, brand/ logo (copied from theindex-front/public)
e2e/                     # Playwright journeys (*.e2e.ts) and support/ helpers
docs/decision-record.md  # decisions, architecture and MVP backlog
```

## Configuration
- Runtime settings come from the environment, read by `src/lib/config.ts` (`getConfig()`): `SITE_URL`, `APP_URL`, `API_INTERNAL_URL`. `.env.example` documents each one.
- They are read from `process.env` at runtime on purpose: Astro and Vite inline `import.meta.env` at build time, and one Docker image runs everywhere. Never read these through `import.meta.env`.
- In production (`NODE_ENV=production`, set by the image) all three are required. A missing or invalid value makes every request fail with a 500 and a log line naming it. In development each has a localhost default.
- The server also reads `HOST` and `PORT` (the `@astrojs/node` adapter).

## How this repo relates to the others
- **theindex-api** owns the data. The site calls it server side only, at `API_INTERNAL_URL` (in production `http://api:3000/api` on the internal Docker network), using the `/api/public/...` endpoints listed in the decision record. Browser code never calls the API.
- **theindex-front** is the back office at `app.theindex.training`. The header's "Вход" links to `APP_URL`. The back office opens draft previews on this site (`/preview?token=…`, backlog item 14).
- If a page needs a field or endpoint that doesn't exist, the change belongs in theindex-api first; flag cross-repo changes to the user.
- Deployment: the compose file on the VPS (`/opt/theindex`, templates in `theindex-dev`) runs this image as `web` behind Traefik. See section 11 of the decision record for the target routing and the cutover order.

## Design system
The look is the portal's "Chalk & Iron" design system. **theindex-front's `CLAUDE.md` ("Design system") and `src/styles.scss` are the source of truth**; don't fork the design here.
- `src/styles/global.scss` holds a verbatim copy of the portal's tokens (both themes), base element styles, `.visually-hidden`, `.btn` variants, `.notice`, text helpers and `.solo-card`, followed by a short "Public site only" section (page shell, `.container`, `.skip-link`). When a token or one of those classes changes in the portal, copy the change here. Add another portal class only when a page needs it, copied verbatim.
- Same rules as the portal:
  - Use tokens, never hard-coded colors (no hex, `rgb()`, named colors or gradients in component styles). A missing token goes into the portal first, then here.
  - Text pairs at 4.5:1 or more; `--accent-text`, not `--accent`, for colored text.
  - Spacing, radius and type scales from the tokens.
  - Touch targets of at least 44px.
  - Only the 768px and 1024px breakpoints.
  - Check new UI at 320px and 1280px, in both themes.
- The header and footer use the dark "iron" navigation look of the portal (`--nav-bg`), so use the `--nav-*` tokens there (including `--nav-accent` for focus outlines).
- Logo: `public/brand/the-index-logo-red.png` as an `<img>` with `width="640" height="270"`, sized with CSS `height`. The home link (`Brand.astro`) has an `aria-label` and `alt=""`.
- Theme: light / dark / system, stored in `localStorage` under `theme` (system clears it), applied as `data-theme` on `<html>`. The inline script in `BaseLayout.astro` applies it before the first paint; `src/scripts/theme.ts` wires the footer switch. Keep the two in sync, and in sync with the portal's model.
- Fonts: imported per weight and subset in `BaseLayout.astro` (`@fontsource/...`), never from Google's servers. Any new weight needs both the `latin` and `cyrillic` files.

## Pages and components
- Every page uses `BaseLayout` with a translated `title` (shown as "<title> | The Index") and, for indexable pages, a `description`.
- **No client-side JavaScript unless a feature needs it** (today: the theme switch only). Use an Astro `<script>` with the logic in `src/scripts/*.ts` (unit-tested), and keep it working without JavaScript where possible. No UI framework islands without a reason recorded in the decision record.
- Put comments in the frontmatter or `<script>`/`<style>`, not as `<!-- -->` in templates: HTML comments are sent to every reader.
- Accessibility: one `h1` per page; landmarks from the layout (`banner`, `main`, `contentinfo`); every image needs `alt` (empty only when decorative); keep focus visible. ESLint enforces the jsx-a11y strict rules on `.astro` files.
- Headers: `src/middleware.ts` adds `Cache-Control` to HTML (`public, max-age=60, stale-while-revalidate=300`; `no-store` for 5xx) and security headers, unless the page set them itself. A page that must not be cached (e.g. the draft preview) sets its own `Cache-Control`. Hashed assets under `/_astro/` get a one-year immutable header from the Node adapter.
- Dates: the gym's time zone is `Europe/Sofia` (`src/lib/dates.ts`); format with `Intl` and an explicit `timeZone`, never server-local time (the container runs in UTC).

## Internationalization
- Bulgarian only for now (`defaultLocale: 'bg'`, no URL prefix); other languages get a prefix later (`/en/...`).
- **All user-facing text goes through `t(key, params)` from `src/i18n`** with keys in `src/i18n/bg.json`, nested by feature (`common`, `header`, `footer`, `home`, `notFound`, …). That covers headings, links, labels, `aria-label`s, titles and descriptions.
- Messages are ICU (`intl-messageformat`): `{name}` params and `{count, plural, one {# статия} other {# статии}}`. Pass numbers that shouldn't be formatted (years) as strings.
- Use the portal's Bulgarian glossary and typographic quotes („…“) (see theindex-front's `CLAUDE.md`).
- Article content comes from the API in its own language and is not translated.
- `src/i18n/i18n-keys.spec.ts` fails when a key used as `t('…')` in `src/` is missing or a message isn't valid ICU. Write keys as literal strings so the check can find them.

## Testing
- **Unit (Vitest, `src/**/*.spec.ts`)**: logic in `lib/`, `scripts/`, `i18n/`. Files that need a DOM start with `// @vitest-environment jsdom`. Stub only browser boundaries (`matchMedia` with `vi.stubGlobal`, storage) and time (pass a `Date`, or `vi.setSystemTime`).
- **E2E (Playwright, `e2e/*.e2e.ts`)**: run against the production build with `NODE_ENV=production` and test URLs (`playwright.config.ts`). Viewports by tag: `@desktop` (1280×800), `@mobile` (390×844). The browser runs in `Europe/Sofia` with a `bg-BG` locale.
  - Selectors: roles, accessible names and labels only, or `data-testid` (`<feature>-<thing>`), never CSS classes or tag structure. Get the text for a name from `t()` in `e2e/support/i18n.ts`, which throws on a missing key.
  - The site renders on the server, so `page.route()` can't mock the API. When pages start reading from theindex-api, add a small stub API server under `e2e/support/`, start it from the Playwright config, and point `API_INTERNAL_URL` at it. Fixtures mirror the API's public response shapes.
- **Every test must fail if the behavior it covers breaks.** Assert outcomes (the text shown, the header sent, the value stored, the status code), not that a function ran. For new logic, break it once locally (flip a condition) and watch a test fail.

## Rules
- Don't push to `main`; work on a branch and open a PR.
- **Ask before changing `.github/workflows/` (deploy pipeline) or the `Dockerfile`.** `docker-ghcr.yml` runs, on every PR, a `lint` job (`lint:check`, `format:check`, `check`), a `test-and-build` job (unit tests, production build), an `e2e` job (the journeys) and `build-web` (Docker build, not pushed). On `main` and `v*` tags, once those pass, `build-web` pushes the image to GHCR and `deploy` redeploys only the `web` service on the VPS over SSH. Deploy runs only while the repository variable `DEPLOY_ENABLED` is `true`, which is set at the cutover (decision record, section 11).
- Never hard-code hosts or URLs of the other services; use `getConfig()`.
- Never hard-code colors (use tokens) or user-facing text (use `t()`).
- Keep page responses free of secrets and personal data: never render an author's email.
- Run `npm run build`, `npm run check`, `npm run lint:check`, `npm run format:check`, `npm test` and `npm run e2e` before pushing. Keep reformat-only changes out of unrelated PRs.
