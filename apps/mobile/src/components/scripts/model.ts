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
