import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { cn } from '#/lib/utils'
import {
  fetchUsers,
  updateSignupSetting,
  updateUserRole,
  updateUserStatus,
  type ConsoleStatus,
  type ConsoleUser,
  type UserManagementResponse,
} from '#/lib/api'
import { Check, Shield, UserCog, UserRoundCheck, UserRoundX } from 'lucide-react'

type UserManagementPanelProps = Pick<ConsoleStatus, 'currentUser' | 'permissions' | 'signupEnabled'>

function roleBadgeClass(role: ConsoleUser['role']) {
  if (role === 'owner') return 'bg-[var(--bauhaus-yellow)] text-black'
  if (role === 'admin') return 'bg-[var(--bauhaus-red)] text-white'
  return 'bg-secondary text-secondary-foreground'
}

function statusBadgeClass(status: ConsoleUser['status']) {
  if (status === 'active') return 'bg-[#9df6cd] text-black'
  if (status === 'pending') return 'bg-[var(--bauhaus-yellow)] text-black'
  if (status === 'denied') return 'bg-destructive/25 text-foreground'
  return 'bg-secondary text-secondary-foreground'
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function canActOnUser(actor: ConsoleUser, target: ConsoleUser) {
  if (target.role === 'owner') return false
  if (actor.role === 'owner') return true
  return actor.role === 'admin' && target.role === 'member'
}

export function UserManagementPanel({ currentUser, permissions, signupEnabled }: UserManagementPanelProps) {
  const [data, setData] = useState<UserManagementResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetchUsers()
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resolved = data ?? {
    currentUser,
    permissions,
    signupEnabled,
    users: [],
  }

  const pendingUsers = useMemo(
    () => resolved.users.filter((user) => user.status === 'pending'),
    [resolved.users],
  )

  const allUsers = useMemo(
    () => [...resolved.users].sort((a, b) => {
      const roleOrder = { owner: 0, admin: 1, member: 2 }
      const statusOrder = { pending: 0, active: 1, revoked: 2, denied: 3 }
      const byStatus = statusOrder[a.status] - statusOrder[b.status]
      if (byStatus !== 0) return byStatus
      const byRole = roleOrder[a.role] - roleOrder[b.role]
      if (byRole !== 0) return byRole
      return a.email.localeCompare(b.email)
    }),
    [resolved.users],
  )

  async function runAction(key: string, action: () => Promise<UserManagementResponse>, successMessage: string) {
    setBusyKey(key)
    setError('')
    try {
      const response = await action()
      setData(response)
      toast.success(successMessage)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed'
      setError(message)
      toast.error(message)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <Card className="border-2 border-border shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-heading text-sm uppercase tracking-[0.2em]">
              <UserCog className="h-4 w-4" />
              User Management
            </CardTitle>
            <CardDescription>
              Approve access, revoke accounts, and keep the owner account protected.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={roleBadgeClass(resolved.currentUser.role)}>{resolved.currentUser.role}</Badge>
            <Badge className={statusBadgeClass(resolved.currentUser.status)}>{resolved.currentUser.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {resolved.permissions.canToggleSignup && (
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[0.9rem] border-2 border-border bg-muted px-4 py-3 text-left transition hover:bg-secondary"
            onClick={() => void runAction(
              'signup-toggle',
              () => updateSignupSetting(!resolved.signupEnabled),
              !resolved.signupEnabled ? 'Public sign-up enabled' : 'Public sign-up disabled',
            )}
            disabled={busyKey === 'signup-toggle'}
          >
            <div>
              <p className="font-heading text-[0.75rem] uppercase tracking-[0.18em] text-foreground">Public Sign-up</p>
              <p className="mt-1 text-sm text-foreground/70">
                When enabled, the sign-up form stays visible on the login page and new requests land in pending review.
              </p>
            </div>
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded border-2 border-border bg-background',
                resolved.signupEnabled && 'bg-[var(--bauhaus-yellow)] text-black',
              )}
            >
              {resolved.signupEnabled ? <Check className="h-4 w-4" /> : null}
            </span>
          </button>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/60 bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-[0.9rem] border-2 border-border bg-muted px-4 py-3">
          <p className="font-heading text-[0.72rem] uppercase tracking-[0.18em] text-foreground/70">Pending Requests</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{pendingUsers.length}</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : allUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-3">
            {allUsers.map((user) => {
              const manageable = canActOnUser(resolved.currentUser, user)
              const canEditRole = resolved.permissions.canManageRoles && user.role !== 'owner' && user.status === 'active'

              return (
                <div
                  key={user.id}
                  className="rounded-[0.9rem] border-2 border-border bg-muted px-4 py-4"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{user.email}</p>
                        <Badge className={roleBadgeClass(user.role)}>{user.role}</Badge>
                        <Badge className={statusBadgeClass(user.status)}>{user.status}</Badge>
                        {user.role === 'owner' && (
                          <Badge variant="outline" className="border-border text-foreground">
                            Protected
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-xs text-foreground/60">
                        <p>Created {formatDate(user.createdAt)}</p>
                        <p>Reviewed {formatDate(user.reviewedAt)}</p>
                        <p>Last login {formatDate(user.lastLoginAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[25rem] xl:justify-end">
                      {user.status === 'pending' && manageable && (
                        <>
                          <Button
                            size="sm"
                            className="bg-[var(--bauhaus-yellow)] text-black hover:bg-[var(--bauhaus-yellow)]/90"
                            disabled={busyKey === `approve-${user.id}`}
                            onClick={() => void runAction(
                              `approve-${user.id}`,
                              () => updateUserStatus(user.id, 'active'),
                              `${user.email} approved`,
                            )}
                          >
                            <UserRoundCheck className="mr-2 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            disabled={busyKey === `deny-${user.id}`}
                            onClick={() => void runAction(
                              `deny-${user.id}`,
                              () => updateUserStatus(user.id, 'denied'),
                              `${user.email} denied`,
                            )}
                          >
                            <UserRoundX className="mr-2 h-3.5 w-3.5" />
                            Deny
                          </Button>
                        </>
                      )}

                      {user.status !== 'pending' && user.role === 'owner' && (
                        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground/70">
                          <Shield className="h-3.5 w-3.5" />
                          The owner account cannot be removed or downgraded.
                        </div>
                      )}

                      {user.status !== 'pending' && user.role !== 'owner' && manageable && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          disabled={busyKey === `status-${user.id}`}
                          onClick={() => void runAction(
                            `status-${user.id}`,
                            () => updateUserStatus(user.id, user.status === 'active' ? 'revoked' : 'active'),
                            user.status === 'active' ? `${user.email} revoked` : `${user.email} reactivated`,
                          )}
                        >
                          {user.status === 'active' ? 'Revoke Access' : 'Restore Access'}
                        </Button>
                      )}

                      {canEditRole && (
                        <>
                          <Button
                            variant={user.role === 'member' ? 'default' : 'outline'}
                            size="sm"
                            className={cn(user.role !== 'member' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
                            disabled={user.role === 'member' || busyKey === `role-member-${user.id}`}
                            onClick={() => void runAction(
                              `role-member-${user.id}`,
                              () => updateUserRole(user.id, 'member'),
                              `${user.email} is now a member`,
                            )}
                          >
                            Member
                          </Button>
                          <Button
                            variant={user.role === 'admin' ? 'default' : 'outline'}
                            size="sm"
                            className={cn(user.role !== 'admin' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
                            disabled={user.role === 'admin' || busyKey === `role-admin-${user.id}`}
                            onClick={() => void runAction(
                              `role-admin-${user.id}`,
                              () => updateUserRole(user.id, 'admin'),
                              `${user.email} can now manage users`,
                            )}
                          >
                            Admin
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
