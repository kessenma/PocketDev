import { useState } from 'react'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { startAuthentication } from '@simplewebauthn/browser'
import { z } from 'zod'
import {
  checkAdminSession,
  getLoginMode,
  loginWithPassword,
  getPasskeyAuthOptions,
  verifyPasskeyAuth,
  verifyTotpForLogin,
  verifyEmergencyAccess,
} from '#/lib/adminAuth'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

export const Route = createFileRoute('/admin/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  loader: async () => {
    const [authed, loginMode] = await Promise.all([
      checkAdminSession(),
      getLoginMode().catch(() => ({ requireSecureLogin: false, passkeyCount: 0 })),
    ])
    if (authed) throw redirect({ to: '/admin/beta' })
    return loginMode
  },
  component: LoginPage,
})

type Step = 'main' | 'totp' | 'emergency'

function LoginPage() {
  const { requireSecureLogin, passkeyCount } = Route.useLoaderData()
  const { redirect: redirectTo } = Route.useSearch()
  const router = useRouter()
  const [step, setStep] = useState<Step>('main')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [emergencyCode, setEmergencyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const dest = (redirectTo ?? '/admin/beta') as '/admin/beta'

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await loginWithPassword({ data: { password } })
      if (result.success) {
        router.navigate({ to: dest })
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
        if (result.requiresTotp) {
          setStep('totp')
        } else {
          router.navigate({ to: dest })
        }
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

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await verifyTotpForLogin({ data: { code: totpCode } })
      if (result.success) {
        router.navigate({ to: dest })
      } else {
        setError(result.error ?? 'Invalid code')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmergencyAccess(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await verifyEmergencyAccess({ data: { code: emergencyCode } })
      if (result.success) {
        router.navigate({ to: dest })
      } else {
        setError(result.error ?? 'Invalid emergency code')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">
            {step === 'totp' ? 'Enter authenticator code' : step === 'emergency' ? 'Emergency access' : 'Admin login'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {step === 'main' && (
            <>
              {!requireSecureLogin && (
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
              )}

              {passkeyCount > 0 && (
                <>
                  {!requireSecureLogin && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t border-border" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant={requireSecureLogin ? 'default' : 'outline'}
                    className="w-full"
                    disabled={loading}
                    onClick={handlePasskeyLogin}
                  >
                    {loading ? 'Verifying…' : 'Sign in with passkey'}
                  </Button>
                </>
              )}
            </>
          )}

          {step === 'totp' && (
            <form onSubmit={handleTotpVerify} className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
              <Input
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                disabled={loading}
                className="text-center text-lg tracking-widest font-mono"
              />
              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading ? 'Verifying…' : 'Verify'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('main'); setError(null) }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
              >
                ← Back
              </button>
            </form>
          )}

          {step === 'emergency' && (
            <form onSubmit={handleEmergencyAccess} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the <code className="text-xs font-mono">ADMIN_EMERGENCY_CODE</code> value set in your server environment.
              </p>
              <Input
                type="password"
                placeholder="Emergency code"
                value={emergencyCode}
                onChange={(e) => setEmergencyCode(e.target.value)}
                autoFocus
                disabled={loading}
              />
              <Button type="submit" className="w-full" disabled={loading || !emergencyCode}>
                {loading ? 'Verifying…' : 'Access admin'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('main'); setError(null) }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
              >
                ← Back
              </button>
            </form>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {step === 'main' && (
            <button
              type="button"
              onClick={() => { setStep('emergency'); setError(null) }}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center pt-2"
            >
              Emergency access
            </button>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
