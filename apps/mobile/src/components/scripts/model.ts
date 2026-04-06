export type ScriptCategory = 'dev' | 'build' | 'test' | 'lint' | 'other'

const DEV_NAMES = /^(dev|start|serve|preview)/i
const BUILD_NAMES = /^(build|compile|bundle)/i
const TEST_NAMES = /^(test|jest|vitest|e2e|cypress)/i
const LINT_NAMES = /^(lint|format|prettier|eslint|check-types|typecheck|type-check)/i

export function categorizeScript(name: string): ScriptCategory {
  if (DEV_NAMES.test(name)) return 'dev'
  if (BUILD_NAMES.test(name)) return 'build'
  if (TEST_NAMES.test(name)) return 'test'
  if (LINT_NAMES.test(name)) return 'lint'
  return 'other'
}

const CATEGORY_ORDER: ScriptCategory[] = ['dev', 'build', 'test', 'lint', 'other']

export const CATEGORY_LABELS: Record<ScriptCategory, string> = {
  dev: 'Dev Servers',
  build: 'Build',
  test: 'Test',
  lint: 'Lint & Format',
  other: 'Other',
}

export interface CategorizedScript {
  name: string
  command: string
  category: ScriptCategory
}

export function categorizeScripts(scripts: Record<string, string>): CategorizedScript[] {
  return Object.entries(scripts)
    .map(([name, command]) => ({
      name,
      command,
      category: categorizeScript(name),
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
}

export function groupByCategory(scripts: CategorizedScript[]): Map<ScriptCategory, CategorizedScript[]> {
  const groups = new Map<ScriptCategory, CategorizedScript[]>()
  for (const script of scripts) {
    const existing = groups.get(script.category) ?? []
    existing.push(script)
    groups.set(script.category, existing)
  }
  return groups
}

// ─── Suggested Actions ──────────────────────────────────

export interface SuggestedAction {
  id: string
  label: string
  description: string
  command: (pm: string) => string
}

const SUGGESTED_ACTIONS: SuggestedAction[] = [
  {
    id: 'install',
    label: 'Install',
    description: 'Install all dependencies from the lockfile',
    command: (pm) => `${pm} install`,
  },
  {
    id: 'clean-install',
    label: 'Clean Install',
    description: 'Remove node_modules and reinstall from scratch',
    command: (pm) => `rm -rf node_modules && ${pm} install`,
  },
  {
    id: 'outdated',
    label: 'Outdated',
    description: 'Check for outdated dependencies',
    command: (pm) => `${pm} outdated`,
  },
  {
    id: 'audit',
    label: 'Audit',
    description: 'Check for known security vulnerabilities',
    command: (pm) => pm === 'pnpm' ? 'pnpm audit' : pm === 'yarn' ? 'yarn audit' : `${pm} audit`,
  },
]

export function getSuggestedActions(packageManager: string): Array<SuggestedAction & { resolvedCommand: string }> {
  return SUGGESTED_ACTIONS.map((action) => ({
    ...action,
    resolvedCommand: action.command(packageManager),
  }))
}
