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
      id: 'nvm' as const,
      name: 'nvm',
      installed: status.nvm.installed,
      description: 'Installs Node Version Manager to ~/.nvm',
    },
    {
      id: 'npm' as const,
      name: 'Node.js + npm',
      installed: status.npm.installed,
      description: 'Installs the latest LTS Node.js through nvm, including npm',
    },
    {
      id: 'pnpm' as const,
      name: 'pnpm',
      installed: status.pnpm.installed,
      description: 'Installs pnpm to ~/.local/share/pnpm',
    },
    {
      id: 'bun' as const,
      name: 'Bun',
      installed: status.bun.installed,
      description: 'Installs Bun to ~/.bun/bin',
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
