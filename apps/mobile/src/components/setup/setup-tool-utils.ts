import type { PrerequisitesReport, ToolCheck } from '@pocketdev/shared/types'

export function getToolById(report: PrerequisitesReport | null, toolId: string): ToolCheck | undefined {
  return report?.tools.find((tool) => tool.id === toolId)
}

export function getCodexBlockedReason(report: PrerequisitesReport | null): string | null {
  const npmTool = getToolById(report, 'npm')
  if (npmTool?.status === 'installed') return null
  return 'Install package managers first to make npm available for Codex.'
}
