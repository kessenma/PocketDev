# Scripts Component Module

Mobile scripts workspace under `apps/mobile/src/components/scripts/`. Displays npm/yarn/pnpm scripts from the connected project — categorized, suggested, and running views.

See `apps/mobile/src/stores/scripts.ts` for the Zustand store that backs all data and actions.

## Entry Points

| File | Role |
|---|---|
| `index.ts` | Barrel export for the module |
| `ScriptCard.tsx` | Primary script row — name, category badge, run/stop action |
| `PackageSelector.tsx` | Dropdown/picker for switching between packages in a monorepo |
| `SuggestedGroupAccordion.tsx` | Collapsible group of suggested scripts with a shared label |

The tab-level orchestration lives in `code-screen/scripts/ScriptsTab.tsx`, which composes these components via `views/`.

## View Files (`code-screen/scripts/views/`)

Each view is a self-contained component that subscribes to stores directly — no prop drilling from `ScriptsTab`.

| View | File | Purpose |
|---|---|---|
| Scripts | `views/PackageScripts.tsx` | Categorized script list for the selected package |
| Suggested | `views/SuggestedScripts.tsx` | AI-suggested scripts — monorepo root uses accordions, single-package uses flat cards |
| Running | `views/RunningScripts.tsx` | Active script processes with live output |
| History | `views/HistoryScripts.tsx` | Sheet modal of recently run scripts (rendered from `ScriptsTab`) |

## Component Map

| Component | Purpose |
|---|---|
| `ScriptCard.tsx` | Script row with name, category, run button, optional output preview |
| `PackageSelector.tsx` | Horizontal scrolling package switcher for monorepo workspaces |
| `SuggestedGroupAccordion.tsx` | Collapsible section grouping related suggested scripts |

## Stores Used

| Store | Import | Used for |
|---|---|---|
| `useScriptsStore` | `stores/scripts` | Package list, selected package, script metadata, fetch |
| `useTaskStore` | `stores/tasks` | Running task state, start/kill task actions |
| `usePreviewStore` | `stores/preview` | Dev server URL for preview launch |

## Model Utilities

Script categorization logic lives in `model.ts`:
- `categorizeScripts(scripts)` — assigns each script a category (`dev`, `build`, `test`, `lint`, etc.)
- `groupByCategory(categorized)` — groups into `Map<category, scripts[]>` for section rendering

## Update Rule

If a scripts component, store shape, or interaction pattern changes, update this file in the same change.
