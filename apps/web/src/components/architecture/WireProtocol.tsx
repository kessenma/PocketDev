export function WireProtocol() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Wire Protocol
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Commands flow from mobile to server, events stream back. All messages
          share a typed envelope defined once in the shared package and consumed
          by every layer.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Commands */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Commands (mobile &rarr; server)
            </h3>
            <div className="space-y-1.5">
              {[
                'task.start',
                'task.kill',
                'files.approve',
                'terminal.input',
                'terminal.resize',
              ].map((cmd) => (
                <div
                  key={cmd}
                  className="rounded-md bg-muted/40 px-3 py-1.5 font-mono text-xs text-foreground"
                >
                  {cmd}
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Events (server &rarr; mobile)
            </h3>
            <div className="space-y-1.5">
              {[
                'task.output',
                'task.status_changed',
                'terminal.output',
                'terminal.exited',
                'files.changed',
              ].map((evt) => (
                <div
                  key={evt}
                  className="rounded-md bg-muted/40 px-3 py-1.5 font-mono text-xs text-foreground"
                >
                  {evt}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          <span className="text-foreground">{'{'}</span>{' '}
          type: <span className="text-blue-400">"task.output"</span>,
          id: <span className="text-emerald-400">"msg_01"</span>,
          payload: {'{ '}line: <span className="text-blue-400">"Installing deps..."</span>,
          stream: <span className="text-blue-400">"stdout"</span>{' }'},{' '}
          timestamp: <span className="text-emerald-400">1712000000</span>{' '}
          <span className="text-foreground">{'}'}</span>
        </div>
      </div>
    </section>
  )
}
