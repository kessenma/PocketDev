import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { login, checkHealth, signup } from '#/lib/api'
import { PasskeyButton } from '#/components/PasskeyButton'
import { browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { Server, LogIn, UserPlus } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasPasskeys, setHasPasskeys] = useState(false)
  const [signupEnabled, setSignupEnabled] = useState(true)

  useEffect(() => {
    checkHealth()
      .then((health) => {
        if (!health.hasAdmin) {
          navigate('/setup', { replace: true })
          return
        }

        setHasPasskeys(health.hasPasskeys)
        setSignupEnabled(health.signupEnabled)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/console/tasks', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setSignupError('')
    setSignupSuccess('')

    if (signupPassword.length < 8) {
      setSignupError('Password must be at least 8 characters')
      return
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match')
      return
    }

    setSignupLoading(true)
    try {
      await signup(signupEmail, signupPassword)
      setSignupEmail('')
      setSignupPassword('')
      setSignupConfirmPassword('')
      setSignupSuccess('Signup submitted. An owner or admin must approve it before you can sign in.')
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setSignupLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">PocketDev</h1>
          <p className="text-muted-foreground">Sign in to your console or request access for a new account.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Use an approved account to access the console.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : (
                    <>
                      Sign In
                      <LogIn className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {hasPasskeys && browserSupportsWebAuthn() && (
                <>
                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>
                  <PasskeyButton onSuccess={() => navigate('/console/tasks', { replace: true })} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Access</CardTitle>
              <CardDescription>
                {signupEnabled
                  ? 'New accounts stay pending until an owner or admin approves them.'
                  : 'The owner has closed public sign-ups for now.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {signupEnabled ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="new-user@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  {signupError && <p className="text-sm text-destructive">{signupError}</p>}
                  {signupSuccess && <p className="text-sm text-emerald-600">{signupSuccess}</p>}

                  <Button type="submit" className="w-full" disabled={signupLoading}>
                    {signupLoading ? 'Submitting...' : (
                      <>
                        Request Access
                        <UserPlus className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Public sign-up is disabled. Ask an existing owner or admin to create or approve your access.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
