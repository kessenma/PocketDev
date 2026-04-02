export function AgentEndpoints() {
  const groups = [
    {
      label: 'Core',
      endpoints: [
        { method: 'GET', path: '/health', desc: 'Health check + pairing status' },
        { method: 'POST', path: '/setup/pair', desc: 'One-time device pairing' },
        { method: 'WS', path: '/ws', desc: 'Task commands + live event stream' },
        { method: 'WS', path: '/ws/terminal', desc: 'Interactive PTY shell session' },
      ],
    },
    {
      label: 'Files',
      endpoints: [
        { method: 'GET', path: '/files/tree', desc: 'Directory listing (.gitignore-aware)' },
        { method: 'GET', path: '/files/read', desc: 'Read file content (1 MB cap)' },
        { method: 'PUT', path: '/files/write', desc: 'Write file content' },
        { method: 'GET', path: '/files/search', desc: 'Ripgrep search across project' },
      ],
    },
    {
      label: 'Preview',
      endpoints: [
        { method: 'ANY', path: '/preview/*', desc: 'Reverse proxy to local dev server' },
      ],
    },
  ]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Agent API Surface
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Everything runs on a single port. REST for files, WebSockets for
          real-time streaming, reverse proxy for dev server preview.
        </p>

        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.endpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="flex items-baseline gap-3 rounded-md border border-border bg-muted/30 px-4 py-2.5 font-mono text-sm"
                  >
                    <MethodBadge method={ep.method} />
                    <span className="text-foreground">{ep.path}</span>
                    <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
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
      : method === 'POST' || method === 'PUT'
        ? 'text-blue-400'
        : method === 'WS'
          ? 'text-violet-400'
          : 'text-muted-foreground'

  return <span className={`w-10 shrink-0 text-xs font-bold ${color}`}>{method}</span>
}
