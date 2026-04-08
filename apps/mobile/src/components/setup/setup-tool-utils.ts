import type { PrerequisitesReport, ToolCheck } from '@pocketdev/shared/types'

export function getToolById(report: PrerequisitesReport | null, toolId: string): ToolCheck | undefined {
  return report?.tools.find((tool) => tool.id === toolId)
}

const PACKAGE_MANAGER_TOOL_IDS = ['node', 'npm', 'pnpm', 'bun'] as const
const AI_ASSISTANT_TOOL_IDS = ['claude_cli', 'codex_cli', 'copilot_cli'] as const
const LANGUAGE_TOOL_IDS = ['python', 'rust', 'go'] as const

function isToolConfigured(tool: ToolCheck | undefined): boolean {
  if (!tool) return false
  if (tool.status !== 'installed') return false
  if (tool.auth_status === 'unauthenticated') return false
  if (tool.id === 'copilot_cli' && tool.details.trust_configured !== 'true') return false
  return true
}

export function getPackageManagerTool(report: PrerequisitesReport | null): ToolCheck {
  const tools = PACKAGE_MANAGER_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)

  const installedCount = tools.filter((tool) => tool.status === 'installed').length
  const allInstalled = PACKAGE_MANAGER_TOOL_IDS.every((id) => getToolById(report, id)?.status === 'installed')
  const anyInstalled = installedCount > 0

  return {
    id: 'npm',
    name: 'Package Managers',
    status: allInstalled ? 'installed' : (anyInstalled ? 'misconfigured' : 'missing'),
    auth_status: 'not_applicable',
    version: null,
    path: null,
    required: true,
    install_command: null,
    auth_command: null,
    details: {
      summary: `${installedCount}/${PACKAGE_MANAGER_TOOL_IDS.length} ready`,
    },
  }
}

export function getRequiredSetupTools(report: PrerequisitesReport | null): ToolCheck[] {
  const gitTool = getToolById(report, 'git')
  return [gitTool, getPackageManagerTool(report)].filter((tool): tool is ToolCheck => !!tool)
}

export function getAiAssistantTools(report: PrerequisitesReport | null): ToolCheck[] {
  return AI_ASSISTANT_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)
}

export function getLanguageTools(report: PrerequisitesReport | null): ToolCheck[] {
  return LANGUAGE_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)
}

export function getSupportingTools(report: PrerequisitesReport | null): ToolCheck[] {
  if (!report) return []
  const primaryIds = new Set(['git', 'github_cli', ...PACKAGE_MANAGER_TOOL_IDS, ...AI_ASSISTANT_TOOL_IDS, ...LANGUAGE_TOOL_IDS])
  return report.tools.filter((tool) => !primaryIds.has(tool.id))
}

export function getServerSetupStatus(report: PrerequisitesReport | null) {
  const requiredReady = getRequiredSetupTools(report).every((tool) => isToolConfigured(tool))
  const aiReady = getAiAssistantTools(report).some((tool) => isToolConfigured(tool))
  const requiredLangTools = getLanguageTools(report).filter((t) => t.required)
  const languageReady = requiredLangTools.length === 0 || requiredLangTools.every((t) => isToolConfigured(t))

  const missing: string[] = []
  if (!requiredReady) {
    const tools = getRequiredSetupTools(report).filter((t) => !isToolConfigured(t))
    tools.forEach((t) => missing.push(t.name))
  }
  if (!aiReady) missing.push('At least one AI assistant (Claude, Codex, or Copilot)')
  if (!languageReady) {
    const tools = requiredLangTools.filter((t) => !isToolConfigured(t))
    tools.forEach((t) => missing.push(t.name))
  }

  return {
    requiredReady,
    aiReady,
    languageReady,
    ready: requiredReady && aiReady && languageReady,
    missing,
  }
}

export type SetupProgressStep = {
  id: string
  label: string
  done: boolean
}

export function getSetupProgress(report: PrerequisitesReport | null): {
  steps: SetupProgressStep[]
  completed: number
  total: number
  fraction: number
} {
  const gitTool = getToolById(report, 'git')
  const pkgTool = getPackageManagerTool(report)
  const aiTools = getAiAssistantTools(report)
  const langTools = getLanguageTools(report)

  const steps: SetupProgressStep[] = [
    { id: 'git', label: 'Git', done: isToolConfigured(gitTool) },
    { id: 'npm', label: 'Packages', done: isToolConfigured(pkgTool) },
    { id: 'ai', label: 'AI', done: aiTools.some((t) => isToolConfigured(t)) },
    ...langTools.map((t) => ({ id: t.id, label: t.name, done: isToolConfigured(t) })),
  ]

  const completed = steps.filter((s) => s.done).length
  const total = steps.length
  return { steps, completed, total, fraction: total > 0 ? completed / total : 0 }
}

export function getCodexBlockedReason(report: PrerequisitesReport | null): string | null {
  if (!report) return null
  const npmTool = getToolById(report, 'npm')
  if (!npmTool || npmTool.status === 'installed') return null
  return 'Install package managers first to make npm available for Codex.'
}

export function getCopilotBlockedReason(report: PrerequisitesReport | null): string | null {
  // Don't block while the report is still loading — the Copilot wizard's
  // own detect step will verify prerequisites before proceeding.
  if (!report) return null

  const gitTool = getToolById(report, 'git')
  if (gitTool && (gitTool.status !== 'installed' || gitTool.auth_status !== 'authenticated')) {
    return 'Complete Git setup first so Copilot can use your Git identity and GitHub access.'
  }

  const githubCliTool = getToolById(report, 'github_cli')
  if (githubCliTool && (githubCliTool.status !== 'installed' || githubCliTool.auth_status !== 'authenticated')) {
    return 'Complete GitHub CLI setup first so Copilot can sign in with GitHub.'
  }

  return null
}
