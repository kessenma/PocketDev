# Console Setup Status Grid

## Overview

The SetupStatus component displays the agent server's tool readiness in a visual grid. It groups tools into categories and offers three layout modes for different information densities.

**Source**: `apps/agent/console/src/components/SetupStatus.tsx`

## Tool Groups

### Required Setup
- **Git**: Full detail view with SSH key, GitHub connection, private repo access, user identity
- **Package Managers**: Synthesized from individual tools (Node, npm, pnpm, Bun). Shows "X/4 ready".

### AI Assistant
- **Claude CLI**: Install status, auth status, version
- **Codex CLI**: Install status, auth status, version
- **Copilot CLI**: Install status, trust status (special normalization)

### Language
- **Python**: Install status, version, pip/venv availability

### Supporting
Everything not in the above categories (Chromium, Docker, GitHub CLI, etc.)

## Readiness Calculation

```
ready = requiredReady && aiReady && languageReady
```

| Condition | Rule |
|---|---|
| `requiredReady` | All required tools configured |
| `aiReady` | At least one AI assistant configured |
| `languageReady` | All language tools configured |

## Copilot Normalization

Special handling for Copilot: even if `status === 'installed'`, it's treated as `misconfigured` when `details.trust_configured !== 'true'`. This is applied via `normalizeTool()`.

## Layout Modes

### List Mode
Compact rows showing:
- Tool name + required badge + version
- Status text with color (green/yellow/red)
- Intent detail (server-wide path, purpose)
- Rich details for Git and GitHub CLI
- Status dot indicator

### Grid Mode
Card tiles in a responsive grid (`sm:grid-cols-2 xl:grid-cols-4`):
- Colored corner block (status color)
- Tool name, required badge, version
- Status text and intent detail
- Minimum height: 168px (200px for tools with rich details)

### Bauhaus Mode
Dynamic asymmetric grid (`xl:grid-cols-12`) with varied tile sizes:
- Git: large tile (4 cols, 2 rows) — most important, most detail
- GitHub CLI: medium tile (3 cols)
- Missing required tools: tall tile (2 cols, 2 rows)
- Misconfigured tools: medium tile (3 cols)
- Installed tools: small tile (2 cols)

Tile sizing determined by `getBauhausTileClass()` based on tool importance and status.

## Status Colors

| Condition | Text Color | Dot Color |
|---|---|---|
| Missing | `text-red-500` | `bg-red-500` |
| Misconfigured / Unauthenticated | `text-yellow-500` | `bg-yellow-500` |
| Installed + Authenticated | `text-green-500` | `bg-green-500` |

## Status Labels

| Tool Status | Label |
|---|---|
| Package Managers (all installed) | "Ready" |
| Package Managers (partial) | "Needs setup - X/4 ready" |
| Copilot (misconfigured) | "Needs trust setup" |
| Missing tool | "Not installed" |
| Misconfigured tool | "Needs configuration" |
| Unauthenticated | "Not authenticated" |
| Authenticated | "Ready" |
| Installed (no auth needed) | Version number or "Installed" |

## Intent Details

Each tool shows a contextual description:

- Package Managers: "Installs the shared Node.js, npm, pnpm, and Bun toolchain for workspace tasks."
- Server-wide tools with path: "Server-wide path: /usr/bin/..." or "Detected path: ..."
- Claude/Codex: "Available across the server for agent task launches."
- Copilot: "Available through GitHub Copilot CLI for workspace assistance." or setup prompt
- Python: "Python runtime with pip and venv is available for workspace tasks."

## Rich Detail Views

### Git Details
Shows inline sub-indicators:
- User identity (name + email)
- SSH Key exists (check/X icon)
- GitHub connected (check/X icon)
- Private repo access (check/X icon)

### GitHub CLI Details
- GitHub username (@username)
- Private repo access indicator

## Data Flow

```
SetupStatus component
  └── fetchPrerequisites() on mount
      └── GET /PocketDev/api/console/prerequisites
          └── Returns PrerequisitesReport { os, arch, tools[], ready }
              └── Grouped by: getRequiredSetupTools, getAiAssistantTools,
                  getLanguageTools, getSupportingTools
                  └── Rendered in Section components per group
```
