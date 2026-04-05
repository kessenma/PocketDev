# Mobile Setup Wizards

## Overview

The ServerSetupScreen orchestrates a guided tool-detection and installation flow. It displays a `SetupChecklist` with the current status of all workspace tools, and opens wizard sheets for multi-step guided setup of each tool.

## Screen Architecture

**Source**: `src/screens/ServerSetupScreen.tsx`

```
ServerSetupScreen
├── Header card (animated scroll collapse)
│   ├── Back button → Connect screen
│   ├── "Workspace Tools" title
│   ├── Subtitle (fades on scroll)
│   └── Status blocks (Workspace: Ready/In Progress, Mode: Guided Setup)
├── SetupChecklist (scrollable)
│   ├── Required Tools (Git, Package Managers)
│   ├── AI Assistants (Claude, Codex, Copilot)
│   ├── Language Tools (Python)
│   └── Database Setup
├── Footer
│   ├── Continue button (enabled when ready)
│   └── Skip for now link
└── Sheet overlays (one visible at a time)
    ├── InstallSheet — Generic terminal install execution
    ├── AiInspectSheet — AI-powered failure diagnosis
    ├── GitWizardSheet
    ├── ClaudeWizardSheet
    ├── CodexWizardSheet
    ├── CopilotWizardSheet
    ├── PackageManagerWizardSheet
    ├── PythonWizardSheet
    └── Celebration animations (ConnectedAnimation, GitHubSetupAnimation, PackageInstallAnimation)
```

## Readiness Calculation

**Source**: `src/components/setup/setup-tool-utils.ts`

```
ready = requiredReady && aiReady && languageReady
```

| Condition | Requirement |
|---|---|
| `requiredReady` | Git installed + configured, at least one package manager installed |
| `aiReady` | At least one AI CLI authenticated (Claude OR Codex OR Copilot) |
| `languageReady` | Python installed |

### Tool Status Helper

`isToolConfigured(tool)` returns true when:
- `status === 'installed'`
- `auth_status !== 'unauthenticated'`
- For Copilot: `details.trust_configured === 'true'`

### Blocked Wizard Logic

Some wizards have prerequisites:
- **Codex**: Blocked if npm is not installed. Alert offers to open Package Tools wizard.
- **Copilot**: Blocked if Git not configured or GitHub CLI not authenticated. Alert offers to open Git wizard.

## SetupChecklist Component

**Source**: `src/components/setup/SetupChecklist.tsx`

Groups tools into sections, renders each as a `SetupCheckItem`. Supports pull-to-refresh for re-checking prerequisites. Props map each tool to its handler:

- `onInstall(tool)` → opens InstallSheet with `tool.install_command`
- `onAuthenticate(tool)` → opens InstallSheet with `tool.auth_command`
- `onGitWizard` → opens GitWizardSheet
- `onClaudeWizard` → opens ClaudeWizardSheet
- `onCodexWizard` / `onBlockedCodexWizard` → opens wizard or shows blocked alert
- `onCopilotWizard` / `onBlockedCopilotWizard` → opens wizard or shows blocked alert
- `onPkgWizard` → opens PackageManagerWizardSheet
- `onPythonWizard` → opens PythonWizardSheet

## Wizard Pattern

All wizard sheets follow the same architecture:

1. **Props**: `{ visible, onClose, onComplete }`
2. **State machine**: `useReducer` with typed state + actions
3. **Step progression**: Linear steps with back/retry support
4. **Terminal integration**: Steps use `useTerminalCommand` for running install/auth commands
5. **Detection phase**: First step always detects current tool status via API
6. **Completion**: Calls `onComplete()` which triggers a celebration animation

### State Machine Pattern

```typescript
interface WizardState {
  currentStep: Step
  stepStatuses: Record<Step, StepStatus>
  toolStatus: ToolStatusFromAPI | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; toolStatus: ... }
  | { type: 'STEP_COMPLETE'; step: Step }
  | { type: 'STEP_FAILED'; step: Step; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }
```

### Stepper UI

Each wizard renders a `WizardStepper` component showing:
- Step list with icons (pending/active/complete/failed)
- Active step content area
- Back/Next navigation

## Individual Wizards

### GitWizardSheet

**Steps** (8): detect → install → generate-key → add-to-github → test-connection → install-gh → github-cli-auth → configure-identity

**State includes**: `sshStatus`, `publicKey`, `userName`, `userEmail`, `githubUsername`

**Sub-components**: `git-wizard/DetectStep`, `InstallGitStep`, `GenerateKeyStep`, `AddToGitHubStep`, `TestConnectionStep`, `InstallGitHubCliStep`, `GitHubCliAuthStep`, `ConfigureIdentityStep`

### ClaudeWizardSheet

**Steps** (4): detect → install → authenticate → verify

**State includes**: `claudeStatus`

**Auth flow**: Starts auth session on server, polls for status, handles OAuth URL display

### CodexWizardSheet

**Steps** (5): detect → review → install → authenticate → verify

**State includes**: `codexStatus`, `npmReady`, `authSession`

**Auth flow**: Browser-based OAuth or device code flow, with replay callback

### CopilotWizardSheet

**Steps** (5): detect → install → authenticate → trust → verify

**State includes**: `copilotStatus`, `authSession`, `trustSession`

**Trust flow**: Copilot requires explicit directory trust via TUI interaction

### PackageManagerWizardSheet

**Steps** (4): detect → review → install → verify

**State includes**: `pkgStatus`, `selectedTools` (user picks which managers to install)

**Model**: `pkg-wizard/model.ts` provides default tool selection

### PythonWizardSheet

**Steps** (6): detect → add-ppa → install → install-venv → install-pip → verify

**State includes**: `pythonStatus`

## InstallSheet (Generic Terminal)

**Source**: `src/components/setup/InstallSheet.tsx`

Runs any command in a terminal session with:
- Error detection via regex patterns (APT errors, permission denied, command not found, etc.)
- Success/failure UI
- "AI Inspect" button on failure → opens AiInspectSheet
- Sudo password prompt integration via `useTerminalCommand`

## AiInspectSheet (AI Diagnosis)

**Source**: `src/components/setup/AiInspectSheet.tsx`

When a command fails:
1. Checks if Claude CLI or Codex CLI is authenticated
2. Starts an AI task with the failed command + output as context
3. Streams diagnostic output
4. Extracts suggested fix command
5. User can apply the fix (opens InstallSheet with the fix command)
