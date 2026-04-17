# Typography Migration Guide

Use this document to migrate component files from the legacy `typographyScale` + hardcoded weight approach to `typeStyles`.

**Screens are already migrated.** This guide is for the follow-up component pass.

---

## The Two Systems (Background)

The app has two typography layers:

| Layer | File | What it contains |
|---|---|---|
| `semanticTypography` | `packages/shared/src/theme/spacing.ts` | Raw size + lineHeight + letterSpacing per role. No weight, no family. Used by web too. |
| `typeStyles` | `apps/mobile/src/theme/typography.ts` | Pre-composed RN `TextStyle` objects. Family, weight, transforms all baked in. **Use this in components.** |

---

## Final `typeStyles` Token Table

All values as of this migration. Source: [apps/mobile/src/theme/typography.ts](../../apps/mobile/src/theme/typography.ts)

| Token | Font Family | Size | Line Height | Weight | Letter Spacing | Transform |
|---|---|---|---|---|---|---|
| `display` | Saira Stencil | 36 | 40 | 800 | -1.1 | — |
| `screenTitle` | Saira Stencil | 30 | 34 | 800 | -0.8 | — |
| `heading` | Saira Stencil | 24 | 32 | 800 | -0.8 | — |
| `sectionTitle` | Saira Stencil | 12 | 16 | 800 | 1.3 | uppercase |
| `labelStrong` | Saira Stencil | 13 | 18 | 800 | 0.6 | uppercase |
| `body` | Afacad Flux | 16 | 24 | 400 | — | — |
| `bodyStrong` | Afacad Flux | 16 | 24 | 500 | — | — |
| `bodyBold` | Afacad Flux | 16 | 24 | 700 | — | — |
| `bodyLarge` | Afacad Flux | 18 | 28 | 400 | — | — |
| `bodySmall` | Afacad Flux | 14 | 20 | 400 | — | — |
| `meta` | Afacad Flux | 12 | 16 | 600 | 0.5 | uppercase |
| `button` | Afacad Flux | 15 | 20 | 500 | 0.4 | — |
| `mono` | Menlo (iOS) / monospace (Android) | 13 | 20 | — | — | — |

---

## Mapping Cheat Sheet

Replace `typographyScale` + `fontWeight` combos with the closest `typeStyles` token:

| Old pattern | → | `typeStyles` token | Notes |
|---|---|---|---|
| `typographyScale['4xl'] + fontWeight '700'/'800'` | → | `typeStyles.display` | Hero titles, connect screen |
| `typographyScale['3xl'] + fontWeight '700'/'800'` | → | `typeStyles.screenTitle` | Screen-level titles |
| `typographyScale['2xl'] + fontWeight '700'` | → | `typeStyles.heading` | Section headings in setup |
| `typographyScale.lg + fontWeight '700'` | → | `typeStyles.heading` | Fallback if 2xl not right |
| `typographyScale.xs + fontWeight '700' + letterSpacing + uppercase` | → | `typeStyles.sectionTitle` | Eyebrow labels, panel titles |
| `typographyScale.base + fontWeight '700'` | → | `typeStyles.bodyBold` | Status values, emphasis |
| `typographyScale.base + fontWeight '600'` | → | `typeStyles.button` | Button labels, CTAs |
| `typographyScale.base + fontWeight '500'` | → | `typeStyles.bodyStrong` | Slightly emphasized body |
| `typographyScale.base` (no weight) | → | `typeStyles.body` | Regular body copy |
| `typographyScale.lg` (no weight) | → | `typeStyles.bodyLarge` | Hero body copy |
| `typographyScale.sm + any weight` | → | `typeStyles.bodySmall` | Helper text, labels, meta |
| `typographyScale.xs + any weight` | → | `typeStyles.meta` | Timestamps, counts, tags |
| `fontSize: 14, lineHeight: 20` in markdown props | → | `{ fontSize: 14, lineHeight: 20 }` | Keep as plain object — markdown prop, not TextStyle |

### Weight exceptions

A few places retain an explicit `fontWeight` override on top of a `typeStyles` spread — this is acceptable **only** when:
- The semantic meaning demands a weight outside the token set (e.g. a host address needs '600' emphasis within a `bodySmall` context)
- It's a React Navigation header override (not in a StyleSheet)

In all other cases, pick the closest token and remove the manual `fontWeight`.

---

## Migration Progress

### ✅ Pass 1 — Screens (complete)
All screens in `apps/mobile/src/screens/` have been migrated.

### ✅ Pass 3 — All Remaining Components (complete, session 3)

All components in `apps/mobile/src/components/` migrated. Zero `typographyScale` references remain. `pnpm check-types` passes clean.

### ✅ Pass 2 — Priority Components (complete, session 2)

The following were migrated in a single session. Each file had `typographyScale` removed from its import and all `StyleSheet` styles replaced with `typeStyles` tokens.

#### tasks/
| File | Changes made |
|---|---|
| `TaskInteractionSheet.tsx` | `title` → `bodyBold`, `queueBadge` → `meta`, `optionIndexText` → `bodySmall` |
| `TaskConversation.tsx` | `roleLabel` → `meta`, `turnLabel` → `meta` |

#### plan/
| File | Changes made |
|---|---|
| `PlanConversation.tsx` | `timestamp` → `meta`, `input` → `bodySmall`, `sendText` → `button` |
| `PlanStepList.tsx` | `stepNumber` → `bodySmall`, `stepTitle` → `bodyStrong`, `filePath` → `meta` |

#### setup/ — WizardSheet wrappers (all 12)
All top-level `*WizardSheet.tsx` files follow an identical modal wrapper pattern. Each was migrated the same way:

| Style | Old | New |
|---|---|---|
| `headerTitle` | `typographyScale.lg + weight 700` | `typeStyles.heading` |
| `completedTitle` | `typographyScale['2xl'] + weight 700` | `typeStyles.heading` |
| `completedSubtitle` | `typographyScale.base` | `typeStyles.body` |
| `completedDetail` | `typographyScale.sm + fontFamily monospace` | `typeStyles.mono` |
| `doneText` | `typographyScale.base + weight 600/700` | `typeStyles.button` |
| `reinstallText` / `reconfigureText` | `typographyScale.xs + weight 500` | `typeStyles.meta` |

Files: `ClaudeWizardSheet`, `CodexWizardSheet`, `CopilotWizardSheet`, `DockerWizardSheet`, `GitWizardSheet`, `GoWizardSheet`, `MinimaxWizardSheet`, `OpenCodeWizardSheet`, `PackageManagerWizardSheet`, `PythonWizardSheet`, `RustWizardSheet`, `TypeScriptWizardSheet`

---

## ✅ Pass 3 Complete

All components migrated. Run the verification command below to confirm.

## ~~Remaining Work — Pass 3~~ (complete)

The following still contain `typographyScale`. Run this to get the current list:

```bash
grep -r "typographyScale" apps/mobile/src/components/ --include="*.tsx" -l
```

As of session 2, the remaining files fall into these groups. Migrate in this order:

### 1. Wizard step sub-components (inside each `*-wizard/` folder)

Each wizard has step components (`DetectStep`, `InstallStep`, `VerifyStep`, etc.) and a `WizardStepper` that still use `typographyScale`. Same mapping rules apply. Groups:

- `setup/claude-wizard/` — DetectStep, InstallStep, AuthenticateStep, VerifyStep, WizardStepper
- `setup/codex-wizard/` — DetectStep, ReviewStep, InstallStep, AuthenticateStep, VerifyStep, WizardStepper
- `setup/git-wizard/` — DetectStep, InstallGitStep, GenerateKeyStep, AddToGitHubStep, TestConnectionStep, InstallGitHubCliStep, GitHubCliAuthStep, ConfigureIdentityStep, WizardStepper
- `setup/copilot-wizard/` — DetectStep, InstallStep, TrustStep, AuthenticateStep, VerifyStep, WizardStepper
- `setup/docker-wizard/` — DetectStep, InstallStep, UserGroupStep, StartDaemonStep, VerifyStep, WizardStepper
- `setup/go-wizard/` — DetectStep, InstallGoStep, VerifyStep, WizardStepper
- `setup/minimax-wizard/` — DetectStep, ConfigureStep, VerifyStep, WizardStepper
- `setup/opencode-wizard/` — DetectStep, ReviewStep, InstallStep, VerifyStep, WizardStepper
- `setup/pkg-wizard/` — DetectStep, ReviewStep, InstallStep, VerifyStep, WizardStepper
- `setup/python-wizard/` — DetectStep, AddPpaStep, InstallPythonStep, InstallPipStep, InstallVenvStep, VerifyStep, WizardStepper
- `setup/rust-wizard/` — DetectStep, InstallRustupStep, VerifyStep, WizardStepper
- `setup/typescript-wizard/` — DetectStep, InstallTypeScriptStep, VerifyStep, WizardStepper

Also: `setup/shared/` (SetupCommandCard, SetupTerminalPanel, SetupProgressCard), `setup/SetupChecklist.tsx`, `setup/SetupCheckItem.tsx`, `setup/InstallSheet.tsx`, `setup/AiInspectSheet.tsx`, `setup/SudoPrompt.tsx`, `setup/DatabaseSetup.tsx`, `setup/OnDeviceModelSetup.tsx`

### 2. Plan sub-components
- `plan/PlanWorkspace.tsx`
- `plan/PlanNotes.tsx`
- `plan/PlanSegmentedControl.tsx`
- `plan/PlanSummaryCard.tsx`
- `plan/PlanBadge.tsx`
- `plan/PlanHistoryList.tsx`
- `plan/PlanQuestionList.tsx`
- `plan/PlanActionBar.tsx`

### 3. Git components
- `git/GitStatusSummary.tsx`
- `git/GitHistoryList.tsx`
- `git/GitHistoryPane.tsx`
- `git/GitChangeDetailSheet.tsx`
- `git/GitBranchList.tsx`
- `git/GitPushPanel.tsx`
- `git/GitConflictPanel.tsx`
- `git/GitChangeList.tsx`
- `git/GitCommitDetailRow.tsx`
- `git/GitStashPanel.tsx`
- `git/GitRepoSummaryCard.tsx`
- `git/GitBadge.tsx`
- `git/GitCommitComposer.tsx`
- `git/GitDiffPreview.tsx`

### 4. Code screen components
- `code-screen/CodeScreenShell.tsx`
- `code-screen/code-browse/CodeBrowseTab.tsx`
- `code-screen/navigation/CodeSubTabNavigator.tsx`
- `code-screen/scripts/ScriptsTab.tsx`
- `code-screen/env-vars/EnvVarsTab.tsx`
- `code-screen/env-vars/EnvVarRow.tsx`
- `code-screen/env-vars/EnvVarEditSheet.tsx`
- `code-screen/git/GitTab.tsx`

### 5. Container components
- `containers/ContainerLogsPanel.tsx`
- `containers/ContainerBadge.tsx`
- `containers/ContainerWorkspace.tsx`
- `containers/ContainerSegmentedControl.tsx`
- `containers/ContainerList.tsx`
- `containers/ContainerStatusSummary.tsx`

### 6. Files components
- `files/FileViewerToolbar.tsx`
- `files/FileBreadcrumbs.tsx`
- `files/CodeViewer.tsx`
- `files/FileTreeList.tsx`
- `files/FileExplorerSheet.tsx`

### 7. Shared + other components
- `shared/TerminalView.tsx`
- `shared/BauhausTooltip.tsx`
- `shared/CopyButton.tsx`
- `shared/BauhausChatInput.tsx`
- `server-actions/ServerMetricGrid.tsx`
- `server-actions/ServerWorkspace.tsx`
- `server-actions/ServerPortList.tsx`
- `server-actions/ServerQuickActions.tsx`
- `server-actions/ServerHealthHero.tsx`
- `server-actions/ServerNetworkList.tsx`
- `server-actions/ServerErrorList.tsx`
- `tasks/TaskDebugSheet.tsx`
- `projects/ProjectContextBanner.tsx`
- `browser/ServerWebBrowserSheet.tsx`
- `scripts/RunningScriptsSheet.tsx`
- `scripts/PackageSelector.tsx`
- `scripts/ScriptCard.tsx`
- `QRScanner.tsx`

---

## Rules to Enforce

When migrating a component, these are the constraints:

1. **No bare `typographyScale`** — never import or use `typographyScale` in a component. It belongs only in the design token layer.
2. **No `fontSize` in StyleSheet** — unless it's one of the two allowed exceptions below.
3. **No `fontWeight` in StyleSheet** — unless it's a documented exception with a comment.
4. **No `lineHeight` in StyleSheet** — all line heights come from `typeStyles`.

### Allowed exceptions

```typescript
// EXCEPTION 1: markdown prop objects (not TextStyle, passed to markdown renderers)
markdownStyle={{ paragraph: { fontSize: 14, lineHeight: 20 } }}

// EXCEPTION 2: React Navigation header overrides (not in StyleSheet.create)
navigation.setOptions({ headerTitleStyle: { fontWeight: '800' } })

// EXCEPTION 3: layout-only spacing that co-locates with a typeStyles spread
existingConnectionHost: {
  ...typeStyles.bodySmall,
  fontWeight: '600',   // emphasis on a specific data field — intentional exception
  marginTop: 2,        // layout, not typography
}
```

---

## How to Migrate a Component (Step by Step)

1. Remove `typographyScale` from the import: `import { spacing, borderRadius } from '@pocketdev/shared/theme'`
2. Add `typeStyles` import: `import { typeStyles } from '../theme/typography'` (adjust path depth)
3. For each style in `StyleSheet.create()`, find the matching token in the cheat sheet above
4. Spread the token and remove the separate `fontWeight`/`fontSize`/`lineHeight` props
5. If a layout value (`marginTop`, `maxWidth`) was co-located, keep it inline after the spread
6. Run `pnpm check-types` — no new errors expected
7. Spot-check visually in simulator if the component is visible

---

## Verification Command

After migrating a batch of components:

```bash
# Should return zero results when all screens + components are done
grep -r "typographyScale" apps/mobile/src/components/

# Check for remaining raw fontSize in StyleSheets (non-exceptions)
grep -rn "fontSize:" apps/mobile/src/components/ | grep -v "markdownStyle\|markdown\|\.md"
```
