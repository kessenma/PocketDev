# Mobile Adaptive Layout

## Overview

PocketDev mobile adapts between phone and tablet layouts using a custom hook and layout components. The split-pane tablet layout provides a more productive workspace for larger screens.

## Layout Modes

| Mode | Condition | UI |
|---|---|---|
| `phone` | Not a tablet device | Bottom tab bar, single-pane screens |
| `tablet` | Tablet device, width < 960px | Sidebar navigation, single-pane |
| `tabletSplit` | Tablet device, width >= 960px | Sidebar navigation, split-pane master/detail |

## useAdaptiveLayout Hook

**Source**: `src/hooks/useAdaptiveLayout.ts`

```typescript
type LayoutMode = 'phone' | 'tablet' | 'tabletSplit'

type AdaptiveLayout = {
  isTabletDevice: boolean    // DeviceInfo.isTablet()
  isLandscape: boolean       // width >= height
  windowWidth: number
  windowHeight: number
  layoutMode: LayoutMode
}
```

**Logic**:
- Uses `react-native-device-info` for tablet detection
- Listens to `Dimensions.change` events for resize
- Breakpoint: 960px for split-pane mode

## AdaptiveShell

**Source**: `src/components/layout/AdaptiveShell.tsx`

Wraps screen content with layout-aware padding and max-width constraints.

**Props**: `{ children, maxWidth?, style?, contentStyle? }`

| Mode | Behavior |
|---|---|
| Phone | Full width, `layoutGrid.insetPhone` padding |
| Tablet | Centered, `maxWidth` constraint (default 1120px), `layoutGrid.insetTablet` padding |

## SplitViewLayout

**Source**: `src/components/layout/SplitViewLayout.tsx`

Master/detail layout for tablet split mode.

**Props**: `{ leading, trailing, leadingWidth?, style? }`

```
┌─────────────────┬────────────────────────────┐
│  leading         │  trailing                   │
│  (360px default) │  (flex: 1)                  │
│  minWidth: 300   │  minWidth: 0                │
└─────────────────┴────────────────────────────┘
```

**Usage examples**:
- TasksScreen: Task list (leading) + Task detail (trailing)
- CodeScreen: File tree (leading) + Code viewer (trailing)
- ConnectScreen: Hero card (leading) + Pairing form (trailing)

## WorkspaceNavigation Sidebar

**Source**: `src/components/navigation/WorkspaceNavigation.tsx`

Replaces the bottom tab bar on tablets. Renders as a collapsible sidebar.

**Dimensions**:
- Expanded: 220px
- Collapsed: 84px (icon-only)
- Animated transition: 180ms width, 140ms label opacity

**Features**:
- Expand/collapse toggle (persisted to MMKV storage)
- Connection status dot in header
- Same tab items as bottom bar (Tasks, Code, Settings)
- Animated width transition

**Persistence**: Expanded/collapsed state saved via `setWorkspaceNavExpanded()` in storage service.

## How Screens Adapt

### TasksScreen
- **Phone**: `TaskListPane` with FAB for new task
- **Tablet split**: `TaskWorkspace` (list + detail side-by-side), auto-selects first task

### CodeScreen
- **Phone**: Toggle between `FileTreeList` (browser) and `CodeViewer` (viewer) via `activePhoneView` state
- **Tablet split**: `SplitViewLayout` with file tree (leading) + code viewer (trailing)

### ConnectScreen
- **Phone**: Vertical scroll with title → form
- **Tablet**: `SplitViewLayout` with hero card (leading, 420px) + form (trailing)

### SettingsScreen
- Uses `AdaptiveShell` with `maxWidth={1200}` — same layout on phone and tablet, just wider on tablet
