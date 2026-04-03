FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/agent/package.json ./apps/agent/package.json
COPY apps/agent/console/package.json ./apps/agent/console/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json
RUN pnpm install --frozen-lockfile

# Build workspace packages that are consumed through package exports.
FROM base AS shared-build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npx tsc -p tsconfig.build.json

# Build the web app
FROM base AS build
ARG VITE_APP_URL
ENV VITE_APP_URL=$VITE_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY apps/web/src ./apps/web/src
COPY apps/web/server.ts ./apps/web/server.ts
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY apps/web/vite.config.ts ./apps/web/vite.config.ts
COPY packages/shared/ ./packages/shared/
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
COPY packages/db/ ./packages/db/
COPY package.json ./
RUN cd apps/web && npx vite build

# Build the console SPA (served as static files by the agent)
FROM base AS console-build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agent/console/node_modules ./apps/agent/console/node_modules
COPY apps/agent/console/ ./apps/agent/console/
COPY packages/shared/package.json ./packages/shared/package.json
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
COPY package.json ./
RUN cd apps/agent/console && npx vite build

# Build the agent bundle (pre-built tarball served to install script)
FROM oven/bun:1 AS agent-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agent/node_modules ./apps/agent/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY apps/agent/ ./apps/agent/
COPY packages/shared/ ./packages/shared/
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
COPY package.json ./
RUN cd apps/agent && bun build src/index.ts --outdir dist --target bun
# Stage the tarball contents
RUN mkdir -p /tmp/bundle/pocketdev-agent \
    && cp apps/agent/dist/index.js /tmp/bundle/pocketdev-agent/ \
    && cp -r apps/agent/drizzle /tmp/bundle/pocketdev-agent/drizzle
COPY --from=console-build /app/apps/agent/console/dist /tmp/bundle/pocketdev-agent/console
RUN tar -czf /tmp/agent-bundle.tar.gz -C /tmp/bundle pocketdev-agent

# Production — use bun for fast runtime
FROM oven/bun:1 AS production
WORKDIR /app/apps/web

# Root node_modules (hoisted deps like react)
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/package.json /app/package.json

# Web app node_modules, built output, server, and runtime source
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/server.ts ./server.ts
COPY --from=build /app/apps/web/src ./src
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/apps/web/tsconfig.json ./tsconfig.json

# Shared package (runtime dependency)
COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/packages/db /app/packages/db

# Install script and agent bundle
COPY apps/web/install.sh ./install.sh
COPY --from=agent-build /tmp/agent-bundle.tar.gz ./public/agent-bundle.tar.gz

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "server.ts"]
