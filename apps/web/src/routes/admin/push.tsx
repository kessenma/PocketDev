import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@pocketdev/db'
import { pushRelayTokens, pushDeviceTokens, pushNotificationLog } from '@pocketdev/db/schema'
import { sql, count } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Button } from '#/components/ui/button'

const getPushStats = createServerFn().handler(async () => {
  const [
    relayResult,
    deviceResult,
    totalResult,
    successResult,
    logResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(pushRelayTokens),
    db.select({ count: count() }).from(pushDeviceTokens),
    db.select({ count: count() }).from(pushNotificationLog),
    db.select({
      total: count(),
      succeeded: sql<number>`count(*) filter (where ${pushNotificationLog.success} = true)`,
    })
      .from(pushNotificationLog)
      .where(sql`${pushNotificationLog.sentAt} > now() - interval '7 days'`),
    db
      .select({
        id: pushNotificationLog.id,
        relayTokenId: pushNotificationLog.relayTokenId,
        apnsToken: pushNotificationLog.apnsToken,
        type: pushNotificationLog.type,
        title: pushNotificationLog.title,
        success: pushNotificationLog.success,
        gorushResponse: pushNotificationLog.gorushResponse,
        sentAt: pushNotificationLog.sentAt,
      })
      .from(pushNotificationLog)
      .orderBy(sql`${pushNotificationLog.sentAt} desc`)
      .limit(100),
  ])

  const { total: total7d, succeeded: succeeded7d } = successResult[0] ?? { total: 0, succeeded: 0 }
  const successRate7d = total7d > 0 ? Math.round((Number(succeeded7d) / Number(total7d)) * 100) : null

  return {
    relayCount: relayResult[0]?.count ?? 0,
    deviceCount: deviceResult[0]?.count ?? 0,
    totalSent: totalResult[0]?.count ?? 0,
    successRate7d,
    log: logResult.map((row) => ({
      ...row,
      sentAt: row.sentAt?.toISOString() ?? '',
      gorushResponse: row.gorushResponse ?? null,
    })),
  }
})

export const Route = createFileRoute('/admin/push')({
  loader: () => getPushStats(),
  component: PushAdminPage,
})

type LogEntry = Awaited<ReturnType<typeof getPushStats>>['log'][number]
type TypeFilter = 'all' | 'permission' | 'task_completed' | 'task_failed'

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Permission', value: 'permission' },
  { label: 'Completed', value: 'task_completed' },
  { label: 'Failed', value: 'task_failed' },
]

function typeBadgeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (type === 'permission') return 'outline'
  if (type === 'task_completed') return 'default'
  if (type === 'task_failed') return 'destructive'
  return 'secondary'
}

function formatTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
}

function truncate(s: string | null | undefined, start: number, end: number) {
  if (!s) return '—'
  if (s.length <= start + end) return s
  return `${s.slice(0, start)}…${s.slice(-end)}`
}

function PushAdminPage() {
  const { relayCount, deviceCount, totalSent, successRate7d, log } = Route.useLoaderData()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filteredLog = typeFilter === 'all' ? log : log.filter((e) => e.type === typeFilter)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold">Push Notifications</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Relay Tokens" value={relayCount} />
        <StatCard title="Registered Devices" value={deviceCount} />
        <StatCard title="Total Sent" value={totalSent} />
        <StatCard
          title="7-day Success"
          value={successRate7d !== null ? `${successRate7d}%` : '—'}
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {TYPE_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={typeFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent sends {filteredLog.length < log.length ? `(${filteredLog.length} of ${log.length})` : `(${log.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLog.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No entries</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Relay</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLog.map((entry) => (
                  <LogRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(entry.sentAt)}</TableCell>
      <TableCell>
        <Badge variant={typeBadgeVariant(entry.type)} className="text-xs">
          {entry.type}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm">{entry.title}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{truncate(entry.relayTokenId, 8, 0)}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{truncate(entry.apnsToken, 0, 8)}</TableCell>
      <TableCell>
        <Badge variant={entry.success ? 'default' : 'destructive'} className="text-xs">
          {entry.success ? 'ok' : 'fail'}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">{entry.gorushResponse ?? '—'}</TableCell>
    </TableRow>
  )
}
