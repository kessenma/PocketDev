import { architectureTextStyles } from '../shared/theme'

export function AgentEndpointsSection() {
  const groups = [
    {
      label: 'Console and setup',
      endpoints: [
        { method: 'GET', path: '/PocketDev/health', desc: 'Health check and first-boot status' },
        { method: 'REST', path: '/PocketDev/api/console/*', desc: 'Admin auth, passcode, pairing status, diagnostics, and repo inspection' },
        { method: 'REST', path: '/PocketDev/api/pair', desc: 'Mobile device pairing handshake' },
        { method: 'APP', path: '/PocketDev/*', desc: 'Static catch-all that serves the console SPA' },
      ],
    },
    {
      label: 'Realtime transport',
      endpoints: [
        { method: 'WS', path: '/PocketDev/ws', desc: 'Task commands, plan events, file approvals, and server state streaming' },
        { method: 'WS', path: '/PocketDev/ws/terminal', desc: 'Interactive PTY terminal session for mobile and console' },
      ],
    },
    {
      label: 'Device REST surface',
      endpoints: [
        { method: 'REST', path: '/PocketDev/api/files/*', desc: 'Tree, read, search, and approval-oriented file workflows' },
        { method: 'REST', path: '/PocketDev/api/git/*', desc: 'Changes, commits, branch actions, and push flows' },
        { method: 'REST', path: '/PocketDev/api/projects/*', desc: 'Repository selection, cloning, and active project management' },
        { method: 'REST', path: '/PocketDev/api/containers/*', desc: 'Container listing, lifecycle actions, and log access' },
      ],
    },
    {
      label: 'Preview and local tooling',
      endpoints: [
        { method: 'ANY', path: '/PocketDev/preview/*', desc: 'Reverse proxy to the active dev server running on the host' },
      ],
    },
  ]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          <span style={architectureTextStyles.sectionEyebrow}>
            Agent API Surface
          </span>
        </h2>
        <p className="mb-10 text-lg text-muted-foreground" style={architectureTextStyles.sectionLead}>
          The agent still owns a single-port interface, but it now exposes a
          much broader product surface: console auth, mobile APIs, realtime task
          streams, project management, and preview proxying under one namespace.
        </p>

        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h3
                className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                style={architectureTextStyles.sectionEyebrow}
              >
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.endpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="flex items-baseline gap-3 rounded-md border px-4 py-2.5 font-mono text-sm"
                    style={architectureTextStyles.surface}
                  >
                    <MethodBadge method={ep.method} />
                    <span className="text-foreground" style={architectureTextStyles.strongText}>{ep.path}</span>
                    <span className="ml-auto hidden text-xs text-muted-foreground sm:inline" style={architectureTextStyles.bodyText}>
                      {ep.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MethodBadge({ method }: { method: string }) {
  const color =
    method === 'GET'
      ? 'text-emerald-400'
      : method === 'POST' || method === 'PUT' || method === 'REST'
        ? 'text-blue-400'
      : method === 'WS'
          ? 'text-violet-400'
        : method === 'APP'
          ? 'text-amber-400'
          : 'text-muted-foreground'

  return <span className={`w-10 shrink-0 text-xs font-bold ${color}`}>{method}</span>
}
