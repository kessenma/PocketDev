import type { PkgInstallTool, PkgManagerStatus } from '@pocketdev/shared/types'

export interface InstallPlanItem {
  id: PkgInstallTool
  name: string
  description: string
  installed: boolean
}

export type ToolInstallStatus = 'queued' | 'installing' | 'done' | 'failed'

export interface ToolInstallState {
  id: PkgInstallTool
  status: ToolInstallStatus
}

function getToolEntries(status: PkgManagerStatus) {
  return [
    {
      id: 'npm' as const,
      name: 'Node.js + npm',
      installed: status.npm.installed,
      description: 'Adds the latest LTS Node.js toolchain, including npm, for workspace tasks',
    },
    {
      id: 'pnpm' as const,
      name: 'pnpm',
      installed: status.pnpm.installed,
      description: 'Adds pnpm so it is available for workspace package flows',
    },
    {
      id: 'bun' as const,
      name: 'Bun',
      installed: status.bun.installed,
      description: 'Adds Bun so it is available for workspace package flows',
    },
  ]
}

export function buildInstallPlan(status: PkgManagerStatus): InstallPlanItem[] {
  return getToolEntries(status)
}

export function getDefaultSelectedTools(status: PkgManagerStatus): PkgInstallTool[] {
  return getToolEntries(status)
    .filter((tool) => !tool.installed)
    .map((tool) => tool.id)
}

export function buildSelectedInstallPlan(
  status: PkgManagerStatus,
  selectedTools: PkgInstallTool[],
): InstallPlanItem[] {
  return getToolEntries(status).filter((tool) => selectedTools.includes(tool.id))
}

export function getNextInstallIndex(tools: ToolInstallState[]): number | null {
  const nextIndex = tools.findIndex((tool) => tool.status !== 'done')
  return nextIndex === -1 ? null : nextIndex
}
