import type { TaskActivity } from '@pocketdev/shared/types'

const SPINNER_CHAR_RE = /^[✽✢✶✻✷✹✺✸*·]\s+/

export function isPaneChromeOnly(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  if (/^[─━═╌╍]+$/.test(t)) return true          // horizontal separator
  if (/[▛▜]/.test(t)) return true                 // TUI block-draw header chars
  if (/^❯\s*$/.test(t)) return true               // empty input cursor
  if (/^(esc to interrupt|ctrl\+g to edit|\? for shortcuts)\b/i.test(t)) return true
  if (/^\/[^\s]+\/[^\s]*$/.test(t)) return true   // bare cwd path
  return false
}

export function spinnerKey(line: string): string {
  return line.trim().replace(SPINNER_CHAR_RE, '⟳ ')
}

type ToolKind = 'read' | 'search' | 'write' | 'create' | 'run' | 'agent' | 'plan' | 'mcp' | 'web' | 'image' | 'info'

export function inferToolKindFromName(name: string): ToolKind {
  const n = name.toLowerCase()
  if (n === 'write') return 'write'
  if (n === 'read') return 'read'
  if (n === 'edit' || n === 'multiedit' || n === 'apply_patch') return 'write'
  if (n === 'glob' || n === 'grep' || n.includes('find') || n.includes('search')) return 'search'
  if (n === 'bash' || n.includes('run') || n.includes('exec')) return 'run'
  if (n.includes('agent') || n.includes('task') || n.includes('sub')) return 'agent'
  if (n.includes('todo') || n.includes('plan')) return 'plan'
  if (n.includes('web') || n.includes('browser') || n.includes('fetch')) return 'web'
  if (n.includes('image') || n.includes('screenshot')) return 'image'
  if (n.startsWith('mcp')) return 'mcp'
  return 'info'
}

export function parsePaneLineToActivity(line: string): TaskActivity | null {
  const t = line.trim()
  if (!t) return null

  const spinnerMatch = t.match(/^[✽✢✶✻✷✹✺✸*·]\s+(.+?)(\s+\(thinking\))?$/)
  if (spinnerMatch) {
    const msg = spinnerMatch[1]
    return spinnerMatch[2]
      ? { type: 'thinking', provider: 'claude', preview: msg }
      : { type: 'status', provider: 'claude', message: msg }
  }

  if (/^[❯✔✓✗⟳]/.test(t) || t === '>') return null
  if (line.startsWith(' ') || line.startsWith('\t')) return null

  return { type: 'text', provider: 'claude', content: t }
}
