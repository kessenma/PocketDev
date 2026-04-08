# App Icon Package

Shared icon generation and distribution for PocketDev. One 1024x1024 source PNG produces all platform-specific icons.

## Scripts

- `generate.ts` — Reads `source/icon-1024.png`, uses `sharp` to resize into all iOS/Android/Web sizes, outputs to `generated/`. Uses `png-to-ico` for `favicon.ico`. Android round icons use an SVG circle mask with `dest-in` composite blend.
- `distribute.ts` — Copies from `generated/` to platform target directories across the monorepo. Merges into existing directories (doesn't delete other files in targets).

## Key Details

- `generated/` is gitignored — only `source/icon-1024.png` is committed
- iOS `Contents.json` is generated programmatically with correct `filename` fields
- Android round icons are created by compositing a circular SVG mask (`dest-in` blend)
- Web icons go to both `apps/web/public/` and `apps/agent/console/public/`
- Root commands: `pnpm icons`, `pnpm icons:generate`, `pnpm icons:distribute`

## Dependencies

- `sharp` — image resizing and compositing
- `png-to-ico` — multi-size ICO generation
- `tsx` — TypeScript script runner
