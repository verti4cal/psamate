# --- Shared base: toolchain for compiling better-sqlite3's native addon ---
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ bzip2

# --- Stage: build backend ---
FROM base AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npm run build

# --- Stage: production-only backend deps ---
# A separate install (package.json only, --omit=dev) rather than reusing
# backend-build's node_modules directly, since that one carries
# devDependencies. Built FROM base so it reuses the python3/make/g++
# toolchain already installed instead of provisioning — and compiling
# better-sqlite3's native addon against — its own from scratch.
FROM base AS backend-deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# --- Stage: build frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# --- Stage: runtime ---
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bzip2

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/psamate.db
ENV PORT=3000
ENV WEB_DIST_PATH=/app/web-dist

COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-build /app/package.json ./package.json
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/src/db/migrations ./dist/db/migrations
COPY --from=frontend-build /app/dist ./web-dist

VOLUME /data
EXPOSE 3000

CMD ["node", "dist/index.js"]
