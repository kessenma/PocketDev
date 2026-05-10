# Git Component Module

Mobile git workspace under `apps/mobile/src/components/git/`. Fully server-integrated — all data and actions are backed by the paired PocketDev agent via REST API.

See `docs/git/mobile_git.md` for the full workspace map and backend wiring notes.

## Entry Points

| File | Role |
|---|---|
| `GitWorkspace.tsx` | Top-level workspace — thin adapter forwarding to `GitTab` |
| `index.ts` | Barrel export for the module |
| `model.ts` | All local view model types (`GitFileChange`, `GitCommitEntry`, `GitBranchOption`, `GitRemoteState`, `GitView`) |

## Folder Structure

```
components/git/
├── primitives/          ← UI atoms with no view affinity
│   ├── GitBadge.tsx
│   └── GitSegmentedControl.tsx
├── changes/             ← Changes tab building blocks
│   ├── GitChangeList.tsx
│   ├── GitChangeDetailSheet.tsx
│   ├── GitDiffPreview.tsx
│   ├── GitCommitComposer.tsx
│   ├── GitRepoSummaryCard.tsx
│   ├── GitStatusSummary.tsx
│   ├── GitConflictPanel.tsx
│   └── GitStashPanel.tsx
├── history/             ← History tab building blocks
│   ├── GitHistoryPane.tsx
│   ├── GitHistoryList.tsx
│   └── GitCommitDetailRow.tsx
├── branches/            ← Branches tab building blocks
│   └── GitBranchList.tsx
├── GitPushPanel.tsx     ← Root: shared across all 3 views
├── GitWorkspace.tsx     ← Root: thin adapter (unchanged)
├── model.ts             ← Root: types used everywhere
└── index.ts             ← Barrel export — all paths updated to subfolders
```

The view logic that orchestrates these components lives in `code-screen/git/views/` (ChangesView, HistoryView, BranchesView), which subscribe to stores directly.

## Component Map

### Primitives (`primitives/`)
| Component | Purpose |
|---|---|
| `GitBadge.tsx` | Compact status pill — `success / error / warning / primary / outline` variants |
| `GitSegmentedControl.tsx` | Thin adapter around `CodeSubTabNavigator` for git views |

### Changes View (`changes/`)
| Component | Purpose |
|---|---|
| `GitRepoSummaryCard.tsx` | Repo name, branch, remote URL |
| `GitStatusSummary.tsx` | High-level metrics (staged count, unstaged count) |
| `GitChangeList.tsx` | File change list — see **GitChangeList UX** below |
| `GitChangeDetailSheet.tsx` | Full-screen modal slide-up wrapping `GitDiffPreview` |
| `GitDiffPreview.tsx` | Scrollable diff view with syntax-highlighted hunks |
| `GitCommitComposer.tsx` | Commit message input + commit action |
| `GitConflictPanel.tsx` | Merge conflict banner with abort + AI fix actions |
| `GitStashPanel.tsx` | Stash list with pop/apply/drop actions and stash button |

### History View (`history/`)
| Component | Purpose |
|---|---|
| `GitHistoryList.tsx` | Recent commits — sha, message, author, relative time, files changed |
| `GitCommitDetailRow.tsx` | Expandable commit row with per-file change entries |
| `GitHistoryPane.tsx` | Full-screen pane composing the history list with pull action |

### Branches View (`branches/`)
| Component | Purpose |
|---|---|
| `GitBranchList.tsx` | Branch list with ahead/behind indicators and checkout action |

### Shared (`root`)
| Component | Purpose |
|---|---|
| `GitPushPanel.tsx` | Push readiness, remote sync state, push/pull actions — used in all 3 views |

## GitChangeList UX

The change list uses a **two-tier interaction model** to avoid conflating file path inspection with opening the diff sheet.

### Card anatomy (left → right)
```
┌─ [v] filename.tsx    [MODIFIED] ─┬───┐
│  File changed                    │   │
│  NO LINE STATS  STAGED           │ > │
├──────────────────────────────────┤   │
│  apps/mobile/src/components/     │   │  ← accordion (when expanded)
│  git/filename.tsx                │   │
└──────────────────────────────────┴───┘
```

| Control | Action |
|---|---|
| `ChevronDown` / `ChevronUp` (left of filename) | Toggles an **accordion** below the meta row showing the full path, word-wrapped. The filename in the header always stays as just the last path segment. |
| Filename tap | **BauhausTooltip** shows the full path for 2.4 s — no navigation |
| Kind badge | Static label — `modified / added / deleted / renamed` |
| `ChevronRight` right panel | Opens `GitChangeDetailSheet` via `onSelect(change.id)` |

### Header controls
- **File count badge** — `"3 files"` / `"1 file"` 
- **Global expand chevron** — expands or collapses all cards at once; resets any individual card overrides

### Layout notes
- The outer card `View` uses `flexDirection: 'row'` + `overflow: 'hidden'` so the right panel border clips to the card's `borderRadius`
- Right panel is a fixed-width `TouchableOpacity` with `borderLeftWidth: 1` — spans the full card height regardless of content height
- Per-card expansion state lives in a `Set<string>` (`expandedIds`); global expansion is a separate `allExpanded` boolean

## Model Types (`model.ts`)

```ts
GitFileChange   // id, path, oldPath?, kind, staged, additions, deletions, changedLines, hasLineStats, isBinary, summary?, diff?, hunks?
GitCommitEntry  // id, sha, message, author, relativeTime, filesChanged
GitBranchOption // name, current, ahead, behind, protected, description
GitRemoteState  // remote, upstream, ahead, behind, lastPushRelativeTime, requiresAuth, status
GitView         // 'changes' | 'history' | 'branches'
```

Re-exports `GitDiffHunk`, `GitFileChangeKind`, `GitRemoteStatus` from `@pocketdev/shared/types`.

## Shared Components Used

- `BauhausTooltip` (`components/shared/BauhausTooltip.tsx`) — long-press / tap tooltip for the full file path
- `LiquidGlassCard` (via `GitCard`) — frosted glass card shell
- `lucide-react-native` — `ChevronDown`, `ChevronUp`, `ChevronRight`, `ArrowDownToLine`, `History`, `FilePlus2`, `FileMinus2`, `FileEdit`, `FileSymlink`

## Update Rule

If a git component, model type, or interaction pattern changes, update this file and `docs/git/mobile_git.md` in the same change.
