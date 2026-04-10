FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/docs/package.json ./apps/docs/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Build shared package
FROM base AS shared-build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npx tsc -p tsconfig.build.json

# Build the docs app
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/docs/node_modules ./apps/docs/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY apps/docs/src ./apps/docs/src
COPY apps/docs/public ./apps/docs/public
COPY apps/docs/server.ts ./apps/docs/server.ts
COPY apps/docs/package.json ./apps/docs/package.json
COPY apps/docs/tsconfig.json ./apps/docs/tsconfig.json
COPY apps/docs/vite.config.ts ./apps/docs/vite.config.ts
COPY packages/shared/ ./packages/shared/
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
COPY package.json ./
RUN cd apps/docs && npx vite build

# Production — use bun for fast runtime
FROM oven/bun:1 AS production
WORKDIR /app/apps/docs

# Root node_modules (hoisted deps like react)
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/package.json /app/package.json

# Docs app node_modules, built output, server
COPY --from=deps /app/apps/docs/node_modules ./node_modules
COPY --from=build /app/apps/docs/dist ./dist
COPY --from=build /app/apps/docs/server.ts ./server.ts
COPY --from=build /app/apps/docs/package.json ./package.json
COPY --from=build /app/apps/docs/tsconfig.json ./tsconfig.json

# Shared package (runtime dependency)
COPY --from=build /app/packages/shared /app/packages/shared

ENV NODE_ENV=production
ENV PORT=2222
EXPOSE 2222

CMD ["bun", "run", "server.ts"]
