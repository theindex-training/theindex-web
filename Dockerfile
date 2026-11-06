# ---- build stage
FROM node:24-alpine AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage: the Astro Node server (server-rendered pages + static assets)
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV ASTRO_TELEMETRY_DISABLED=1
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# SITE_URL, APP_URL and API_INTERNAL_URL come from docker compose (see .env.example).
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
