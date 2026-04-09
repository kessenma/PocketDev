import type { PrerequisitesReport, ToolCheck } from '#/lib/api'

const PACKAGE_MANAGER_TOOL_IDS = ['node', 'npm', 'pnpm', 'bun'] as const
const AI_ASSISTANT_TOOL_IDS = ['claude_cli', 'codex_cli', 'copilot_cli', 'opencode_cli'] as const
const LANGUAGE_TOOL_IDS = ['python', 'rust', 'go', 'typescript'] as const

function getToolById(report: PrerequisitesReport | null, toolId: string): ToolCheck | undefined {
  return report?.tools.find((tool) => tool.id === toolId)
}

export function normalizeTool(tool: ToolCheck): ToolCheck {
  if (tool.id === 'copilot_cli' && tool.status === 'installed' && tool.details.trust_configured !== 'true') {
    return {
      ...tool,
      status: 'misconfigured',
    }
  }

  return tool
}

export function isToolConfigured(tool: ToolCheck | undefined): boolean {
  if (!tool) return false
  const normalized = normalizeTool(tool)
  if (normalized.status !== 'installed') return false
  if (normalized.auth_status === 'unauthenticated') return false
  return true
}

export function getPackageManagersTool(report: PrerequisitesReport | null): ToolCheck {
  const tools = PACKAGE_MANAGER_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)

  const installedCount = tools.filter((tool) => normalizeTool(tool).status === 'installed').length
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
    details: {
      summary: `${installedCount}/${PACKAGE_MANAGER_TOOL_IDS.length} ready`,
    },
  }
}

export function getRequiredSetupTools(report: PrerequisitesReport | null): ToolCheck[] {
  const gitTool = getToolById(report, 'git')
  return [gitTool, getPackageManagersTool(report)].filter((tool): tool is ToolCheck => !!tool)
}

export function getAiAssistantTools(report: PrerequisitesReport | null): ToolCheck[] {
  return AI_ASSISTANT_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)
    .map(normalizeTool)
}

export function getLanguageTools(report: PrerequisitesReport | null): ToolCheck[] {
  return LANGUAGE_TOOL_IDS
    .map((id) => getToolById(report, id))
    .filter((tool): tool is ToolCheck => !!tool)
    .map(normalizeTool)
}

export function getSupportingTools(report: PrerequisitesReport | null): ToolCheck[] {
  if (!report) return []
  const primaryIds = new Set(['git', ...PACKAGE_MANAGER_TOOL_IDS, ...AI_ASSISTANT_TOOL_IDS, ...LANGUAGE_TOOL_IDS])
  return report.tools
    .filter((tool) => !primaryIds.has(tool.id))
    .map(normalizeTool)
}

export function getSetupStatus(report: PrerequisitesReport | null) {
  const requiredReady = getRequiredSetupTools(report).every((tool) => isToolConfigured(tool))
  const aiReady = getAiAssistantTools(report).some((tool) => isToolConfigured(tool))
  const requiredLangTools = getLanguageTools(report).filter((t) => t.required)
  const languageReady = requiredLangTools.length === 0 || requiredLangTools.every((t) => isToolConfigured(t))

  return {
    requiredReady,
    aiReady,
    languageReady,
    ready: requiredReady && aiReady && languageReady,
  }
}

export function statusColor(tool: ToolCheck): string {
  const normalized = normalizeTool(tool)
  if (normalized.status === 'missing') return 'text-red-400'
  if (normalized.status === 'misconfigured' || normalized.auth_status === 'unauthenticated') return 'text-yellow-300'
  return 'text-green-400'
}

export function statusDotColor(tool: ToolCheck): string {
  const normalized = normalizeTool(tool)
  if (normalized.status === 'missing') return 'bg-red-500'
  if (normalized.status === 'misconfigured' || normalized.auth_status === 'unauthenticated') return 'bg-yellow-400'
  return 'bg-green-500'
}

export function statusLabel(tool: ToolCheck): string {
  const normalized = normalizeTool(tool)
  if (tool.name === 'Package Managers') {
    if (normalized.status === 'installed') return 'Ready'
    return tool.details.summary ? `Needs setup · ${tool.details.summary}` : 'Needs setup'
  }
  if (tool.id === 'copilot_cli' && normalized.status === 'misconfigured') return 'Needs trust setup'
  if (normalized.status === 'missing') return 'Not installed'
  if (normalized.status === 'misconfigured') return 'Needs configuration'
  if (normalized.auth_status === 'unauthenticated') return 'Not authenticated'
  if (normalized.auth_status === 'authenticated') return 'Ready'
  return normalized.version ? `v${normalized.version}` : 'Installed'
}

export function toolIntentDetail(tool: ToolCheck): string | null {
  const serverWideIds = new Set(['node', 'npm', 'pnpm', 'bun', 'claude_cli', 'codex_cli', 'copilot_cli', 'opencode_cli'])

  if (tool.name === 'Package Managers') {
    return 'Installs the shared Node.js, npm, pnpm, and Bun toolchain for workspace tasks.'
  }

  if (tool.path && serverWideIds.has(tool.id)) {
    if (tool.path.startsWith('/usr/') || tool.path.startsWith('/opt/')) {
      return `Server-wide path: ${tool.path}`
    }
    return `Detected path: ${tool.path}`
  }

  if (tool.id === 'node' || tool.id === 'npm') {
    return tool.status === 'missing'
      ? 'Required for the server toolchain.'
      : 'Backs the server-wide JavaScript toolchain.'
  }

  if (tool.id === 'pnpm' || tool.id === 'bun') {
    return tool.status === 'missing'
      ? 'Optional server-wide package tool.'
      : 'Available across the server for package workflows.'
  }

  if (tool.id === 'claude_cli' || tool.id === 'codex_cli' || tool.id === 'opencode_cli') {
    return tool.status === 'missing'
      ? 'Installs as a server-wide AI CLI.'
      : 'Available across the server for runtime checks and agent launches.'
  }

  if (tool.id === 'copilot_cli') {
    return tool.details.trust_configured === 'true'
      ? 'Available through GitHub Copilot CLI for workspace assistance.'
      : 'Install and trust GitHub Copilot CLI to use it from this server.'
  }

  if (tool.id === 'python') {
    return tool.status === 'installed'
      ? 'Python runtime with pip and venv is available for workspace tasks.'
      : 'Adds Python with pip and venv for language tooling.'
  }

  if (tool.id === 'rust') {
    return tool.status === 'installed'
      ? 'Rust toolchain with Cargo is available for workspace tasks.'
      : 'Adds Rust with rustc and Cargo for language tooling.'
  }

  if (tool.id === 'go') {
    return tool.status === 'installed'
      ? 'Go runtime is available for workspace tasks.'
      : 'Adds the Go toolchain for language support.'
  }

  if (tool.id === 'typescript') {
    return tool.status === 'installed'
      ? 'TypeScript compiler is available for workspace tasks.'
      : 'Adds the TypeScript compiler for language support.'
  }

  if (tool.id === 'tmux') {
    return tool.status === 'installed'
      ? 'Available for GitHub Copilot trust and terminal session orchestration.'
      : 'Needed by PocketDev when configuring GitHub Copilot trust.'
  }

  return null
}
