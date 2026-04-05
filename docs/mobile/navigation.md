# Mobile Navigation Architecture

## Overview

PocketDev mobile uses React Navigation 7 with a native-stack root navigator and a bottom-tab navigator for the main app. The navigation tree adapts between phone and tablet layouts.

## Navigation Tree

```
RootNavigator (native-stack)
│
├── Connect (ConnectScreen)
│   headerShown: false
│   Purpose: QR/URL pairing flow
│   Params: { url?: string }
│
├── ServerSetup (ServerSetupScreen)
│   headerShown: false
│   Purpose: Workspace tool wizard
│
├── Main (MainTabs - bottom-tab navigator)
│   headerShown: false
│   │
│   ├── Tasks (TasksScreen)
│   │   Icon: ListChecks
│   │
│   ├── Code (CodeScreen)
│   │   Icon: FolderOpen
│   │
│   └── Settings (SettingsScreen)
│       Icon: Settings
│       Header right: StatusDot (connection indicator)
│
├── TaskDetail (TaskDetailScreen)
│   Title: "Task"
│   Params: { taskId: string }
│
├── Containers (ContainersScreen)
│   Title: "Containers"
│
├── Plan (PlanScreen)
│   Title: "Plan"
│
└── Projects (ProjectsScreen)
    Title: "Repositories"
```

## Type Definitions

**Source**: `src/navigation/types.ts`

```typescript
type RootStackParamList = {
  Connect: { url?: string } | undefined
  ServerSetup: undefined
  Main: NavigatorScreenParams<MainTabParamList> | undefined
  TaskDetail: { taskId: string }
  Containers: undefined
  Plan: undefined
  Projects: undefined
}

type MainTabParamList = {
  Tasks: undefined
  Code: undefined
  Settings: undefined
}
```

## Entry Point Logic

**Source**: `src/navigation/RootNavigator.tsx`

The root navigator determines the initial route at render time:

```
const server = useConnectionStore((s) => s.server)
initialRouteName = server ? 'Main' : 'Connect'
```

- **No paired server**: User lands on `Connect` for QR/URL pairing
- **Paired server exists**: User goes directly to `Main` tabs

## Header Styling

All stack screens share a consistent header style:

```
backgroundColor: colors.panel
tintColor: colors.text
shadowVisible: false
titleStyle: sectionTitle font (display family, heavy weight, uppercase)
```

`Connect` and `ServerSetup` have `headerShown: false` — they render their own header UI.

## Main Tabs Configuration

**Source**: `src/navigation/MainTabs.tsx`

### Phone Layout
- Standard bottom tab bar
- Tab bar height: 72px
- Border top: 2px solid `colors.border`
- Active tint: `colors.primary`, inactive: `colors.textTertiary`
- Label style: `typeStyles.meta` (uppercase, 600 weight)

### Tablet Layout
- Bottom tab bar hidden (`display: 'none'`)
- Replaced with `WorkspaceNavigation` sidebar component
- Detected via `useAdaptiveLayout().isTabletDevice`

### Status Indicator
The Settings tab header shows a `StatusDot` component (right side):
- Connected: green `#22c55e`
- Connecting: yellow `#facc15`
- Disconnected: red `#ef4444`

## Tab Icons

**Source**: `src/navigation/tab-icons.tsx`

| Tab | Icon | Library |
|---|---|---|
| Tasks | `ListChecks` | lucide-react-native |
| Code | `FolderOpen` | lucide-react-native |
| Settings | `Settings` | lucide-react-native |

All icons use stroke width 2.25 with dynamic color/size from the navigator.

## Navigation Patterns

### Screen → Screen
- `navigation.navigate('TaskDetail', { taskId })` — Push task detail
- `navigation.navigate('Containers')` — Push container management
- `navigation.navigate('Plan')` — Push plan workspace
- `navigation.navigate('Projects')` — Push repository management

### Screen → Root (Reset)
- `navigation.replace('Main')` — After successful setup
- `navigation.replace('Connect')` — After unpair
- `navigation.replace('ServerSetup')` — After initial pair

### Settings → Stack Screens
Settings uses `navigation.getParent()?.navigate(...)` to push root stack screens from within the tab navigator.

### Modal Flows
- `NewTaskSheet` — Full-screen modal from Tasks tab (FAB button)
- Various `*WizardSheet` components — Bottom sheets from ServerSetup screen
