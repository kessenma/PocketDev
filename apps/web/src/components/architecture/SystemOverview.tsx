import { Badge } from '#/components/ui/badge'
import { architectureTextStyles } from './theme'

export function SystemOverview() {
  const layers = [
    {
      badge: 'PocketDev Agent',
      title: 'Server runtime',
      description:
        'A Bun + Elysia process on your Linux box that owns pairing, task orchestration, terminal sessions, file access, preview proxying, and local SQLite state.',
    },
    {
      badge: 'Console SPA',
      title: 'Browser-based control plane',
      description:
        'A React dashboard served by the agent for admin setup, pairing, diagnostics, repo inspection, and terminal access.',
    },
    {
      badge: 'iOS / Android',
      title: 'Mobile workspace',
      description:
        'React Native app for tasks, plans, files, git, projects, containers, server actions, and setup workflows on phones and tablets.',
    },
  ]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          <span style={architectureTextStyles.sectionEyebrow}>
            System Overview
          </span>
        </h2>
        <p className="mb-10 text-lg text-muted-foreground" style={architectureTextStyles.sectionLead}>
          PocketDev is no longer just a phone talking to a daemon. The current
          system has two user-facing clients, one self-hosted runtime, and one
          shared package that keeps protocol and design tokens aligned.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {layers.map((layer) => (
            <div
              key={layer.title}
              className="rounded-lg border p-5"
              style={architectureTextStyles.surface}
            >
              <Badge
                variant="outline"
                className="mb-3 px-3 py-1.5 text-xs font-mono"
              >
                {layer.badge}
              </Badge>
              <h3 className="text-base font-medium" style={architectureTextStyles.cardTitle}>{layer.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground" style={architectureTextStyles.bodyText}>
                {layer.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border p-4" style={architectureTextStyles.surface}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground" style={architectureTextStyles.mono}>
            <span>Shared foundation:</span>
            <Badge variant="outline" className="px-2 py-1 text-[11px]">
              @pocketdev/shared
            </Badge>
            <span>wire protocol</span>
            <span className="opacity-50">/</span>
            <span>theme tokens</span>
            <span className="opacity-50">/</span>
            <span>Zod schemas</span>
            <span className="opacity-50">/</span>
            <span>Ed25519 crypto</span>
          </div>
        </div>
      </div>
    </section>
  )
}
