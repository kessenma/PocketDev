#!/bin/bash
set -euo pipefail

# Build the PocketDev agent into a distributable tarball.
# Output: apps/web/public/agent-bundle.tar.gz
#
# Usage: bash scripts/build-agent-bundle.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$REPO_ROOT/apps/agent"
WEB_PUBLIC="$REPO_ROOT/apps/web/public"
BUNDLE_NAME="agent-bundle.tar.gz"
STAGING_DIR="$(mktemp -d)"

echo "Building PocketDev agent bundle..."

# 1. Install dependencies and build the agent
echo "  → Installing dependencies..."
cd "$REPO_ROOT"
pnpm install

echo "  → Building agent..."
cd "$AGENT_DIR"
bun run build

# 2. Stage files for the tarball
echo "  → Staging bundle..."
mkdir -p "$STAGING_DIR/pocketdev-agent"
cp "$AGENT_DIR/dist/index.js" "$STAGING_DIR/pocketdev-agent/index.js"
cp "$AGENT_DIR/src/db/schema.sql" "$STAGING_DIR/pocketdev-agent/schema.sql"

# 3. Create tarball
echo "  → Creating tarball..."
mkdir -p "$WEB_PUBLIC"
tar -czf "$WEB_PUBLIC/$BUNDLE_NAME" -C "$STAGING_DIR" pocketdev-agent

# 4. Clean up
rm -rf "$STAGING_DIR"

SIZE=$(du -h "$WEB_PUBLIC/$BUNDLE_NAME" | cut -f1)
echo "  ✓ Bundle created: apps/web/public/$BUNDLE_NAME ($SIZE)"
