# Mobile Design System (Bauhaus)

## Overview

PocketDev mobile uses a Bauhaus-inspired design system with bold accent colors, geometric shapes, and strong typography. All components consume theme tokens from `@pocketdev/shared/theme` via the `ThemeContext`.

## Theme Context

**Source**: `src/contexts/ThemeContext.tsx`

```typescript
useTheme() → { isDark: boolean, colors: SemanticTheme }
useIsDarkMode() → boolean
```

Reads system color scheme and provides `lightTheme` or `darkTheme` from shared tokens.

## Typography

**Source**: `src/theme/typography.ts`

### Platform-Specific Fonts

| Role | iOS | Android |
|---|---|---|
| Display | AvenirNextCondensed-Heavy | sans-serif-condensed |
| Body | System | sans-serif |
| Mono | Menlo | monospace |

### Type Styles

| Style | Usage | Weight | Transform |
|---|---|---|---|
| `display` | Large display headings | Heavy | — |
| `screenTitle` | Screen/modal titles | Heavy | — |
| `sectionTitle` | Section headings | Heavy | UPPERCASE |
| `labelStrong` | Labels | Heavy | UPPERCASE |
| `body` | Body text | 400 | — |
| `bodyStrong` | Emphasized body | 500 | — |
| `bodySmall` | Secondary text | 400 | — |
| `meta` | Metadata, badges | 600 | UPPERCASE |
| `button` | Button labels | 500 | — |
| `mono` | Code, terminal | 400 | — |

All styles are built from `semanticTypography` tokens in `@pocketdev/shared/theme`, combined with platform-specific font families.

## Shared Components

**Source**: `src/components/shared/`

### BauhausButton

Variants: `primary` | `secondary` | `danger` | `quiet`

| Variant | Background | Border | Text |
|---|---|---|---|
| primary | `colors.primary` | `colors.primary` | `colors.primaryText` |
| secondary | `colors.panelAlt` | `colors.border` | `colors.text` |
| danger | `colors.accentRed` | `colors.accentRed` | `colors.primaryText` |
| quiet | transparent | `colors.border` | `colors.text` |

- Height: 48px (compact: 38px)
- Border: 2px, `borderRadius.lg` (12px)
- Loading state: `ActivityIndicator` + text
- Disabled: 50% opacity

### BauhausPanel

Base card component with colored accent block.

- 2px border, `borderRadius.xl` (24px)
- Padding: `spacing[4]` (16px)
- Accent: 18x18px colored block in top-left corner (default: `colors.accentYellow`)
- `alt` prop: toggles `colors.panelAlt` vs `colors.panel` background
- Sub-components: `BauhausPanelHeader`, `BauhausPanelTitle`, `BauhausPanelDescription`, `BauhausPanelContent`

### BauhausBadge

Pill badge with colored dot marker.

- Min height: 26px, `borderRadius.md` (8px)
- 10x10px colored dot + text label
- `typeStyles.meta` typography (uppercase, 600 weight)
- 2px border matching dot color

### LiquidGlassCard

Frosted glass card container.

- Same structure as BauhausPanel (accent block, border, padding)
- Theme-aware: different opacity/blur values for dark vs light
- Sub-components: `LiquidGlassCardHeader`, `LiquidGlassCardTitle`, `LiquidGlassCardDescription`, `LiquidGlassCardContent`

### CopyButton

Clipboard button with state feedback.

- Copy icon → Check icon transition (2s timeout)
- Uses `@react-native-clipboard/clipboard`

### TerminalView

Full terminal display component.

- Syntax highlighting (basic keyword/string/comment detection)
- Line numbers toggle
- Theme toggle (dark/light terminal background)
- Copy full output button
- Clear button
- Send input field
- FlatList-based for performance with large output

## Backgrounds

**Source**: `src/components/background/AnimatedGradientBackground.tsx`

Animated gradient background with floating geometric shapes.

**Variants**: `'connect'` | `'setup'`

Each variant configures different shapes (circles, rectangles) with:
- Animated position (translateX/Y with sine-wave motion)
- Breathe effect (opacity pulsing)
- Configurable color from theme tokens

Shape types: `circle` | `rect` with rotation, opacity, and duration config.

## Animations

**Source**: `src/components/animations/`

Celebration animations played after wizard completion:

| Component | Trigger |
|---|---|
| `PairingAnimation` | After successful device pairing |
| `ConnectedAnimation` | After completing setup → entering main app |
| `GitHubSetupAnimation` | After Git wizard completion |
| `PackageInstallAnimation` | After Package Manager wizard completion |
| `ClaudeSetupAnimation` | After Claude setup |
| `CodexSetupAnimation` | After Codex setup |
| `CopilotSetupAnimation` | After Copilot setup |
| `PythonSetupAnimation` | After Python setup |
| `DockerSetupAnimation` | After Docker setup |

Utility: `useExitFade.ts` — Reusable fade-out hook for animation exit.

## Bauhaus Palette

From `@pocketdev/shared/theme`:

```
bauhaus.red    — Primary action, danger
bauhaus.blue   — Information, links
bauhaus.yellow — Highlights, warnings
bauhaus.black  — Text on yellow/light backgrounds
```

These are used for accent blocks, status indicators, and the setup screen header.
