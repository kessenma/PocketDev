# @pocketdev/app-icon

Single source of truth for PocketDev app icons across all platforms. Drop one 1024x1024 PNG, run one command, and all iOS, Android, and web icons are generated and distributed to the correct locations in the monorepo.

## Usage

```bash
# Generate all sizes + copy to platform targets
pnpm icons

# Or run steps separately
pnpm icons:generate     # source/icon-1024.png → generated/
pnpm icons:distribute   # generated/ → iOS, Android, web targets
```

## Source Icon

Place your master icon at:

```
packages/shared/app-icon/source/icon-1024.png
```

Requirements:
- PNG format, 1024x1024 minimum
- Square aspect ratio
- No transparency recommended (Android round icons use circular masking)

## What Gets Generated

### iOS (`generated/ios/`)

9 PNGs for the Xcode asset catalog + `Contents.json`:

| Point Size | Scales | Pixel Sizes |
|-----------|--------|-------------|
| 20x20 | 2x, 3x | 40, 60 |
| 29x29 | 2x, 3x | 58, 87 |
| 40x40 | 2x, 3x | 80, 120 |
| 60x60 | 2x, 3x | 120, 180 |
| 1024x1024 | 1x | 1024 (App Store) |

### Android (`generated/android/`)

Square + round icons for each density bucket, plus Play Store icon:

| Density | Size | Files |
|---------|------|-------|
| mdpi | 48x48 | ic_launcher.png, ic_launcher_round.png |
| hdpi | 72x72 | ic_launcher.png, ic_launcher_round.png |
| xhdpi | 96x96 | ic_launcher.png, ic_launcher_round.png |
| xxhdpi | 144x144 | ic_launcher.png, ic_launcher_round.png |
| xxxhdpi | 192x192 | ic_launcher.png, ic_launcher_round.png |
| — | 512x512 | playstore-icon.png |

### Web (`generated/web/`)

- `favicon.ico` (multi-size: 16, 32, 48)
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`, `android-chrome-512x512.png`
- `site.webmanifest`

## Distribution Targets

| Generated | Distributed To |
|-----------|---------------|
| `generated/ios/*` | `apps/mobile/ios/Mobile/Images.xcassets/AppIcon.appiconset/` |
| `generated/android/mipmap-*` | `apps/mobile/android/app/src/main/res/` |
| `generated/android/playstore-icon.png` | `apps/mobile/android/playstore-icon.png` |
| `generated/web/*` | `apps/web/public/` |
| `generated/web/*` | `apps/agent/console/public/` |

## File Structure

```
packages/shared/app-icon/
├── source/
│   └── icon-1024.png       # Master icon (committed)
├── generated/               # All output (gitignored)
│   ├── ios/
│   ├── android/
│   └── web/
├── scripts/
│   ├── generate.ts          # Resize source → generated/
│   └── distribute.ts        # Copy generated/ → platform targets
├── package.json
└── .gitignore
```
