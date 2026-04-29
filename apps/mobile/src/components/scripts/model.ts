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

export type ResolvedAction = SuggestedAction & {
  resolvedCommand: string
  useRootCwd: boolean
}

export interface MonorepoContext {
  packageName: string
  packagePath: string
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

function getWorkspaceActions(pm: string, name: string, path: string): ResolvedAction[] {
  // npm uses path for --workspace=; all others use the package name for --filter
  const ref = pm === 'npm' ? path : name

  const cmds = {
    install: {
      pnpm: `pnpm --filter ${ref} install`,
      bun: `bun install --filter ${ref}`,
      npm: `npm install --workspace=${ref}`,
      yarn: `yarn workspace ${ref} install`,
    } as Record<string, string>,
    outdated: {
      pnpm: `pnpm --filter ${ref} outdated`,
      bun: `bun outdated --filter ${ref}`,
      npm: `npm outdated --workspace=${ref}`,
      yarn: `yarn workspace ${ref} outdated`,
    } as Record<string, string>,
    audit: {
      pnpm: `pnpm --filter ${ref} audit`,
      bun: `bun audit`,
      npm: `npm audit --workspace=${ref}`,
      yarn: `yarn workspace ${ref} audit`,
    } as Record<string, string>,
  }

  return [
    {
      id: 'install',
      label: 'Install',
      description: 'Install dependencies via workspace root',
      command: () => cmds.install[pm] ?? `${pm} install`,
      resolvedCommand: cmds.install[pm] ?? `${pm} install`,
      useRootCwd: true,
    },
    {
      id: 'outdated',
      label: 'Outdated',
      description: 'Check for outdated dependencies',
      command: () => cmds.outdated[pm] ?? `${pm} outdated`,
      resolvedCommand: cmds.outdated[pm] ?? `${pm} outdated`,
      useRootCwd: true,
    },
    {
      id: 'audit',
      label: 'Audit',
      description: 'Check for known security vulnerabilities',
      command: () => cmds.audit[pm] ?? `${pm} audit`,
      resolvedCommand: cmds.audit[pm] ?? `${pm} audit`,
      useRootCwd: true,
    },
  ]
}

export function getWorkspaceInstallActions(
  pm: string,
  workspacePackages: Array<{ name: string; path: string }>,
): ResolvedAction[] {
  return workspacePackages.map(({ name, path }) => {
    const ref = pm === 'npm' ? path : name
    const cmd = ({
      pnpm: `pnpm --filter ${ref} install`,
      bun: `bun install --filter ${ref}`,
      npm: `npm install --workspace=${ref}`,
      yarn: `yarn workspace ${ref} install`,
    } as Record<string, string>)[pm] ?? `${pm} install`
    return {
      id: `install:${path}`,
      label: `Install (${path})`,
      description: `Install dependencies for ${name}`,
      command: () => cmd,
      resolvedCommand: cmd,
      useRootCwd: false,
    }
  })
}

export function getSuggestedActions(packageManager: string, monorepo?: MonorepoContext): ResolvedAction[] {
  if (monorepo) {
    return getWorkspaceActions(packageManager, monorepo.packageName, monorepo.packagePath)
  }
  return SUGGESTED_ACTIONS.map((action) => ({
    ...action,
    resolvedCommand: action.command(packageManager),
    useRootCwd: false,
  }))
}
