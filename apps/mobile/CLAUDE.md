# PocketDev Mobile

React Native app for controlling AI coding agents on remote servers. Pair with a PocketDev agent, launch tasks, browse files, review git changes, and manage containers — all from your phone or tablet.

## Tech Stack

- **Runtime**: Bare React Native 0.83 + React 19
- **Bundler**: Rock CLI + Re.Pack/rspack (NOT Expo, NOT Metro)
- **Navigation**: @react-navigation (native-stack + bottom-tabs)
- **State**: Zustand 5
- **Storage**: MMKV (general), react-native-keychain (secrets)
- **Crypto**: @noble/ed25519 (device keypair auth)
- **Icons**: lucide-react-native
- **Styling**: StyleSheet.create() + tokens from @pocketdev/shared/theme

## Commands

```bash
pnpm dev:mobile    # Start Re.Pack dev server
pnpm ios           # Build & run on iOS simulator
pnpm android       # Build & run on Android emulator
pnpm check-types   # TypeScript check
pnpm test          # Jest tests
```

## Navigation Structure
<!-- Deep dive: docs/mobile/navigation.md -->

```
RootStack (native-stack)
├── Connect          # Pairing flow (initial screen if no server)
├── ServerSetup      # Workspace tool wizard (after first pair)
├── Main             # Bottom tabs (primary app)
│   ├── Tasks        # Task list + FAB → NewTaskSheet
│   ├── Code         # File browser + code viewer
│   └── Settings     # Connection, tools, health, unpair
├── TaskDetail       # Single task output stream
├── Containers       # Docker container management
├── Plan             # Agent planning workspace
└── Projects         # Repository management
```

**Entry logic** (`RootNavigator.tsx`): If `server` exists in connection store → `Main`, otherwise → `Connect`.

## Adaptive Layout
<!-- Deep dive: docs/mobile/adaptive-layout.md -->

- `useAdaptiveLayout()` hook detects device type + window width
- **Phone** (`< 960px`): Bottom tab bar, single-pane screens
- **Tablet** (`>= 960px`): `WorkspaceNavigation` sidebar, `SplitViewLayout` for master/detail
- `AdaptiveShell` wraps screens with layout-aware max-width container
- Layout modes: `phone` | `tablet` | `tabletSplit`

## Screen → Component Map
<!-- Deep dive: docs/mobile/setup-wizards.md, docs/mobile/task-flow.md -->

| Screen | Component Folder | Key Components |
|---|---|---|
| ConnectScreen | `QRScanner`, `animations/` | QRScanner, PairingAnimation, LiquidGlassCard |
| ServerSetupScreen | `setup/` | SetupChecklist, *WizardModal (Git, Claude, Codex, Copilot, Pkg, Python), InstallModal, AiInspectModal |
| TasksScreen | `tasks/` | TaskListPane, TaskWorkspace, NewTaskSheet |
| TaskDetailScreen | `tasks/` | TaskDetailPane |
| CodeScreen | `files/`, `git/` | FileWorkspace, FileTreeList, CodeViewer, GitWorkspace, GitCard, GitChangeList, GitDiffPreview |
| SettingsScreen | `shared/`, `server-actions/` | BauhausPanel sections, ServerWorkspace |
| ContainersScreen | `containers/` | ContainerWorkspace, ContainerListCard, ContainerLogsCard |
| PlanScreen | `plan/` | PlanWorkspace, PlanStepList, PlanChat, PlanNotes |
| ProjectsScreen | `projects/` | ProjectListCard, CloneCelebration |

## Stores (Zustand)
<!-- Deep dive: docs/mobile/stores.md -->

| Store | Responsibility |
|---|---|
| `connection` | Server URL, WebSocket instance, paired device info, connection status |
| `tasks` | Task list (Map), active task, log streaming, start/kill tasks |
| `files` | File tree, current path, selected file content, search, context paths |
| `git` | Branches, changes, commits, remote state, commit/push actions |
| `containers` | Docker container list, logs, follow mode, filters |
| `plan` | Active plan, step list, questions, chat messages, accept/deny |
| `projects` | Repository list, active project, clone/branch actions |
| `setup` | Prerequisites report (tool detection status) |
| `preview` | Dev server preview URL, session state |
| `new-task-draft` | Model/provider selection, prompt text, pinned files |
| `server-actions` | Server metrics, ports, network, errors, quick actions |

## Services
<!-- Deep dive: docs/connection/pairing-flow.md, docs/protocol/websocket.md -->

| Service | Responsibility |
|---|---|
| `api.ts` | HTTP client for all agent REST endpoints (40+ functions) |
| `auth.ts` | Builds signed `PocketDev-Authorization` header (device ID + Ed25519 signature) |
| `crypto.ts` | Generates/retrieves device keypair via @noble/ed25519 |
| `websocket.ts` | `PocketDevWebSocket` class — auto-reconnect (10 attempts), ping interval, auth header, typed messages |
| `secure-storage.ts` | OS keychain storage for sudo passwords |
| `storage.ts` | MMKV storage for keypair, server info, drafts, cached directories, recent prompts |

## Design System (Bauhaus)
<!-- Deep dive: docs/mobile/design-system.md -->

**UI primitives** (`components/ui/`):
- `Button` — primary/secondary/danger/quiet variants, sm/md/lg sizes, optional left/right/icon-only Lucide icons, loading spinner
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` — compound card with Bauhaus accent stripe
- `Sheet` — modal sheet wrapper

**Shared components** (`components/shared/`):
- `BauhausPanel` — Base card with accent color stripe
- `BauhausBadge` — Pill badge with colored dot
- `LiquidGlassCard` — Frosted glass card container
- `CopyButton` — Clipboard with check feedback
- `TerminalView` — Full terminal with syntax highlighting, line numbers

**Backgrounds** (`components/background/`):
- `AnimatedGradientBackground` — Gradient with animated accent blobs (variants: default, setup)

**Theme** (`theme/typography.ts`):
- Platform-specific font families (AvenirNextCondensed on iOS, sans-serif-condensed on Android)
- `typeStyles` object: display, screenTitle, sectionTitle, body, bodyStrong, meta, mono, etc.
- Tokens imported from `@pocketdev/shared/theme`

**Animations** (`components/animations/`):
- Celebration animations per setup tool (ConnectedAnimation, GitHubSetupAnimation, PackageInstallAnimation, PairingAnimation)

## Component Patterns

- **Feature folders**: Each domain (git, files, tasks, containers, plan, setup) has its own folder with focused components
- **Thin screens**: Screens are orchestrators (~30-50 lines) composing feature components
- **Wizard pattern**: `*WizardModal` components for multi-step guided setup (Git, Claude, Codex, Copilot, Pkg, Python)
- **Workspace pattern**: `*Workspace` components are the primary content area for a domain (GitWorkspace, FileWorkspace, TaskWorkspace, ContainerWorkspace, PlanWorkspace, ServerWorkspace)
- **Model files**: Some feature folders have `model.ts` for data transforms and view models

## Hooks

| Hook | Purpose |
|---|---|
| `useAdaptiveLayout` | Returns `LayoutMode` (phone/tablet/tabletSplit) based on window dimensions |
| `useTerminalCommand` | Manages terminal WebSocket session with auto-sudo detection, error pattern matching, sudo password caching |

## Contexts

| Context | Purpose |
|---|---|
| `ThemeContext` | Provides `{ isDark, colors }` from system color scheme + @pocketdev/shared/theme tokens |
