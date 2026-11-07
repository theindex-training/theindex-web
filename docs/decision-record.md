# Decision record: public site and articles

The reference for building the public site of The Index (`theindex-web`) and the content features it needs in `theindex-api` and `theindex-front`. It records what was decided, why, and what the first version (MVP) contains. Update it when a decision changes; don't let the code and this file disagree.

- **Status:** agreed, MVP in progress (items 1–11 done, see section 12)
- **Decided:** 2026-11-05; changes since then are listed in section 15
- **Repos:** `theindex-web` (this repo, public site), `theindex-api` (data and endpoints), `theindex-front` (back office), `theindex-dev` (Docker templates, including the production compose file and the media container's nginx config; may become `theindex-infra`)

## 1. Context

The Index runs a gym portal (Angular SPA + NestJS API + Postgres) on `theindex.training`. We want a public journal of articles, in the spirit of [CrossFit Journal](https://journal.crossfit.com/) and [CrossFit Essentials](https://www.crossfit.com/essentials), that ranks in Google search.

Constraints that shaped the decisions:
- The content is public. Readers never log in.
- SEO matters: Google must receive real HTML with per-page metadata. The portal is a client-rendered SPA, so Google sees an empty shell.
- Same look and feel as the portal ("Chalk & Iron" design system).
- Content creators are not technical. They need a WordPress-like experience.
- One database and one API: later, the API sends weekly digest emails built from the articles, to trainees with accounts and to subscribers.
- Bulgarian only for now, with room for more languages.
- Videos live on YouTube. Images are self-hosted.
- No new paid providers for the MVP. Hosting stays on Contabo (VPS), DNS on Spaceship, routing on Traefik.

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | No WordPress or headless CMS. Content is built into our own API and back office. | The needs are a small subset of a CMS; one database and one set of accounts. |
| D2 | **Public site: a new Astro app** (`theindex-web`), server-rendered on Node. | Built for content: HTML with no framework JavaScript by default, islands for the few interactive parts, server rendering, sitemap and RSS packages. Angular SSR was the alternative; it ships and hydrates the Angular runtime for pages that are just text. |
| D3 | **Server-rendered on every request, with HTTP cache headers.** No rebuild to publish. | Publishing and unpublishing take effect at once. Traffic is low, so no shared cache in the MVP; the headers make a CDN a drop-in later. |
| D4 | **Content management lives in the portal** (`theindex-front`), under `/content`, with its own WordPress-like layout. | The portal becomes "The Index back office". Auth, roles, i18n, design system, tests and CI already exist. A separate back-office app was rejected as unneeded complexity. |
| D5 | **MVP: only ADMIN manages content.** No new role, no account management changes. | Keeps the API change small. Content writers, account management and display names are designed together in phase 2. |
| D6 | **Articles are stored as Editor.js JSON blocks**, not HTML. | Block editor close to WordPress's Gutenberg. The same blocks render to the site now and to digest emails later. Raw editor HTML never reaches readers. |
| D7 | **Domains:** public site on `theindex.training`, portal on `app.theindex.training`, images on `media.theindex.training`. | Clear separation. Losing old bookmarks, stored sessions, theme and language choices is accepted (few users). |
| D8 | **URLs:** `/articles/<slug>`, `/articles/category/<slug>`, later `/movements/<slug>`. Slugs are always Latin, transliterated from the Bulgarian title. | Readable, shareable links (Cyrillic turns into `%D0%BA…` when pasted). |
| D9 | **Images on the VPS** in a Docker volume, served by a small nginx container. Processed by the API (resize, WebP, EXIF stripped). Behind a storage interface. | About 200 MB a year; no new provider. Moving to object storage later means a new storage implementation, a one-time copy and a DNS change. |
| D10 | **Videos are YouTube embeds**, loaded only when the reader clicks play. | No video hosting. YouTube's player and cookies load only on request, and pages stay fast. |
| D11 | **Byline is a fixed "Екипът на The Index"** on every article. The owning account is stored but never shown. | Display names come in phase 2. Never show an email on the public site. |
| D12 | **Categories only, no tags.** Many categories per article, managed by admins. | Tags make duplicates and thin pages at 4–10 articles a month. Movements will later play the role of tags. |
| D13 | **Analytics in phase 2** (cookieless, free tier, most likely Umami). **Google Search Console at launch.** | No cookie banner, no cost. Search Console is how we see Google search performance and needs no script. |
| D14 | **Bulgarian only, multi-language ready:** every article and category has a `language`; articles have an optional `translationGroupId`. | Other languages later under a prefix (`/en/articles/...`), with `hreflang` links between versions. |

## 3. Architecture

```mermaid
flowchart LR
  reader(["Reader / Google"]) -->|"theindex.training"| web["web: Astro SSR"]
  reader -->|"media.theindex.training"| media["media: nginx, read-only"]
  admin(["Admin"]) -->|"app.theindex.training"| front["front: portal, nginx"]
  admin -->|"app.theindex.training/api"| api["api: NestJS"]
  web -->|"http://api:3000/api (internal network)"| api
  api --> db[("Postgres")]
  api -->|"writes images"| vol[("theindex_media volume")]
  media -->|"reads"| vol
```

- Traefik routes each host to its container and gets Let's Encrypt certificates by itself (HTTP challenge).
- The site calls the API over the internal Docker network only, so there is no CORS and no public hop.
- The portal keeps calling the relative `/api` on its own host, so its code doesn't change for the move to `app.`.

## 4. URLs and slugs

| Path | Page | Notes |
|---|---|---|
| `/` | Home | Featured article (the newest published one in the MVP) and the latest articles |
| `/articles` | All articles, newest first | `?page=2…`; `?q=` for search (search results are `noindex`) |
| `/articles/<slug>` | Article | 404 unless published |
| `/articles/category/<slug>` | Category | 404 when it has no published articles |
| `/preview?token=…` | Draft preview | `noindex`, `no-store`; token from the back office, short-lived |
| `/sitemap.xml`, `/rss.xml`, `/robots.txt` | | Generated from the API on request |
| `/login` | 301 to `https://app.theindex.training/login` | Only old portal path we keep |

**Slug rules** (articles and categories; one implementation in the API: `src/common/utils/slug.util.ts`, with `slug.util.spec.ts`):
- Generated from the title (or category name) with the official Bulgarian transliteration (Streamlined System, Закон за транслитерацията 2009):

  | а | б | в | г | д | е | ж | з | и | й | к | л | м | н | о | п | р | с | т | у | ф | х | ц | ч | ш | щ | ъ | ь | ю | я |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | a | b | v | g | d | e | zh | z | i | y | k | l | m | n | o | p | r | s | t | u | f | h | ts | ch | sh | sht | a | y | yu | ya |

  The law's two exceptions: `ия` at the end of a word becomes `ia` (София → `sofia`), and the word "България" becomes `bulgaria` (only the whole word: "Българията" → `balgariyata`). The accented `ѝ` and `ѐ` become `i` and `e`.
- Lowercase; Latin letters and digits kept, accents stripped (`é` → `e`), apostrophes dropped; letters outside the Bulgarian and Latin alphabets and everything else become `-`; repeated `-` collapsed and trimmed; at most 80 characters, cut at a word boundary.
- Examples: "Как да започнем с КросФит" → `kak-da-zapochnem-s-krosfit`; "Защо клековете са важни?" → `zashto-klekovete-sa-vazhni`.
- Unique per language. On a clash, add `-2`, `-3`… (shortening the base at a word so the result still fits). Reserved for articles: `category`.
- A title or name that gives no slug at all (e.g. only emoji) uses a fallback: `kategoria` for categories; the article fallback is chosen in item 6.
- An article's slug is **set at the first publish**, from the final title, or from a slug the admin chose in the draft (Latin `a-z`, `0-9`, `-` only). **After that it is fixed**, so shared links never break. A chosen slug that is reserved or taken is one of the publish problems (400). The fallback is `statia`. Changing published slugs, with redirects, is phase 2.
- A category slug is generated once and kept when the category is renamed; an admin can change it until a published article uses the category (the lock comes with item 6).

## 5. Article lifecycle and permissions

| State | Public site | Admin can |
|---|---|---|
| `DRAFT` (never published) | 404 | Edit, preview, publish, **delete permanently** (with confirmation) |
| `PUBLISHED` | Visible | Edit the working copy, preview, "Update" (publish the changes), discard changes, **unpublish** (with confirmation) |
| `UNPUBLISHED` (was published) | 404, so Google drops it | Edit, preview, republish, **delete permanently** (with confirmation) |

- Unpublish and permanent delete are both dangerous and both ask for confirmation. Permanent delete is refused for a published article: unpublish first.
- **Working copy:** autosave writes only to the article's draft. The published version changes only on Publish/Update. Without this, autosave would push half-written text to the live site.
- **Ownership:** each article stores `createdByAccountId` and `updatedByAccountId`. In the MVP they are informational (every admin can edit every article). **Deleting an account never deletes articles:** account delete is already a soft delete (status `DISABLED`), and the foreign keys use `ON DELETE SET NULL` in case a hard delete ever exists.
- **Phase 2:** a `CONTENT_WRITER` role who edits and deletes only their own articles, while admins keep access to all.

## 6. Data model (theindex-api)

New tables only; nothing existing changes. `synchronize` adds them (no migrations).

**`articles`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `language` | varchar(8), default `bg` | |
| `translationGroupId` | uuid, null | Links versions of the same article in different languages (later) |
| `status` | enum `DRAFT` / `PUBLISHED` / `UNPUBLISHED` | |
| `slug` | varchar(80), null | Unique with `language`; null until the first publish |
| `title`, `excerpt`, `content` (jsonb), `featuredMediaId`, `seoTitle`, `seoDescription` | | **Published version.** Empty until the first publish. |
| `plainText` | text | Derived from `content` on publish: search, description fallback, digest emails |
| `draft` | jsonb | **Working copy:** `{ title, excerpt, content, featuredMediaId, categoryIds, seoTitle, seoDescription, slug }` (`slug`: a chosen slug, before the first publish only) |
| `draftRevision` | int | Incremented on every draft save; used to detect two tabs editing at once (409) |
| `hasUnpublishedChanges` | boolean | Draft differs from the published version |
| `firstPublishedAt`, `lastPublishedAt`, `unpublishedAt` | timestamptz, null | `datePublished` / `dateModified` for SEO |
| `createdByAccountId`, `updatedByAccountId` | uuid, null, FK `accounts` `ON DELETE SET NULL` | |
| `createdAt`, `updatedAt` | timestamptz | |

**`article_categories`** (done, theindex-api#52): `id`, `language`, `name` (1–60 characters), `nameKey` (the lowercased name; internal, never returned), `slug`, `description` (optional, up to 300 characters; category page intro and meta description), `sortOrder`, timestamps. Unique indexes on `(language, slug)` and `(language, nameKey)`: slugs and names (ignoring case) are unique per language, and the database decides, so concurrent requests can't both win (409).
**`article_category_links`**: `articleId` + `categoryId` (`ON DELETE CASCADE` both ways). It holds the **published** categories; the draft holds `categoryIds`. Deleting a category removes its links and drops it from drafts' `categoryIds`; the articles stay.

**`media`** (done, theindex-api#51)

| Column | Notes |
|---|---|
| `id` | uuid, also the folder name: files are never overwritten, so they can be cached forever |
| `altText` | Required, 1–250 characters. Describes the image for screen readers and Google |
| `masterPath` | The master: upright, metadata removed, at most 4096 px on its longer side, in the upload's format (JPEG, PNG or WebP). Kept so variants can be regenerated later |
| `width`, `height` | Of the master |
| `variants` | jsonb: `[{ width, height, path }]`, WebP at 480 / 960 / 1600 / 2400 px (only the widths that fit; a smaller image gets one variant at its own width) |
| `ogPath` | 1200×630 JPEG crop, used when it is a featured image (social previews) |
| `originalFilename`, `sizeBytes`, `uploadedByAccountId` (`SET NULL`), `createdAt`, `updatedAt` | |

Captions are not on `media`: they live on the image block, because the same photo can have different captions in different articles. The featured image has no caption.

## 7. Content format (Editor.js)

Allowed blocks in the MVP. The API rejects any other type (400) and normalizes what it stores:

| Block | Stored as | Rendered as |
|---|---|---|
| Paragraph | `{ text }` with inline `<b>`, `<i>`, `<a href>` | `<p>` |
| Heading | `{ text, level: 2 \| 3 }` (the title is the only `h1`) | `<h2>`/`<h3>` |
| List | `{ style: ordered \| unordered, items }` | `<ol>`/`<ul>` |
| Quote | `{ text, caption }` | `<blockquote>` + `<cite>` |
| Image | `{ mediaId, caption }`, normalized from the image tool's output; the file URL is ignored | `<figure>` with `<img srcset sizes width height loading="lazy">` and `<figcaption>` |
| YouTube | `{ videoId, caption }`, parsed from the URL; the client's embed URL is never trusted | Thumbnail button; on click, an iframe from `youtube-nocookie.com` |
| Delimiter | `{}` | `<hr>` |

- Inline HTML is sanitized with an allowlist (`b`, `i`, `a[href]`, `br`; links only `http`, `https`, `mailto`) when the API saves, and again when the site renders.
- Editor.js's own output wrapper (`{ time, blocks, version }`) and the tool names (`paragraph`, `header`, `list`, `quote`, `image`, `embed`, `delimiter`) are kept. The back office maps the image and YouTube blocks back to the editor's tool data: the image URL comes from the media library, and the YouTube URLs are built from the id.
- Normalizing is idempotent: content the API returned saves back unchanged.
- The JSON body limit goes from Express's default 100 kB to 1 MB (a change in `main.ts`).

## 8. API changes (theindex-api)

All admin endpoints: `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(AccountRole.ADMIN)`. Public endpoints live under a separate `/api/public/...` prefix in their own controllers, so a missing guard can never expose drafts.

**Admin**
| Method and path | Purpose |
|---|---|
| `GET /api/articles?status&categoryId&search&page&pageSize` | Back-office list (draft title, status, `hasUnpublishedChanges`, dates) |
| `POST /api/articles` `{ title }` | Create a draft (the slug comes at the first publish) |
| `GET /api/articles/:id` | Full article: published version and draft |
| `PATCH /api/articles/:id/draft` `{ baseRevision, …fields }` | Autosave. 409 if `baseRevision` is stale |
| `POST /api/articles/:id/publish` `{ baseRevision }` | Validate and copy the draft at that revision over the published version (first publish, republish and "Update"); 409 if stale |
| `POST /api/articles/:id/unpublish` | `PUBLISHED` → `UNPUBLISHED` |
| `POST /api/articles/:id/discard-draft` `{ baseRevision }` | Reset the draft to the published version; 409 if stale |
| `DELETE /api/articles/:id` | Permanent; 409 when `PUBLISHED` |
| `POST /api/articles/:id/preview-token` | `{ token, expiresAt }`: a signed token, 30 minutes, for `/preview` on the site |
| `GET/POST/PATCH/DELETE /api/article-categories[/:id]` | Category management (done, theindex-api#52) |
| `POST /api/media` (multipart: `file`, `altText`) | Upload: JPEG, PNG or WebP, up to 15 MB, checked by decoding (not by extension); damaged files are a 400, larger ones a 413. Auto-rotate, strip EXIF (phone photos carry GPS), make variants (done, theindex-api#51) |
| `GET /api/media?page&pageSize`, `GET /api/media/:id`, `PATCH /api/media/:id` `{ altText }` | Media library. No delete in the MVP (articles may use the image) |

**Public (no auth, published content only)** (done, theindex-api#55)
| Method and path | Purpose |
|---|---|
| `GET /api/public/articles?category&q&page&pageSize` | Summaries, newest first publish first (an update doesn't move an article). `category` is a category slug (unknown: empty page). `q` searches title, excerpt and text with `ILIKE`, ignoring case (Postgres has no Bulgarian full-text config; fine at this size) |
| `GET /api/public/articles/:slug` | Article with blocks, image variants resolved to URLs, categories; 404 unless published |
| `GET /api/public/article-categories` | Categories with at least one published article, in `sortOrder`, with `articleCount` |
| `GET /api/public/article-categories/:slug` | One category; 404 when it has no published article |
| `GET /api/public/sitemap` | Slugs and `lastmod` for articles (last publish) and categories (the later of the category's own change and its articles' last publish) |
| `GET /api/public/preview?token=` | The draft as it is now (so a reload shows the latest autosave), any status; `no-store`; 401 for a bad or expired token |

- Lists return `{ items, total, page, pageSize }` (page size 12 by default, up to 50; `page` up to 10 000).
- **Public response shapes** (`src/public-content/public-content.ts` in theindex-api is the reference; the site's stub API mirrors it):
  - Summary: `slug`, `title`, `excerpt` (the excerpt, or the start of the text, up to 200 characters), `featuredImage`, `categories` (`{ slug, name }`, in `sortOrder`), `publishedAt` (first publish: `datePublished`), `updatedAt` (last publish: `dateModified`).
  - Article: the summary plus `language`, `seoTitle` (falls back to the title), `description` (SEO description, else the excerpt, else the start of the text, up to 160 characters) and `content.blocks`.
  - Image (featured or in a block): `url` (master), `width`, `height`, `altText`, `variants` (`[{ url, width, height }]`, WebP, narrowest first) and `ogImage` (1200×630). An image block is `{ type: 'image', data: { image, caption } }`; one whose image no longer exists is left out. The other blocks are stored ones without the editor's ids (YouTube: `videoId`).
  - Never in a public response: ids, the draft, revisions, account ids, file names.
  - Preview: the article shape from the draft, plus `preview: true` and `status`; `slug` (published or chosen, else null) and `publishedAt` can be null, and `updatedAt` is the last autosave.
- **Preview tokens** are JWTs signed with a key derived from `JWT_SECRET` for this purpose only, with their own audience, so a preview token never works as a login token and the other way round. No new setting.
- **Publish validation:** title 1–200 characters, at least one block, and the featured image, image blocks and categories still exist; a chosen slug isn't reserved or taken. A failure answers 400 listing every problem. Length limits (excerpt 300, SEO title 70, SEO description 160) apply on every draft save. Otherwise draft saves validate structure only, so incomplete work can always be saved.
- **Autosave** merges only the sent fields into the stored draft, inside the conditional `UPDATE` on `draftRevision`. A stale tab gets 409, and a change made to other fields meanwhile isn't written back over.
- Each lifecycle step locks the article row in a transaction.
- `GET /api/articles/:id` returns `published` (with the published `categoryIds`) and `draft`.
- **New config** (`.env.example`): `MEDIA_STORAGE_DIR` (`/data/media`), `MEDIA_PUBLIC_URL` (`https://media.theindex.training`), `MEDIA_MAX_UPLOAD_MB` (15). They are read on first use: in production without them, media requests answer 503, but the API starts and everything else works. In development they default to `./media-storage`, which the API serves at `/media-files`.
- **New dependencies:** `sharp` (prebuilt for Alpine), `sanitize-html`. Uploads use the multer that `@nestjs/platform-express` already ships.
- Tests follow the API's rules: specs for the slug, block normalization and sanitizer utils; `*.int-spec.ts` against Postgres for the services (lifecycle, permissions, 409s, `SET NULL`, search); e2e for the public endpoints.

## 9. Back office (theindex-front)

- **Routes** (`roleGuard`, `data.roles: ['ADMIN']`), lazy-loaded so the editor never touches the initial bundle:
  - `/content/articles`: list with a status filter and search, plus "New article" (done, theindex-front#80).
  - `/content/articles/new`: asks for the title (the API creates a draft with one), creates the draft and opens it in the editor.
  - `/content/articles/:id`: the editor, full screen outside the portal's navigation shell (its own top-level route, with the same guards plus a leave guard that saves first).
  - `/content/categories`: list, create, edit and delete (`/content/categories/new`, `/:id/edit`, `/:id/delete`). No details page: a row opens the edit page, which links to the delete page.
  - `/content` itself redirects to `/content/articles`; an Articles / Categories tab row links the two lists.
- **Editor layout (WordPress-like, full screen):**
  - Top bar: back, save status ("Запазено" / "Запазва се…" / error), Preview, and Publish ("Публикувай"), Publish again ("Публикувай отново", after an unpublish) or Update ("Обнови", only while the draft differs from the site). The outcome shows under it: what went live with a "View on site" link, or the API's list of problems.
  - Main column: title, then Editor.js.
  - Right panel: status, slug, excerpt, categories, featured image, SEO title and description, and at the bottom Discard changes (when the draft differs from the site), Unpublish (while published) or Delete permanently (otherwise), each with a confirmation dialog that says what happens. Below the text on phones.
- **Publish and Update** save what is left first, then publish that revision (the API's `baseRevision`); a field with an error, a failed save or a 409 publishes nothing. If the draft is saved again while publishing, the editor keeps showing "unpublished changes".
- **Autosave skips the body when its blocks read the same** as the last saved ones (ids, `time` and `version` ignored): Editor.js also reports changes that leave the text as it was, and saving those would mark a published article as changed for nothing.
- **Autosave:** about 2 seconds after the last change, and when leaving the page. Only the changed fields are sent, one request at a time, each based on the revision the last one returned. A field over its limit waits, with its error, while the others are saved. On a 409, the page tells the admin the article changed in another tab, stops saving and offers to reload.
- **Editor.js blocks:** only the ones in section 7. The list tool offers no checklists, start numbers or counter types and the quote no alignment, since the API keeps none of them. The image and YouTube blocks are our own tools that store `mediaId` / `videoId` directly, so the stored shape and the editor's data are the same (only the list's `meta` is mapped). A video comes from a pasted YouTube link or the toolbox's link field; the back office shows its thumbnail, not the player. The editor's own UI text is translated (БГ / EN).
- **Media picker:** a dialog to upload (alt text required) or choose from the library. Used by the featured image and the image block.
- **Preview:** saves what is left, then opens `<publicSiteUrl>/preview?token=…` in a new tab (the tab opens in the click, so it isn't blocked as a pop-up, and gets its address when the token arrives). New environment value `publicSiteUrl`: `https://theindex.training` in production, `http://localhost:4321` (the site's dev server) in development. It also builds the "View on site" links. Until compose phase B and item 14, those addresses don't serve the site yet.
- **Navigation:** a "Съдържание" item at the end of the Manage group, admins only (in the More sheet on phones). A URL-only area and the content-writer redirect on login are phase 2 decisions.
- The portal's rules apply as usual: all text in `bg.json` and `en.json`, `ARTICLE_STATUS` enum labels, design tokens only (Editor.js's default styles need overrides for dark mode), `Eager` change detection, characterization-test rules for new logic.

## 10. Public site (theindex-web)

- **Stack:** current stable Astro with the Node adapter (standalone server), TypeScript strict, `astro check`, ESLint + Prettier set up like the other repos, Vitest for logic, Playwright for journeys. The site renders on the server, so E2E runs against a small stub API server, not `page.route`.
- **Design:**
  - Copy the tokens and the global classes the site needs from `theindex-front/src/styles.scss`, which stays the source of truth.
  - Fonts: Sofia Sans and Sofia Sans Condensed, **self-hosted** (Fontsource, Cyrillic subsets), not loaded from Google's servers, for speed and GDPR.
  - Theme: light, dark or system, with the same pre-paint inline script and the same `theme` key. It's a separate origin, so it's a separate choice.
  - Logo from `public/brand/` of the portal.
- **Layout:**
  - Header: logo, "Статии", the categories, and "Вход" linking to `https://app.theindex.training`.
  - Footer: © The Index. No address, since there is more than one gym.
- **Interactivity (islands):** the theme switch and the YouTube player only.
- **i18n:** Astro i18n with `defaultLocale: 'bg'` and no prefix. UI text lives in translation files from day one. Dates are formatted for `bg` in `Europe/Sofia`.
- **SEO on every page:**
  - `<title>` ("<title> | The Index"), meta description (SEO description, excerpt or the start of the text), absolute canonical URL, `<html lang="bg">`.
  - Open Graph and Twitter card, using the featured image's 1200×630 crop or a default site image.
  - JSON-LD: `Article` (headline, image, dates, author and publisher: the organization "The Index") plus `BreadcrumbList`; `WebSite` on the home page.
  - Sitemap, RSS and `robots.txt`.
  - The featured image on the article page loads eagerly with `fetchpriority="high"`, because it is the largest element on screen and Google times it.
- **Cache headers:**
  - HTML: `public, max-age=60, stale-while-revalidate=300`, so an unpublish is visible within about a minute.
  - Hashed assets: one year, `immutable`. Media (set by the media container): one year, `immutable`.
  - Preview: `no-store` + `X-Robots-Tag: noindex`.
- **API down:** a 503 page with a retry, never a stack trace.
- **Config:** `API_INTERNAL_URL` (`http://api:3000/api`), `SITE_URL` (`https://theindex.training`), `APP_URL` (`https://app.theindex.training`). Image URLs come from the API.
- **Docker:** `node:24-alpine` multi-stage, port 4321. CI: lint, check, tests, build, E2E; on `main`, build the image to GHCR and redeploy over SSH, like the other repos. The workflow needs the owner's approval before it's added.

## 11. Infrastructure

Current state (2026-11-06, after compose phase A): `/opt/theindex/docker-compose.yml` on the Contabo VPS, a copy of `docker-compose.prod.yml` in `theindex-dev`, next to `/opt/theindex/media/default.conf` (`media/default.conf` there). The VPS copy is updated by hand, so change both together. Services:
- `traefik` (v3.6.1, Let's Encrypt HTTP challenge, www → apex redirect) and `db`.
- `api` (`/api` on both `theindex.training` and `app.theindex.training`) with `MEDIA_STORAGE_DIR=/data/media` on the `theindex_media` volume and `MEDIA_PUBLIC_URL=https://media.theindex.training`.
- `front` (`${FRONT_IMAGE}`, everything else on both hosts).
- `media` (`nginx:alpine`, the `theindex_media` volume read-only on `media.theindex.training`).

`CORS_ORIGIN` in `.env` lists both hosts until phase B. Each repo's deploy job runs `docker compose pull && docker compose up -d` for the whole stack.

**Target labels and services after phase B** (sketch; the real file is `docker-compose.prod.yml` in `theindex-dev`):

```yaml
  api:
    # ...as today, plus:
    environment:
      - MEDIA_STORAGE_DIR=/data/media
      - MEDIA_PUBLIC_URL=https://media.theindex.training
    volumes:
      - theindex_media:/data/media
    labels:
      - traefik.http.routers.api.rule=Host(`app.theindex.training`) && PathPrefix(`/api`)
      # CORS_ORIGIN=https://app.theindex.training in .env

  front:
    image: ${FRONT_IMAGE}
    labels:
      - traefik.http.routers.front.rule=Host(`app.theindex.training`) && !PathPrefix(`/api`)

  web:
    image: ${WEB_IMAGE}
    environment:
      - API_INTERNAL_URL=http://api:3000/api
      - SITE_URL=https://theindex.training
      - APP_URL=https://app.theindex.training
    labels:
      - traefik.http.routers.web.rule=Host(`theindex.training`)
      - traefik.http.services.web.loadbalancer.server.port=4321

  media:
    image: nginx:alpine
    volumes:
      - theindex_media:/srv/media:ro
      - ./media/default.conf:/etc/nginx/conf.d/default.conf:ro  # root /srv/media, cache headers, nosniff
    labels:
      - traefik.http.routers.media.rule=Host(`media.theindex.training`)

volumes:
  theindex_media:
```

Every router keeps its `-http` twin with the HTTPS redirect, `entrypoints`, `tls.certresolver=le` and `traefik.docker.network=theindex_internal`, as today. The `-http` twin's rule must list the same hosts as the HTTPS router, or plain-HTTP requests to the new host get a 404 instead of the redirect.

**The media container:**
- It mounts the volume at `/srv/media`, not nginx's default `/usr/share/nginx/html`. Docker copies an image's files into an empty named volume when it's first mounted, so nginx's `index.html` and `50x.html` would have ended up in the media volume and been served.
- `media/default.conf`: `root /srv/media`, GET and HEAD only, no directory listing, 404 at `/`, `Cache-Control: public, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff` (repeated in the `location`, because nginx drops server-level `add_header`s in a location that has its own). The long cache is safe because every upload gets its own `<media id>/` folder and its files are never rewritten.
- The file must exist on the VPS before the container starts; otherwise Docker creates an empty folder in its place and nginx doesn't start.
- The API runs as root and writes files as 644 and folders as 755, so nginx's worker can read them.

**Cutover order** (certificates are requested over HTTP, so DNS must resolve first or Let's Encrypt fails and rate-limits):
1. Spaceship DNS: add `A` records `app` and `media` with the same IP as `@`. Wait until they resolve. (Done 2026-11-06.)
2. Compose phase A: `api` and `front` answer on **both** `theindex.training` and `app.theindex.training` (`Host(...) || Host(...)`). Add the media volume and container. Use `${FRONT_IMAGE}`. Set `CORS_ORIGIN` to both hosts. Check `app.theindex.training` end to end. (Done 2026-11-06: both hosts, the HTTP redirects, a test upload and its headers on `media.` checked.)
3. Ship the API and back-office work. Admins write the first articles on `app.`.
4. Compose phase B: `theindex.training` → `web`. `front` and `api` keep only `app.` (both routers each), and `CORS_ORIGIN=https://app.theindex.training`. Update `docker-compose.prod.yml` in `theindex-dev` in the same change. Set the portal's `publicSiteUrl`. In `theindex-web`, set the Actions variable `DEPLOY_ENABLED=true` so merges to `main` redeploy the site (until then its pipeline builds and pushes the image but doesn't deploy).
5. Google Search Console: verify the domain with a TXT record in Spaceship and submit `https://theindex.training/sitemap.xml`.

**Backups:** Contabo's daily instance backups include the database and the media volume. A nightly `pg_dump` is recommended on top (a snapshot of a running Postgres isn't guaranteed to restore cleanly). **Never print or share `traefik/acme.json`**: it holds the certificates' private keys.

## 12. MVP backlog (in order)

Each item is roughly one PR. API items come first because the other two repos depend on them; the site scaffold can start in parallel against a stub API.

| # | Repo | Item | Depends on | Status |
|---|---|---|---|---|
| 1 | web | Scaffold: Astro, tokens, fonts, layout, header/footer, theme switch, 404 page, cache and security headers, lint/format/tests, Dockerfile, `CLAUDE.md` | | Done (theindex-web#2) |
| 2 | web | CI workflow (needs the owner's approval) | 1 | Done (theindex-web#3); deploy off until `DEPLOY_ENABLED` |
| 3 | api | Slug transliteration util | | Done (theindex-api#50) |
| 4 | api | Media: upload, processing, storage, library | | Done (theindex-api#51); uploads answer 503 until item 8 |
| 5 | api | Article categories: admin CRUD | 3 | Done (theindex-api#52) |
| 6 | api | Articles: entity, draft and lifecycle, block validation and sanitizing, admin endpoints; category slug lock and category delete cleanup | 3, 4, 5 | Done (theindex-api#53, #54) |
| 7 | api | Public articles and categories, search, sitemap feed, preview tokens | 6 | Done (theindex-api#55) |
| 8 | infra | DNS records, compose phase A (incl. the media volume, settings and container) | | Done (2026-11-06, on the VPS; templates in `theindex-dev`) |
| 9 | front | `/content` area, navigation, categories pages | 5 | Done (theindex-front#79) |
| 10 | front | Article list and editor: Editor.js, autosave, settings panel, media picker | 6 | Done (theindex-front#80) |
| 11 | front | Publish, update, unpublish, delete (with confirmations), preview | 7, 10 | Done (theindex-front#81) |
| 12 | web | Article page: block renderer, SEO head, JSON-LD, YouTube player | 1, 7 | |
| 13 | web | Home, article list, category pages, pagination, search | 12 | |
| 14 | web | Sitemap, RSS, robots, 503 page, `/login` redirect, preview route | 12 | |
| 15 | infra | Compose phase B, Search Console | 8, 11, 14 | |

## 13. Phase 2 and later

- `CONTENT_WRITER` role, account management in the portal, display names, author bylines and pages, "own articles only" permissions; whether writers get a URL-only back office with a redirect on login.
- Revisions (snapshot on every publish, restore into the draft).
- Analytics (cookieless; Umami free tier is the default).
- Subscribers and weekly digest emails (rendered by the API from the blocks).
- Comments (readers with accounts).
- Movements library (`/movements`), shared with the portal (records, trainings), and movement blocks in articles.
- Changing published slugs with redirects; a "featured" flag for the home page; other languages; media delete and cleanup; a CDN in front; nightly `pg_dump`; deploying the compose file from `theindex-dev` (today `docker-compose.prod.yml` is copied to the VPS by hand).

## 14. Open points (defaults in use until decided)

- **Home featured article:** the newest published article. A manual "featured" flag is phase 2.
- **Categories in the header:** all categories with published articles, in `sortOrder`. If the list grows too long, show a "Categories" menu instead.
- **Reading time** on article cards ("5 мин четене"): not in the MVP unless asked for.

## 15. Changes since 2026-11-05

- **2026-11-06, slugs (theindex-api#50):** added the law's second exception ("България" → `bulgaria`, whole word only), `ѝ`/`ѐ` → `i`/`e`, accent stripping, apostrophes and the fallback slug (section 4).
- **2026-11-06, media (theindex-api#51):** `media` also stores `masterPath` (the cleaned-up original, so variants can be regenerated) and `updatedAt`. Media settings never stop the API from starting; uploads answer 503 until they are set (sections 6, 8, 11).
- **2026-11-06, categories (theindex-api#52):**
  - The public category endpoints moved from item 5 to item 7: a category is only public once it has a published article, and articles come in item 6.
  - Category names are unique per language, ignoring case, enforced by a unique index on the lowercased name (`nameKey`).
  - Renaming a category keeps its slug.
  - The slug lock and the cleanup on delete come with item 6 (sections 4, 6, 8, 12).
- **2026-11-06, articles (theindex-api#53, #54):**
  - An article's slug is set at the first publish, not when the draft is created, so it follows the final title. A chosen slug that is reserved or taken is a publish problem (400). The fallback is `statia`.
  - Publish and discard take the `baseRevision` the admin saw (409 if stale).
  - Autosave merges only the sent fields into the draft.
  - Image and YouTube blocks are stored as `mediaId`/`videoId`; the back office maps them back to the editor's data.
  - The `article_category_links` table holds the published categories (sections 4, 6, 7, 8, 12).
- **2026-11-06, public endpoints (theindex-api#55):**
  - Public lists are ordered by first publish, so an update doesn't move an article to the top; the page size defaults to 12.
  - Public responses fill in the fallbacks: an excerpt from the text, the SEO title from the title, a description from the excerpt or the text.
  - An image block whose image is gone is left out of public pages and the preview.
  - The preview shows the draft as it is when the page loads, for any status. Its token is a JWT with a key derived from `JWT_SECRET`, so there is no new setting (section 8).
- **2026-11-06, compose phase A (item 8):**
  - DNS `A` records `app` and `media` added. `api` and `front` answer on both hosts, including their HTTP-to-HTTPS routers; `front` uses `${FRONT_IMAGE}`.
  - The `media` container mounts the volume at `/srv/media` instead of nginx's default folder, and its nginx config is `media/default.conf`.
  - `CORS_ORIGIN` lists both hosts until phase B.
  - The production compose file and the nginx config are versioned in `theindex-dev` (sections 11, 12, 13).
- **2026-11-06, back office categories (item 9, theindex-front#79):**
  - `/content` redirects to `/content/categories` until the article list lands in item 10.
  - The categories have list, create, edit and delete pages, with no details page.
  - On create, the slug and the order are optional, so the API makes the slug from the name and puts the category last. On edit, both are required.
  - The API's 409s (a taken name or slug, a slug locked by published articles) are shown as they come (section 9).
- **2026-11-06, back office articles (item 10, theindex-front#80):**
  - `/content` opens on the articles; "New article" asks for the title first, since the API creates a draft with one.
  - The editor is full screen outside the portal's navigation shell, with a leave guard that saves first.
  - Autosave sends only the changed fields, one request at a time; a field over its limit waits while the rest is saved; a 409 stops it until a reload.
  - The image and YouTube blocks are our own Editor.js tools storing `mediaId` / `videoId`; the list and quote tools offer only what the API keeps (section 9).
- **2026-11-07, back office publishing (item 11, theindex-front#81):**
  - The main button reads Publish, Publish again (after an unpublish) or Update (only while the draft differs from the site); it saves what is left first and publishes that revision. Problems from the API are listed under the top bar.
  - Discard changes is offered in the back office too (section 5 allowed it; the API had it since item 6), with Unpublish and Delete permanently, each behind a confirmation dialog.
  - Preview and "View on site" use the new `publicSiteUrl` (production `https://theindex.training`, development `http://localhost:4321`).
  - Autosave no longer saves a body whose blocks read the same as the stored ones, so Editor.js's own change events don't mark a published article as changed (section 9).
