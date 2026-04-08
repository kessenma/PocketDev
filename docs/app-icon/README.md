# App Icon

This folder documents the shared app icon pipeline at `packages/shared/app-icon/`.

## Overview

A single 1024x1024 source PNG generates all platform-specific icons (iOS, Android, web) and distributes them to the correct locations across the monorepo.

```bash
pnpm icons   # generate + distribute in one step
```

## Detailed Docs

Full size tables, distribution targets, and file structure are in the package README:

- [`packages/shared/app-icon/README.md`](../../packages/shared/app-icon/README.md)

## How It Fits Together

```
source/icon-1024.png
        │
        ▼  pnpm icons:generate (sharp)
   generated/
   ├── ios/         → apps/mobile/ios/.../AppIcon.appiconset/
   ├── android/     → apps/mobile/android/.../res/mipmap-* + playstore-icon.png
   └── web/         → apps/web/public/ + apps/agent/console/public/
        │
        ▼  pnpm icons:distribute
   copied to platform targets
```

## When to Re-run

Run `pnpm icons` any time you update the source icon. The generated files in platform targets are committed to git, so the pipeline only needs to run when the icon changes.
