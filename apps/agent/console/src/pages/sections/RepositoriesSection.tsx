import { ProjectSwitcherPanel } from '#/components/ProjectSwitcherPanel'
import { EnvVarsPanel } from '#/components/EnvVarsPanel'

export function RepositoriesSection() {
  return (
    <div className="space-y-6">
      <ProjectSwitcherPanel />
      <EnvVarsPanel />
    </div>
  )
}
