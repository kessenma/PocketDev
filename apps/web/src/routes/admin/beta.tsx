import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@pocketdev/db'
import { betaSignups } from '@pocketdev/db/schema'
import { desc, count } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const getBetaSignups = createServerFn().handler(async () => {
  const [countResult, rows] = await Promise.all([
    db.select({ count: count() }).from(betaSignups),
    db
      .select({
        id: betaSignups.id,
        email: betaSignups.email,
        createdAt: betaSignups.createdAt,
      })
      .from(betaSignups)
      .orderBy(desc(betaSignups.createdAt)),
  ])

  return {
    total: countResult[0]?.count ?? 0,
    signups: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  }
})

export const Route = createFileRoute('/admin/beta')({
  loader: () => getBetaSignups(),
  component: BetaAdminPage,
})

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
}

function BetaAdminPage() {
  const { total, signups } = Route.useLoaderData()

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold">Beta Interest Sign-ups</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Total Sign-ups" value={total} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Emails ({signups.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {signups.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No sign-ups yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signups.map((signup) => (
                  <TableRow key={signup.id}>
                    <TableCell className="font-medium">{signup.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(signup.createdAt)}
                    </TableCell>
                  </TableRow>
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
