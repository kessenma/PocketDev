import type { PkgInstallTool, PkgManagerStatus } from '@pocketdev/shared/types'

export interface InstallPlanItem {
  id: PkgInstallTool
  name: string
  description: string
}

export type ToolInstallStatus = 'queued' | 'installing' | 'done' | 'failed'

export interface ToolInstallState {
  id: PkgInstallTool
  status: ToolInstallStatus
}

export function buildInstallPlan(status: PkgManagerStatus): InstallPlanItem[] {
  const plan: InstallPlanItem[] = []

  if (!status.nvm.installed) {
    plan.push({
      id: 'nvm',
      name: 'nvm',
      description: 'Installs Node Version Manager to ~/.nvm',
    })
  }

  if (!status.npm.installed) {
    plan.push({
      id: 'npm',
      name: 'Node.js + npm',
      description: 'Installs the latest LTS Node.js through nvm, including npm',
    })
  }

  if (!status.pnpm.installed) {
    plan.push({
      id: 'pnpm',
      name: 'pnpm',
      description: 'Installs pnpm to ~/.local/share/pnpm',
    })
  }

  if (!status.bun.installed) {
    plan.push({
      id: 'bun',
      name: 'Bun',
      description: 'Installs Bun to ~/.bun/bin',
    })
  }

  return plan
}

export function getNextInstallIndex(tools: ToolInstallState[]): number | null {
  const nextIndex = tools.findIndex((tool) => tool.status !== 'done')
  return nextIndex === -1 ? null : nextIndex
}
