# Git Component Module

Mobile git workspace under `apps/mobile/src/components/git/`. Fully server-integrated — all data and actions are backed by the paired PocketDev agent via REST API.

See `docs/git/mobile_git.md` for the full workspace map and backend wiring notes.

## Entry Points

| File | Role |
|---|---|
| `GitWorkspace.tsx` | Top-level workspace — composes segmented views |
| `GitTab.tsx` | Thin re-export adapter for the code screen tab |
| `index.ts` | Barrel export for the module |
| `model.ts` | All local view model types (`GitFileChange`, `GitCommitEntry`, `GitBranchOption`, `GitRemoteState`, `GitView`) |

## Component Map

### Primitives
| Component | Purpose |
|---|---|
| `GitCard.tsx` | Shared card shell — re-exports `LiquidGlassCard` variants under `GitCard*` names |
| `GitBadge.tsx` | Compact status pill — `success / error / warning / primary` variants |
| `GitSegmentedControl.tsx` | Tab switcher for `changes`, `history`, `branches` views |

### Changes View
| Component | Purpose |
|---|---|
| `GitRepoSummaryCard.tsx` | Repo name, branch, remote URL |
| `GitStatusSummary.tsx` | High-level metrics (staged count, unstaged count) |
| `GitChangeList.tsx` | File change list — see **GitChangeList UX** below |
| `GitChangeDetailSheet.tsx` | Full-screen modal slide-up wrapping `GitDiffPreview` |
| `GitDiffPreview.tsx` | Scrollable diff view with syntax-highlighted hunks |
| `GitCommitComposer.tsx` | Commit message input + commit action |
| `GitPushPanel.tsx` | Push readiness, remote sync state, push action |

### History View
| Component | Purpose |
|---|---|
| `GitHistoryList.tsx` | Recent commits — sha, message, author, relative time, files changed |
| `GitCommitDetailRow.tsx` | Expandable commit row with per-file change entries |
| `GitHistoryPane.tsx` | Pane wrapper composing the history list |

### Branches View
| Component | Purpose |
|---|---|
| `GitBranchList.tsx` | Branch list with ahead/behind indicators and checkout action |

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
