import { useState } from 'react'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { startAuthentication } from '@simplewebauthn/browser'
import { z } from 'zod'
import {
  checkAdminSession,
  getPasskeyCount,
  loginWithPassword,
  getPasskeyAuthOptions,
  verifyPasskeyAuth,
} from '#/lib/adminAuth'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

export const Route = createFileRoute('/admin/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  loader: async () => {
    const [authed, passkeyCount] = await Promise.all([
      checkAdminSession(),
      getPasskeyCount().catch(() => 0),
    ])
    if (authed) throw redirect({ to: '/admin/beta' })
    return { passkeyCount }
  },
  component: LoginPage,
})

function LoginPage() {
  const { passkeyCount } = Route.useLoaderData()
  const { redirect: redirectTo } = Route.useSearch()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await loginWithPassword({ data: { password } })
      if (result.success) {
        router.navigate({ to: (redirectTo ?? '/admin/beta') as '/admin/beta' })
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasskeyLogin() {
    setError(null)
    setLoading(true)
    try {
      const options = await getPasskeyAuthOptions()
      const response = await startAuthentication({ optionsJSON: options })
      const result = await verifyPasskeyAuth({ data: { response } })
      if (result.success) {
        router.navigate({ to: (redirectTo ?? '/admin/beta') as '/admin/beta' })
      } else {
        setError(result.error ?? 'Passkey authentication failed')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Passkey prompt was dismissed')
      } else {
        setError('Passkey authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Admin login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {passkeyCount > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={handlePasskeyLogin}
              >
                Use passkey
              </Button>
            </>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
