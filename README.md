# theindex-web

Public website of The Index (articles), served at https://theindex.training.

Astro, server-rendered on Node. Content comes from [theindex-api](https://github.com/theindex-training/theindex-api); it is managed in the back office ([theindex-front](https://github.com/theindex-training/theindex-front), `app.theindex.training`).

- [`docs/decision-record.md`](docs/decision-record.md): what the site is, how it is built, and the MVP backlog.
- [`CLAUDE.md`](CLAUDE.md): conventions, folder structure, design system and testing rules.

## Getting started

Node 24 (see `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:4321
```

Configuration comes from the environment; see [`.env.example`](.env.example). In development every value has a default.

## Checks

```bash
npm run build
npm run check
npm run lint:check
npm run format:check
npm test
npm run e2e
```

## Docker

```bash
docker build -t theindex-web .
docker run -p 4321:4321 \
  -e SITE_URL=https://theindex.training \
  -e APP_URL=https://app.theindex.training \
  -e API_INTERNAL_URL=http://api:3000/api \
  theindex-web
```
