import { architectureTextStyles } from './theme'

export function WireProtocol() {
  const commands = [
    'task.start',
    'task.kill',
    'task.input',
    'container.logs.follow',
    'terminal.input',
    'setup.check_prerequisites',
    'plan.answer',
    'plan.accept',
  ]

  const events = [
    'task.output',
    'task.status_changed',
    'task.completed',
    'terminal.output',
    'setup.prerequisites_result',
    'plan.proposed',
    'plan.step_updated',
    'plan.resolved',
  ]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          <span style={architectureTextStyles.sectionEyebrow}>
            Wire Protocol
          </span>
        </h2>
        <p className="mb-10 text-lg text-muted-foreground" style={architectureTextStyles.sectionLead}>
          The protocol now covers more than task streaming. Plans, setup
          diagnostics, terminal sessions, container logs, and connection health
          all ride through the same typed message envelope from
          `@pocketdev/shared`.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" style={architectureTextStyles.sectionEyebrow}>
              Commands (client &rarr; agent)
            </h3>
            <div className="space-y-1.5">
              {commands.map((cmd) => (
                <div
                  key={cmd}
                  className="rounded-md border px-3 py-1.5 font-mono text-xs text-foreground"
                  style={architectureTextStyles.surface}
                >
                  {cmd}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" style={architectureTextStyles.sectionEyebrow}>
              Events (agent &rarr; client)
            </h3>
            <div className="space-y-1.5">
              {events.map((evt) => (
                <div
                  key={evt}
                  className="rounded-md border px-3 py-1.5 font-mono text-xs text-foreground"
                  style={architectureTextStyles.surface}
                >
                  {evt}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border p-4 font-mono text-xs leading-relaxed text-muted-foreground" style={{ ...architectureTextStyles.surface, ...architectureTextStyles.mono }}>
          <span className="text-foreground">{'{'}</span>{' '}
          type: <span className="text-blue-400">"plan.step_updated"</span>,
          id: <span className="text-emerald-400">"msg_01"</span>,
          payload: {'{ '}step_id: <span className="text-blue-400">"step_repo"</span>,
          status: <span className="text-blue-400">"completed"</span>{' }'},{' '}
          timestamp: <span className="text-emerald-400">1712000000</span>{' '}
          <span className="text-foreground">{'}'}</span>
        </div>
      </div>
    </section>
  )
}
