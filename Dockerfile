# syntax=docker/dockerfile:1

# ---- Build stage: Vite + React + TypeScript をビルド ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY app/ ./
RUN pnpm build

# ---- Serve stage: ビルド成果物を nginx で配信 ----
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
