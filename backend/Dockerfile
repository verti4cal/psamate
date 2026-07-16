FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ bzip2
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bzip2
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

VOLUME /data
ENV DATABASE_PATH=/data/psamate.db
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
