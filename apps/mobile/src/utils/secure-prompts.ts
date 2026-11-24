/**
 * Detects interactive prompts (passwords, verification codes, …) in streamed
 * terminal output so the app can show a native entry sheet instead of making
 * the user type into the raw terminal.
 *
 * Pure module — no React / React Native imports — so it can be unit tested.
 */

export type SecurePromptKind = 'password' | 'code' | 'text'

export interface SecurePromptSpec {
  /** Tested against the recent output (ANSI codes removed). Anchor with `\s*$` for prompts that wait for input. */
  pattern: RegExp
  title: string
  message?: string
  /** password: hidden entry · code: number pad / one-time code · text: plain (e.g. an email address) */
  kind: SecurePromptKind
  /** When this matches the recent output at trigger time, the matched text is shown instead of `message`. */
  detailPattern?: RegExp
  placeholder?: string
  /** Prefill for `text` prompts */
  defaultValue?: string
  /** Optional secondary button that sends a fixed answer (e.g. `sms`) */
  alternative?: { label: string; value: string }
}

export interface SecurePromptMatch {
  title: string
  message: string | null
  kind: SecurePromptKind
  placeholder: string | null
  defaultValue: string
  alternative: { label: string; value: string } | null
}

export interface SecurePromptMatcher {
  /** Feed one output chunk; returns a match at most once per prompt occurrence. */
  push: (chunk: string) => SecurePromptMatch | null
  reset: () => void
}

export const SECURE_PROMPT_BUFFER_SIZE = 400

// CSI sequences, OSC sequences (BEL or ST terminated) and single-char escapes.
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

function testPattern(pattern: RegExp, text: string): boolean {
  pattern.lastIndex = 0
  const result = pattern.test(text)
  pattern.lastIndex = 0
  return result
}

function matchDetail(pattern: RegExp | undefined, text: string): string | null {
  if (!pattern) return null
  pattern.lastIndex = 0
  const match = text.match(pattern)
  pattern.lastIndex = 0
  const value = match?.[0]?.replace(/\s+/g, ' ').trim()
  return value || null
}

/**
 * Keeps a small rolling buffer of recent output so prompts split across
 * chunks are still found. The buffer is cleared after a match, so a prompt
 * triggers once per occurrence.
 */
export function createSecurePromptMatcher(
  specs: SecurePromptSpec[] | (() => SecurePromptSpec[]),
  bufferSize: number = SECURE_PROMPT_BUFFER_SIZE,
): SecurePromptMatcher {
  let buffer = ''
  const getSpecs = typeof specs === 'function' ? specs : () => specs

  return {
    push(chunk: string) {
      const current = getSpecs()
      if (!current.length || !chunk) return null
      buffer = (buffer + chunk).slice(-bufferSize)
      const clean = stripAnsi(buffer)

      for (const spec of current) {
        if (!testPattern(spec.pattern, clean)) continue
        const detail = matchDetail(spec.detailPattern, clean)
        buffer = ''
        return {
          title: spec.title,
          message: detail ?? spec.message ?? null,
          kind: spec.kind,
          placeholder: spec.placeholder ?? null,
          defaultValue: spec.defaultValue ?? '',
          alternative: spec.alternative ?? null,
        }
      }
      return null
    },
    reset() {
      buffer = ''
    },
  }
}

/**
 * Make raw PTY output readable for display: drop ANSI sequences and
 * backspaces, hide the echoed wizard wrapper command, and apply
 * carriage-return overwrites (progress bars redraw lines with `\r`).
 */
export function cleanTerminalOutput(raw: string): string {
  return stripAnsi(raw)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, (c) => (c === '\r' ? c : ''))
    .split('\n')
    // Lines carrying PocketDev's result markers are the echoed wrapper command
    // (redrawn by the shell's line editor) or the markers themselves.
    .filter((line) => !line.includes('__PD_'))
    .map((line) => {
      const parts = line.replace(/\r+$/, '').split('\r')
      return parts[parts.length - 1]
    })
    .join('\n')
    .replace(/^\n+/, '')
}

/** True when `line` appears on its own line in the output (ignores the echoed command that printed it). */
export function outputHasLine(output: string, line: string): boolean {
  return stripAnsi(output)
    .split(/[\r\n]+/)
    .some((l) => l.trim() === line)
}
