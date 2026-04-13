import { RepoInspectorPanel } from '#/components/RepoInspectorPanel'
import { EnvVarsPanel } from '#/components/EnvVarsPanel'

export function RepositoriesSection() {
  return (
    <div className="space-y-6">
      <RepoInspectorPanel />
      <EnvVarsPanel />
    </div>
  )
}
