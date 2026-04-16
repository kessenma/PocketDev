# Minimax Provider Wizard

## Overview

Minimax is an AI provider surfaced through OpenCode — it is **not a standalone CLI binary**. The Minimax wizard's job is:

1. Gate on OpenCode being installed (prerequisite)
2. Collect the user's Minimax API key
3. Write the key to OpenCode's config on the server
4. Verify the key is present and accepted

There is no binary to install, no OAuth flow, and no interactive terminal session. This is a pure API-key configuration wizard: **detect → review → configure → verify**.

## Prerequisite

OpenCode must be installed before Minimax can be configured. The checklist item should show a `disabledReason` if `opencode_cli` is not yet installed. The wizard's ReviewStep also shows a blocking error and a "Setup OpenCode First" button if detected without OpenCode present.

---

## Step Definitions

| # | Key | What it does |
|---|-----|--------------|
| 1 | `detect` | Calls `GET /minimax-setup/status` — checks if OpenCode is installed and if a Minimax API key is already configured |
| 2 | `review` | Shows current state as status cards. Gates on `opencode_installed`. If missing, shows warning + "Setup OpenCode First" button (calls `onClose()`). Otherwise, shows API key status and scope note, then "Continue setup" |
| 3 | `configure` | Secure `TextInput` for the API key (eye-toggle, no autocorrect/autocapitalize). "Get API Key" deep-link button. "Save Key" calls `POST /minimax-setup/configure`. Shows masked key in a success card before auto-advancing (~300ms) |
| 4 | `verify` | Calls `POST /minimax-setup/verify`. Confirms key is present in OpenCode config. Success shows Minimax logo + masked key. Failure shows Go Back + Retry buttons |

---

## Types — `packages/shared/src/types/setup.ts`

Add after the existing OpenCode type block:

```ts
// ─── Minimax wizard types ─────────────────────────────────────────

export interface MinimaxSetupStatus {
  opencode_installed: boolean
  opencode_version: string | null
  api_key_configured: boolean
  api_key_masked: string | null   // e.g. "sk-mm-...ab12" — last 4 chars only, never the full key
  verified: boolean
  verify_output: string | null
}

export interface MinimaxConfigureRequest {
  api_key: string
}

export interface MinimaxConfigureResult {
  success: boolean
  api_key_masked: string | null
  error: string | null
}

export type MinimaxWizardStep = 'detect' | 'review' | 'configure' | 'verify'
export type MinimaxWizardStepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'failed'
```

Also add `MinimaxSetupStatus`, `MinimaxConfigureRequest`, `MinimaxConfigureResult`, `MinimaxWizardStep`, `MinimaxWizardStepStatus` to the barrel export in `packages/shared/src/types/index.ts`.

---

## Agent Service — `apps/agent/src/services/cli-setup/minimax-setup.ts`

### `checkMinimaxStatus(): Promise<MinimaxSetupStatus>`

1. Check if OpenCode binary exists (reuse `checkOpenCodeStatus()` from `opencode-setup.ts` — just read `installed` + `version` from the result)
2. Find the OpenCode config file. Candidate paths in order:
   - `~/.config/opencode/config.json`
   - `~/.opencode/config.json`
3. If config exists, parse JSON and look for the Minimax API key. OpenCode stores provider config at `providers.minimax.apiKey` or as an env-var entry. Check both:
   - `config.providers?.minimax?.apiKey`
   - The `MINIMAX_API_KEY` env var (as a fallback read)
4. Return `MinimaxSetupStatus` with masked key (`"sk-mm-...${key.slice(-4)}"`) — never return the raw key
5. `verified` = key is present and non-empty (no network call needed at check time)

### `configureMinimaxKey(apiKey: string): Promise<MinimaxConfigureResult>`

1. Validate the key is non-empty
2. Try to write via CLI: `opencode config set providers.minimax.apiKey <key>` (if that subcommand exists)
3. If CLI command is not available, directly patch the config JSON file:
   - Read existing config (or start with `{}`)
   - Deep-set `providers.minimax.apiKey = apiKey`
   - Write back to the config path
4. **Never log the raw key.** Mask before returning: `"sk-mm-...${key.slice(-4)}"`
5. On success, call `upsertToolPath('minimax_provider', configPath, opencodeVersion)` to record it in the agent's tool DB
6. Return `MinimaxConfigureResult`

### `verifyMinimax(): Promise<MinimaxSetupStatus>`

Re-run `checkMinimaxStatus()`. No network call to Minimax needed — the verify step only confirms the key is written and present. This keeps verification instant and offline.

---

## Agent Routes — `apps/agent/src/routes/minimax-setup.ts`

```ts
import { Elysia } from 'elysia'
import { authenticateRequest } from '../services/auth/auth.ts'
import { checkMinimaxStatus, configureMinimaxKey, verifyMinimax } from '../services/cli-setup/minimax-setup.ts'

export const minimaxSetupRoutes = new Elysia({ prefix: '/minimax-setup' })
  .get('/status', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    return checkMinimaxStatus()
  })
  .post('/configure', async ({ request, set, body }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    const { api_key } = body as { api_key: string }
    return configureMinimaxKey(api_key)
  })
  .post('/verify', async ({ request, set }) => {
    const deviceId = await authenticateRequest(request.headers.get('authorization'))
    if (!deviceId) { set.status = 401; return { error: 'Unauthorized' } }
    return verifyMinimax()
  })
```

Register in `apps/agent/src/index.ts` alongside the other `*SetupRoutes`.

---

## Mobile API — `apps/mobile/src/services/api.ts`

Add after the OpenCode setup section (around line 1054):

```ts
// ─── Minimax Provider Setup ────────────────────────────────────────────

export async function fetchMinimaxSetupStatus(ip: string, port: number): Promise<MinimaxSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/minimax-setup/status'), {
    headers: await authHeader(),
  })
  if (!response.ok) throw new Error(`Failed to fetch Minimax status (${response.status})`)
  return response.json() as Promise<MinimaxSetupStatus>
}

export async function postConfigureMinimax(
  ip: string,
  port: number,
  apiKey: string,
): Promise<MinimaxConfigureResult> {
  const response = await fetch(apiUrl(ip, port, '/minimax-setup/configure'), {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey } satisfies MinimaxConfigureRequest),
  })
  if (!response.ok) throw new Error(`Failed to configure Minimax (${response.status})`)
  return response.json() as Promise<MinimaxConfigureResult>
}

export async function postVerifyMinimax(ip: string, port: number): Promise<MinimaxSetupStatus> {
  const response = await fetch(apiUrl(ip, port, '/minimax-setup/verify'), {
    method: 'POST',
    headers: await authHeader(),
  })
  if (!response.ok) throw new Error(`Failed to verify Minimax (${response.status})`)
  return response.json() as Promise<MinimaxSetupStatus>
}
```

Import the new types at the top of `api.ts` alongside other setup types:
`MinimaxSetupStatus`, `MinimaxConfigureRequest`, `MinimaxConfigureResult`

---

## Mobile Components

### Wizard container — `apps/mobile/src/components/setup/MinimaxWizardSheet.tsx`

Base template: `OpenCodeWizardSheet.tsx`. Key differences:

**Steps:**
```ts
const ALL_STEPS: MinimaxWizardStep[] = ['detect', 'review', 'configure', 'verify']
```

**State:**
```ts
interface WizardState {
  currentStep: MinimaxWizardStep
  stepStatuses: Record<MinimaxWizardStep, MinimaxWizardStepStatus>
  minimaxStatus: MinimaxSetupStatus | null
  error: string | null
  allConfigured: boolean
}
```

**Skip logic in `DETECTION_COMPLETE`:**
- If `api_key_configured && verified` → skip `configure` + `verify`, set `allConfigured: true`
- If `api_key_configured && !verified` → skip `configure` only, advance to `verify`
- If `!opencode_installed` → advance to `review` (ReviewStep shows the blocking error — don't skip anything)

**`FORCE_REINSTALL` action:** resets `configure` to `active`, re-pends `verify` if skipped. Allows re-entering a new API key.

**Completion screen:**
```tsx
<Image source={isDark ? Assets.minimaxWhite : Assets.minimaxBlack} style={styles.completedLogo} resizeMode="contain" />
<Text ...>Minimax is ready!</Text>
<Text ...>Your workspace is configured to use Minimax via OpenCode.</Text>
{state.minimaxStatus?.api_key_masked ? (
  <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>{state.minimaxStatus.api_key_masked}</Text>
) : null}
<TouchableOpacity style={styles.reinstallButton} onPress={() => dispatch({ type: 'FORCE_REINSTALL' })}>
  <RotateCcw ... /> <Text ...>Re-configure</Text>
</TouchableOpacity>
```

---

### Step components — `apps/mobile/src/components/setup/minimax-wizard/`

**`WizardStepper.tsx`**
Identical to the upgraded `opencode-wizard/WizardStepper.tsx`. Types: `MinimaxWizardStep` / `MinimaxWizardStepStatus`. Three visible steps:
```ts
[{ key: 'review', label: 'Review' }, { key: 'configure', label: 'Configure' }, { key: 'verify', label: 'Verify' }]
```

**`DetectStep.tsx`**
Pattern: `opencode-wizard/DetectStep.tsx`.
- On mount, call `fetchMinimaxSetupStatus`
- Show Minimax logo + loading spinner
- Dispatch `DETECTION_COMPLETE` with status or `STEP_FAILED` on error
- No special animation needed (no `CodexSetupAnimation` equivalent — the simple spinner is fine here)

**`ReviewStep.tsx`**
Pattern: `opencode-wizard/ReviewStep.tsx` (card-based with `StatusRow` components).

Status cards:
1. **OpenCode Runtime** — `Check` (green) if `opencode_installed`, `CircleAlert` (red) if not. Detail: version string or "OpenCode must be installed first."
2. **Minimax API Key** — `Check` (green) if `api_key_configured`, `ShieldCheck` (primary) if not. Detail: masked key or "You'll enter your Minimax API key in the next step."
3. **Scope** — `TerminalSquare` (primary). Value: "Provider config only". Detail: "No binary is installed. This configures Minimax as an OpenCode provider on your workspace."

If `!openCodeStatus?.opencode_installed`: show a warning banner below the cards, and replace the "Continue setup" button with a "Setup OpenCode First" button that calls `onClose()`. This avoids prop-drilling a wizard-switch callback.

**`ConfigureStep.tsx`** *(new — no equivalent in OpenCode wizard)*

```
Hero: Minimax logo + "Enter your Minimax API key" title

API key input card:
  - TextInput with secureTextEntry toggled by Eye/EyeOff icon button
  - autoCapitalize="none", autoCorrect={false}, keyboardType="ascii-capable"
  - placeholder="sk-mm-..."
  - returnKeyType="done" → triggers save

"Get API Key" link row (opens minimax.io API key page via Linking.openURL)

"Save Key" primary button:
  - Calls postConfigureMinimax with key value
  - Loading state: spinner + "Saving…"
  - Success: brief green card showing masked key, auto-advance after 300ms
  - Error: inline red text below the input field (don't navigate away)

Note: The key is sent over PocketDev's authenticated HTTPS channel, not stored locally.
```

**`VerifyStep.tsx`**
Pattern: `opencode-wizard/VerifyStep.tsx` almost exactly.
- Auto-runs `postVerifyMinimax` on mount
- Success: check circle + "Verified" + masked key as detail text. Dispatch `STEP_COMPLETE` after 800ms
- Failure: show verify output excerpt (if any), Go Back + Retry buttons

---

## Prerequisite Integration

### `apps/agent/src/services/cli-setup/prerequisites.ts`

Add a synthetic tool check for the Minimax provider. Minimax has no binary — it's represented by whether the API key is configured:

```ts
async function checkMinimaxProviderTool(): Promise<ToolCheck> {
  const status = await checkMinimaxStatus()
  const configured = status.opencode_installed && status.api_key_configured
  return {
    id: 'minimax_provider',
    name: 'Minimax',
    status: configured ? 'installed' : 'missing',
    auth_status: 'not_applicable',
    version: status.opencode_version,
    path: null,
    required: false,
    install_command: null,
    auth_command: null,
    details: {
      api_key_masked: status.api_key_masked ?? '',
      opencode_installed: String(status.opencode_installed),
    },
  }
}
```

Add `checkMinimaxProviderTool()` to the parallel tool checks in `checkAllPrerequisites()`, alongside `opencode_cli` in the AI assistant tools section.

### `apps/mobile/src/components/setup/setup-tool-utils.ts`

Add:
```ts
export function getMinimaxBlockedReason(report: PrerequisitesReport | null): string | null {
  if (!report) return null
  const opencode = report.tools.find((t) => t.id === 'opencode_cli')
  if (opencode?.status !== 'installed') {
    return 'OpenCode must be installed first. Minimax is configured as an OpenCode provider.'
  }
  return null
}
```

### `apps/mobile/src/components/setup/SetupCheckItem.tsx`

1. Add to the tool asset map:
   ```ts
   minimax_provider: { light: Assets.minimaxBlack, dark: Assets.minimaxWhite },
   ```
2. Add `onMinimaxWizard?: () => void` to Props
3. Add action button for `minimax_provider` (same pattern as OpenCode / Codex wizard buttons)

### `apps/mobile/src/components/setup/SetupChecklist.tsx`

1. Add `onMinimaxWizard: () => void` to Props interface
2. Pass `onMinimaxWizard` through `renderTools` to `SetupCheckItem`
3. Compute `minimaxBlockedReason = getMinimaxBlockedReason(report)` and pass as `disabledReason` to the Minimax `SetupCheckItem`

### `apps/mobile/src/screens/ServerSetupScreen.tsx`

```ts
// Import
import MinimaxWizardSheet from '../components/setup/MinimaxWizardSheet'
import { getMinimaxBlockedReason } from '../components/setup/setup-tool-utils'

// State
const [showMinimaxWizard, setShowMinimaxWizard] = useState(false)
const minimaxBlockedReason = getMinimaxBlockedReason(report)

// Handlers
const handleMinimaxWizard = useCallback(() => {
  if (minimaxBlockedReason) {
    Alert.alert('Install OpenCode first', minimaxBlockedReason, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open OpenCode Setup', onPress: () => setShowOpenCodeWizard(true) },
    ])
    return
  }
  setShowMinimaxWizard(true)
}, [minimaxBlockedReason])

const handleMinimaxWizardComplete = useCallback(() => {
  setShowMinimaxWizard(false)
}, [])
```

Pass `onMinimaxWizard={handleMinimaxWizard}` to `SetupChecklist`.

Mount below the OpenCode wizard sheet:
```tsx
<MinimaxWizardSheet
  visible={showMinimaxWizard}
  onClose={() => setShowMinimaxWizard(false)}
  onComplete={handleMinimaxWizardComplete}
/>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/agent/src/services/cli-setup/minimax-setup.ts` | Status check, key configure, verify |
| `apps/agent/src/routes/minimax-setup.ts` | REST routes: GET /status, POST /configure, POST /verify |
| `apps/mobile/src/components/setup/MinimaxWizardSheet.tsx` | Wizard container with state machine |
| `apps/mobile/src/components/setup/minimax-wizard/WizardStepper.tsx` | Vertical circle stepper (3 steps) |
| `apps/mobile/src/components/setup/minimax-wizard/DetectStep.tsx` | Status check on mount |
| `apps/mobile/src/components/setup/minimax-wizard/ReviewStep.tsx` | OpenCode gate + key status review |
| `apps/mobile/src/components/setup/minimax-wizard/ConfigureStep.tsx` | Secure API key input |
| `apps/mobile/src/components/setup/minimax-wizard/VerifyStep.tsx` | Confirm key is written |

## Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/types/setup.ts` | Add Minimax type block |
| `packages/shared/src/types/index.ts` | Export new Minimax types |
| `apps/agent/src/index.ts` | Register `minimaxSetupRoutes` |
| `apps/agent/src/services/cli-setup/prerequisites.ts` | Add `checkMinimaxProviderTool`, include in parallel checks |
| `apps/mobile/src/services/api.ts` | Add 3 API functions + type imports |
| `apps/mobile/src/components/setup/setup-tool-utils.ts` | Add `getMinimaxBlockedReason` |
| `apps/mobile/src/components/setup/SetupCheckItem.tsx` | Add asset entry + wizard button |
| `apps/mobile/src/components/setup/SetupChecklist.tsx` | Add `onMinimaxWizard` prop + blocked reason |
| `apps/mobile/src/screens/ServerSetupScreen.tsx` | State, handlers, sheet mount, prop pass |
