FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml* bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun build src/index.ts --outdir dist --target bun

# Runtime
FROM base AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/console/dist ./console

ENV POCKETDEV_DATA_DIR=/opt/pocketdev/data
ENV POCKETDEV_PORT=4387
ENV POCKETDEV_WAKE_PORT=4388
ENV POCKETDEV_FIREWALL_LOCK_ENABLED=false

EXPOSE 4387
EXPOSE 4388

VOLUME ["/opt/pocketdev/data"]

CMD ["bun", "run", "dist/index.js"]
