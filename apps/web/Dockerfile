FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY patches/ ./patches/
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
COPY apps/web/public ./apps/web/public
COPY apps/web/server.ts ./apps/web/server.ts
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY apps/web/vite.config.ts ./apps/web/vite.config.ts
COPY packages/shared/ ./packages/shared/
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
COPY packages/db/ ./packages/db/
COPY package.json ./
RUN cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx vite build

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

# Install script and canonical version file
COPY apps/web/install.sh ./install.sh
COPY VERSION ./VERSION

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "server.ts"]
