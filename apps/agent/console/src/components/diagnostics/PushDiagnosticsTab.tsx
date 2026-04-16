import { type PushDebugInfo } from '#/lib/api'
import { Badge } from '#/components/ui/badge'
import { Bell, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  data?: PushDebugInfo | null
}

function typeColor(type: string): string {
  switch (type) {
    case 'permission': return 'border-yellow-500/50 text-yellow-400'
    case 'task_completed': return 'border-green-500/50 text-green-400'
    case 'task_failed': return 'border-red-500/50 text-red-400'
    default: return 'border-border/50 text-foreground/75'
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'permission': return 'Permission'
    case 'task_completed': return 'Completed'
    case 'task_failed': return 'Failed'
    default: return type
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function PushDiagnosticsTab({ data }: Props) {
  if (!data) {
    return (
      <div className="p-6 text-sm text-foreground/50">No push data available.</div>
    )
  }

  const { relayToken, registeredDevices, log } = data

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Status summary */}
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground/40">Relay Token</span>
          <span className="font-mono text-sm text-foreground">
            {relayToken ?? <span className="text-foreground/40">Not provisioned</span>}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground/40">Registered Devices</span>
          <span className="font-mono text-sm text-foreground">{registeredDevices}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-foreground/40">Log Entries</span>
          <span className="font-mono text-sm text-foreground">{log.length}</span>
        </div>
        {log.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-foreground/40">Success Rate</span>
            <span className="font-mono text-sm text-foreground">
              {Math.round((log.filter((e) => e.success).length / log.length) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Log table */}
      {log.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-foreground/40">
          <Bell className="w-8 h-8 opacity-40" />
          <span className="text-sm">No push notifications sent yet.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-widest text-foreground/40">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">HTTP</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr key={entry.id} className="border-b border-border/25 hover:bg-foreground/5 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-foreground/60 whitespace-nowrap">
                    {formatTime(entry.sentAt)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={typeColor(entry.type)}>
                      {typeLabel(entry.type)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-foreground/80 max-w-[200px] truncate" title={entry.title}>
                    {entry.title}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground/50 max-w-[120px] truncate" title={entry.deviceId ?? ''}>
                    {entry.deviceId ? `${entry.deviceId.slice(0, 12)}…` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {entry.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground/50">
                    {entry.relayStatusCode ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
