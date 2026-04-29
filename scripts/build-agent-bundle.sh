#!/bin/bash
set -euo pipefail

# Build the PocketDev agent into a distributable tarball.
# Output: apps/web/public/agent-bundle.tar.gz
#
# Includes:
#   - dist/index.js    (bundled agent server)
#   - drizzle/         (SQLite migration files)
#   - console/         (built console SPA static files)
#
# Usage: bash scripts/build-agent-bundle.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$REPO_ROOT/apps/agent"
CONSOLE_DIR="$AGENT_DIR/console"
WEB_PUBLIC="$REPO_ROOT/apps/web/public"
BUNDLE_NAME="agent-bundle.tar.gz"
STAGING_DIR="$(mktemp -d)"

echo "Building PocketDev agent bundle..."

# 1. Install dependencies (skipped in CI — workflow already ran pnpm install)
if [ -z "${CI:-}" ]; then
  echo "  → Installing dependencies..."
  cd "$REPO_ROOT"
  pnpm install
else
  echo "  → Skipping install (CI environment detected)"
fi

# 2. Build console SPA
echo "  → Building console SPA..."
cd "$CONSOLE_DIR"
pnpm build

# 3. Build agent
echo "  → Building agent..."
cd "$AGENT_DIR"
bun run build

# 4. Stage files for the tarball
echo "  → Staging bundle..."
mkdir -p "$STAGING_DIR/pocketdev-agent"

# Determine version: prefer AGENT_VERSION env var (set by CI), fall back to install.sh
if [ -z "${AGENT_VERSION:-}" ]; then
  AGENT_VERSION=$(sed -n 's/^POCKETDEV_VERSION="\([^"]*\)".*/\1/p' "$REPO_ROOT/apps/web/install.sh")
fi
AGENT_VERSION="${AGENT_VERSION#v}"  # strip leading 'v' from git tags (e.g. v0.3.0 → 0.3.0)
if [ -z "$AGENT_VERSION" ]; then
  echo "ERROR: Could not determine AGENT_VERSION" >&2; exit 1
fi
echo "{\"version\":\"$AGENT_VERSION\"}" > "$STAGING_DIR/pocketdev-agent/version.json"
echo "  → Agent version: $AGENT_VERSION"

cp "$AGENT_DIR/dist/index.js" "$STAGING_DIR/pocketdev-agent/index.js"

# Copy Drizzle migrations
cp -r "$AGENT_DIR/drizzle" "$STAGING_DIR/pocketdev-agent/drizzle"

# Copy console SPA build output
cp -r "$CONSOLE_DIR/dist" "$STAGING_DIR/pocketdev-agent/console"

# 5. Create tarball
echo "  → Creating tarball..."
mkdir -p "$WEB_PUBLIC"
tar -czf "$WEB_PUBLIC/$BUNDLE_NAME" -C "$STAGING_DIR" pocketdev-agent

# 6. Archive versioned copy for rollback support
mkdir -p "$WEB_PUBLIC/agent-versions"
cp "$WEB_PUBLIC/$BUNDLE_NAME" "$WEB_PUBLIC/agent-versions/${AGENT_VERSION}.tar.gz"
echo "  → Archived version: apps/web/public/agent-versions/${AGENT_VERSION}.tar.gz"

# 7. Clean up
rm -rf "$STAGING_DIR"

SIZE=$(du -h "$WEB_PUBLIC/$BUNDLE_NAME" | cut -f1)
echo "  ✓ Bundle created: apps/web/public/$BUNDLE_NAME ($SIZE)"
