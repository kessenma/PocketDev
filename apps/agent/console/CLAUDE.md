# PocketDev Console

Web-based admin dashboard served by the agent at `/PocketDev/`. Used to manage mobile device pairing, monitor server toolchain readiness, debug auth/tasks, inspect the active repository, and access a server terminal.

## Tech Stack

- **Framework**: Vite 7 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Routing**: react-router-dom 7 (hash or browser router)
- **Terminal**: xterm.js (@xterm/xterm + addon-fit + addon-web-links)
- **QR Codes**: qrcode library
- **Icons**: lucide-react

## Commands

```bash
cd apps/agent/console
pnpm dev          # Vite dev server (standalone)
pnpm build        # Production build → dist/
pnpm check-types  # TypeScript check
```

Built output in `dist/` is served as static files by the agent server's catch-all route.

## Page Flow

```
checkHealth() → hasAdmin?
  No  → /setup   → SetupPage (create admin account)
  Yes → /login   → LoginPage (email + password)
        → /console → ConsolePage (main dashboard)
```

- `SetupPage` — First-boot admin account creation (email + password, min 8 chars)
- `LoginPage` — Cookie-based session auth
- `ConsolePage` — Full dashboard (only accessible after login)

## ConsolePage Layout
<!-- Deep dive: docs/console/setup-status.md, docs/console/diagnostics.md -->

```
┌─ Header ──────────────────────────────────────────────────┐
│  Server icon + "Server Control Board"                      │
│  Badges: IP:port, paired status, device count              │
│  Buttons: Terminal (fullscreen modal), Sign Out             │
└────────────────────────────────────────────────────────────┘

┌─ SetupStatus (full width) ────────────────────────────────┐
│  Tool readiness grid: Required | AI Assistant | Language    │
│  Layout toggle: List / Grid / Bauhaus                      │
└────────────────────────────────────────────────────────────┘

┌─ ConnectionWizard (7 cols) ─┬─ DeviceList (5 cols) ───────┐
│  QR code + passcode          │  Paired device management    │
│  Manual connection URL        │  Rename / remove devices     │
└──────────────────────────────┴─────────────────────────────┘

┌─ RepoInspectorPanel (full width) ─────────────────────────┐
│  File tree browser + code viewer + search                  │
└────────────────────────────────────────────────────────────┘

┌─ DiagnosticsPanel (full width) ───────────────────────────┐
│  Tabs: terminal | setup | tasks | registry | codex |       │
│        claude | github | copilot                           │
└────────────────────────────────────────────────────────────┘
```

## Key Components

| Component | Purpose |
|---|---|
| `SetupStatus` | Tool readiness display with 3 layout modes (list/grid/bauhaus). Groups: Required (git, pkg managers), AI Assistant (claude, codex, copilot), Language (python), Supporting. Copilot normalization handles trust_configured check. |
| `ConnectionWizard` | QR code generation from `{host, port, code}` JSON payload, custom passcode input, connection URL display (`pocketdev://host:port/code`), copy button |
| `DeviceList` | Lists paired devices with rename/remove. Shows platform, last seen |
| `RepoInspectorPanel` | File tree browser, code viewer with syntax display, ripgrep search, preview session launcher |
| `DiagnosticsPanel` | 8 debug tabs with live polling (configurable interval). Sub-components in `diagnostics/` folder |
| `ServerTerminal` | xterm.js terminal over WebSocket (`/PocketDev/ws/terminal`). Opened in fullscreen modal |
| `AuthDebugPanel` | Auth state debugging (server time, device list, public key prefixes) |

### Diagnostics Sub-tabs (`components/diagnostics/`)

| Tab Component | Debug Endpoint | Shows |
|---|---|---|
| `SetupDiagnosticsTab` | `/debug/setup` | Prerequisites report, provider install/auth state |
| `TasksDiagnosticsTab` | `/debug/tasks` | Task history, active processes, per-task logs |
| `ClaudeDiagnosticsTab` | `/debug/claude-auth` | Auth sessions, persisted state, output excerpts |
| `CodexDiagnosticsTab` | `/debug/codex-auth` | Auth sessions, replay debug, persisted state |

Additional tabs in the main DiagnosticsPanel: terminal log, device registry, GitHub auth, Copilot trust.

## API Client (`lib/api.ts`)
<!-- Deep dive: docs/agent/cli-providers.md -->

All requests go to `/PocketDev/api/console/*` with `credentials: 'same-origin'`.

**Auth**: `checkHealth`, `createAdmin`, `login`, `logout`
**Status**: `fetchStatus` → ConsoleStatus (paired, devices, passcode, serverIp, port)
**Pairing**: `setPasscode`, `refreshPasscode`
**Devices**: `renameDevice`, `removeDevice`
**Prerequisites**: `fetchPrerequisites` → PrerequisitesReport (os, arch, tools[], ready)
**Repo**: `fetchRepoSummary`, `fetchRepoList`, `fetchRepoSearch`, `fetchRepoFile`, `createRepoPreviewSession`
**Debug**: `fetchAuthDebug`, `fetchTerminalDebug`, `fetchCodexAuthDebug`, `fetchClaudeAuthDebug`, `fetchCopilotAuthDebug`, `fetchGitHubAuthDebug`, `fetchProjectsDebug`, `fetchTasksDebug`, `fetchSetupDebug`

## UI Components (shadcn)

`components/ui/`: badge, button, card, input, label, modal, separator

## Design Language

The console uses a Bauhaus-inspired dark theme:
- Background: `#12100d` with radial gradient accents
- Cards: `#1a1713` with 2px borders, `rounded-[1.1rem]`
- Accent colors: `#f0c419` (yellow), `#d93025` (red), `#2d5fe5` (blue)
- Text: `#f5eedf` (cream)
- Typography: uppercase headings with wide letter-spacing
