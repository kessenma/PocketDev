import type { AppleSetupStatus, PrerequisitesReport, ToolCheck } from '@pocketdev/shared/types'
import type { SecurePromptSpec } from '../../../utils/secure-prompts'
import { outputHasLine } from '../../../utils/secure-prompts'
import { getToolById } from '../setup-tool-utils'

// ─── Wizard steps ──────────────────────────────────────────────────

export type AppleWizardStep = 'xcode' | 'asc' | 'account' | 'verify'

export const APPLE_WIZARD_STEPS: { key: AppleWizardStep; label: string }[] = [
  { key: 'xcode', label: 'Xcode' },
  { key: 'asc', label: 'asc CLI' },
  { key: 'account', label: 'Account' },
  { key: 'verify', label: 'Verify' },
]

export function isXcodeReady(status: AppleSetupStatus): boolean {
  const { xcode } = status
  return xcode.installed && xcode.selected && xcode.license_accepted && !xcode.beta
}

export function isAppleStepDone(step: AppleWizardStep, status: AppleSetupStatus): boolean {
  switch (step) {
    case 'xcode':
      return isXcodeReady(status) && !status.commands.finish_xcode
    case 'asc':
      return status.asc.installed
    case 'account':
      return status.account.configured
    case 'verify':
      return status.ready && status.account.validation === 'ok'
  }
}

/** First step that still needs work; `verify` when everything is set up. */
export function getFirstAppleStep(status: AppleSetupStatus): AppleWizardStep {
  const pending = APPLE_WIZARD_STEPS.find((s) => s.key !== 'verify' && !isAppleStepDone(s.key, status))
  return pending?.key ?? 'verify'
}

// ─── Workspace Tools card rows ─────────────────────────────────────

export type AppleRowState = 'ready' | 'attention' | 'missing'

export interface AppleSummaryRow {
  id: 'xcode' | 'asc_cli' | 'asc_key'
  label: string
  state: AppleRowState
  detail: string
}

function xcodeRow(tool: ToolCheck | undefined): AppleSummaryRow {
  const label = 'Xcode'
  if (!tool || tool.status === 'missing') return { id: 'xcode', label, state: 'missing', detail: 'Not installed' }
  const version = tool.version ? `Xcode ${tool.version}` : 'Installed'
  if (tool.status === 'misconfigured') {
    const detail = tool.details.beta === 'true'
      ? `${version} · beta can't upload`
      : `${version} · needs a one-time setup`
    return { id: 'xcode', label, state: 'attention', detail }
  }
  return { id: 'xcode', label, state: 'ready', detail: version }
}

function ascRow(tool: ToolCheck | undefined): AppleSummaryRow {
  const label = 'asc CLI'
  if (!tool || tool.status !== 'installed') return { id: 'asc_cli', label, state: 'missing', detail: 'Not installed' }
  return { id: 'asc_cli', label, state: 'ready', detail: tool.version ? `v${tool.version.replace(/^v/, '')}` : 'Installed' }
}

function keyRow(tool: ToolCheck | undefined): AppleSummaryRow {
  const label = 'App Store Connect key'
  if (tool?.status === 'installed' && tool.auth_status === 'authenticated') {
    return { id: 'asc_key', label, state: 'ready', detail: tool.details.key_id ? `Key ${tool.details.key_id}` : 'Connected' }
  }
  return { id: 'asc_key', label, state: 'missing', detail: 'Not connected' }
}

export function getAppleSummaryRows(report: PrerequisitesReport | null): AppleSummaryRow[] {
  const xcode = getToolById(report, 'xcode')
  const asc = getToolById(report, 'asc_cli')
  return [xcodeRow(xcode), ascRow(asc), keyRow(asc)]
}

// ─── Key import helpers ────────────────────────────────────────────

/** `AuthKey_ABC123DEFG.p8` (also `AuthKey_ABC123DEFG (1).p8`) → `ABC123DEFG` */
export function parseKeyIdFromFileName(name: string | null | undefined): string | null {
  if (!name) return null
  const base = name.split(/[\\/]/).pop() ?? ''
  const match = base.match(/^AuthKey_([A-Za-z0-9]{10})(?:\s*\(\d+\))?\.p8$/i)
  return match ? match[1].toUpperCase() : null
}

export const KEY_ID_PATTERN = /^[A-Z0-9]{10}$/
export const ISSUER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const APPLE_ID_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isLikelyP8Key(text: string): boolean {
  return /-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(text)
}

/** RNFS wants a plain path; the document picker hands back `file://` URIs (iOS) or `content://` URIs (Android). */
export function toReadablePath(uri: string): string {
  if (uri.startsWith('file://')) {
    try {
      return decodeURIComponent(uri.slice('file://'.length))
    } catch {
      return uri.slice('file://'.length)
    }
  }
  return uri
}

// ─── Terminal command helpers ──────────────────────────────────────

/** Printed by the create-key command once asc has written the key. */
export const KEY_CREATED_LINE = 'PocketDev: API key created.'

/**
 * Wrap a command so its result shows up as a line we can detect. printf
 * splits the marker, so the echoed command line never matches by itself.
 */
export function withResultMarker(command: string, runId: string): string {
  return `( ${command} ) && printf '\\n%s_%s\\n' __PD_${runId} OK || printf '\\n%s_%s\\n' __PD_${runId} FAIL`
}

export function getMarkerResult(output: string, runId: string): 'ok' | 'fail' | null {
  if (outputHasLine(output, `__PD_${runId}_OK`)) return 'ok'
  if (outputHasLine(output, `__PD_${runId}_FAIL`)) return 'fail'
  return null
}

let runCounter = 0
export function nextRunId(prefix: string): string {
  runCounter += 1
  return `${prefix}${Date.now().toString(36)}${runCounter}`.replace(/[^A-Za-z0-9]/g, '')
}

// ─── Prompts answered through the secure entry sheet ───────────────

export const ASC_SIGN_IN_PROMPTS: SecurePromptSpec[] = [
  {
    pattern: /Apple Account password:\s*$/,
    title: 'Apple Account password',
    message: 'Sent straight to Apple’s sign-in on your Mac. PocketDev doesn’t save it.',
    kind: 'password',
    placeholder: 'Password',
  },
  {
    pattern: /Enter 2FA code:\s*$/,
    title: 'Verification code',
    message: 'Enter the code Apple sent to your trusted devices.',
    detailPattern: /Verification code sent to[^\r\n]*/,
    kind: 'code',
    placeholder: '6-digit code',
  },
]

export function getXcodesPrompts(appleId: string): SecurePromptSpec[] {
  return [
    {
      pattern: /Apple ID Password:\s*$/,
      title: 'Apple Account password',
      message: 'Sent straight to Apple’s sign-in on your Mac. PocketDev doesn’t save it.',
      kind: 'password',
      placeholder: 'Password',
    },
    {
      pattern: /Apple ID:\s*$/,
      title: 'Apple Account email',
      kind: 'text',
      placeholder: 'name@example.com',
      defaultValue: appleId,
    },
    {
      pattern: /Select a trusted phone number[^\r\n]*:\s*$/,
      title: 'Choose a phone number',
      message: 'Enter the number shown next to your phone in the terminal output.',
      kind: 'code',
      placeholder: '1',
    },
    {
      pattern: /digit code from one of your trusted devices/,
      title: 'Verification code',
      message: 'Enter the code shown on your trusted Apple device.',
      kind: 'code',
      placeholder: '6-digit code',
      alternative: { label: 'Text me a code instead', value: 'sms' },
    },
    {
      pattern: /digit code sent to/,
      title: 'Verification code',
      message: 'Enter the code Apple sent by text message.',
      kind: 'code',
      placeholder: '6-digit code',
    },
  ]
}
