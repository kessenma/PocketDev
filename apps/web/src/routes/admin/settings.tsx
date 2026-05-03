import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { startRegistration } from '@simplewebauthn/browser'
import {
  listPasskeys,
  getPasskeyRegisterOptions,
  verifyPasskeyRegistration,
  deletePasskeyFn,
  getTotpStatus,
  getTotpSetupData,
  verifyAndSaveTotpSetup,
  removeTotpFn,
  getAdminConfig,
  setSecureLoginRequired,
} from '#/lib/adminAuth'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

export const Route = createFileRoute('/admin/settings')({
  loader: () => Promise.all([listPasskeys(), getTotpStatus(), getAdminConfig()]),
  component: SettingsPage,
})

type Passkey = Awaited<ReturnType<typeof listPasskeys>>[number]
type TotpStatus = Awaited<ReturnType<typeof getTotpStatus>>
type AdminConfig = Awaited<ReturnType<typeof getAdminConfig>>

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function SettingsPage() {
  const [passkeys, totpStatus, adminConfig] = Route.useLoaderData()
  const [passkeyList, setPasskeyList] = useState(passkeys)
  const [totp, setTotp] = useState<TotpStatus>(totpStatus)
  const [config, setConfig] = useState<AdminConfig>(adminConfig)

  return (
    <div className="p-6 space-y-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold">Settings</h1>
      <PasskeysCard passkeys={passkeyList} onUpdate={setPasskeyList} />
      <AuthenticatorCard totp={totp} onUpdate={setTotp} />
      <SecureLoginCard
        config={config}
        onUpdate={setConfig}
        hasPasskey={passkeyList.length > 0}
        hasTotp={totp.configured}
      />
    </div>
  )
}

// ── Passkeys ──────────────────────────────────────────────────────────────────

function PasskeysCard({ passkeys, onUpdate }: { passkeys: Passkey[]; onUpdate: (p: Passkey[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAddPasskey(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAdding(true)
    try {
      const options = await getPasskeyRegisterOptions()
      const response = await startRegistration({ optionsJSON: options })
      const result = await verifyPasskeyRegistration({
        data: { deviceName: deviceName.trim() || 'My passkey', response },
      })
      if (result.success) {
        setDeviceName('')
        onUpdate(await listPasskeys())
      } else {
        setError(result.error ?? 'Verification failed')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Passkey prompt was dismissed')
      } else {
        console.error('Passkey registration error:', err)
        setError(err instanceof Error ? err.message : 'Registration failed')
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deletePasskeyFn({ data: { id } })
      onUpdate(passkeys.filter((p) => p.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Passkeys ({passkeys.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {passkeys.map((pk) => (
              <PasskeyRow
                key={pk.id}
                passkey={pk}
                deleting={deletingId === pk.id}
                onDelete={() => handleDelete(pk.id)}
              />
            ))}
          </ul>
        )}

        <form onSubmit={handleAddPasskey} className="flex gap-2 pt-2">
          <Input
            placeholder="Device name (e.g. MacBook Pro)"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            disabled={adding}
            className="flex-1"
          />
          <Button type="submit" disabled={adding} variant="outline">
            {adding ? 'Adding…' : 'Add passkey'}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

function PasskeyRow({ passkey, deleting, onDelete }: { passkey: Passkey; deleting: boolean; onDelete: () => void }) {
  return (
    <li className="flex items-center justify-between py-3 gap-3">
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium truncate">{passkey.deviceName}</p>
        <p className="text-xs text-muted-foreground">
          Added {formatTime(passkey.createdAt)}
          {passkey.lastUsedAt && <> · Last used {formatTime(passkey.lastUsedAt)}</>}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={deleting}
        onClick={onDelete}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        {deleting ? 'Removing…' : 'Remove'}
      </Button>
    </li>
  )
}

// ── Authenticator App ─────────────────────────────────────────────────────────

type SetupStep = 'idle' | 'qr' | 'verify'
type SetupData = { qrCodeDataUrl: string; manualKey: string }

function AuthenticatorCard({ totp, onUpdate }: { totp: TotpStatus; onUpdate: (t: TotpStatus) => void }) {
  const [step, setStep] = useState<SetupStep>('idle')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleStartSetup() {
    setError(null)
    setLoading(true)
    try {
      const data = await getTotpSetupData()
      setSetupData(data)
      setStep('qr')
    } catch (err) {
      console.error(err)
      setError('Failed to generate setup data')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await verifyAndSaveTotpSetup({ data: { code } })
      if (result.success) {
        const fresh = await getTotpStatus()
        onUpdate(fresh)
        setStep('idle')
        setSetupData(null)
        setCode('')
      } else {
        setError(result.error ?? 'Invalid code')
      }
    } catch (err) {
      console.error(err)
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    setLoading(true)
    try {
      await removeTotpFn()
      onUpdate(await getTotpStatus())
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!setupData) return
    void navigator.clipboard.writeText(setupData.manualKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Authenticator App</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totp.configured ? (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">Active</Badge>
              </div>
              {totp.createdAt && (
                <p className="text-xs text-muted-foreground">Set up {formatTime(totp.createdAt)}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive"
            >
              {loading ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        ) : step === 'idle' ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No authenticator app configured.</p>
            <Button variant="outline" disabled={loading} onClick={handleStartSetup}>
              {loading ? 'Generating…' : 'Set up authenticator app'}
            </Button>
          </div>
        ) : step === 'qr' && setupData ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with Google Authenticator, Authy, or any TOTP app.
            </p>
            <img src={setupData.qrCodeDataUrl} alt="TOTP QR code" className="rounded border border-border" width={200} height={200} />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Or enter this key manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">{setupData.manualKey}</code>
                <Button size="sm" variant="outline" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</Button>
              </div>
            </div>
            <Button onClick={() => setStep('verify')} className="w-full">Next — Enter code to verify</Button>
          </div>
        ) : step === 'verify' ? (
          <form onSubmit={handleVerify} className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app to confirm setup.</p>
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={loading}
              className="text-center text-lg tracking-widest font-mono"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('qr')} disabled={loading} className="flex-1">Back</Button>
              <Button type="submit" disabled={loading || code.length !== 6} className="flex-1">
                {loading ? 'Verifying…' : 'Verify and save'}
              </Button>
            </div>
          </form>
        ) : null}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

// ── Secure Login ──────────────────────────────────────────────────────────────

function SecureLoginCard({
  config,
  onUpdate,
  hasPasskey,
  hasTotp,
}: {
  config: AdminConfig
  onUpdate: (c: AdminConfig) => void
  hasPasskey: boolean
  hasTotp: boolean
}) {
  const [loading, setLoading] = useState(false)
  const canEnable = hasPasskey && hasTotp
  const enabled = config.requireSecureLogin

  async function handleToggle() {
    setLoading(true)
    try {
      await setSecureLoginRequired({ data: { enabled: !enabled } })
      onUpdate({ requireSecureLogin: !enabled })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Login security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Require passkey + authenticator to login</p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? 'Password login is disabled. You must use a passkey and authenticator code.'
                : canEnable
                  ? 'Once enabled, the password form is hidden and both a passkey and authenticator code are required.'
                  : 'Set up a passkey and authenticator app above before enabling this.'}
            </p>
          </div>
          <Button
            size="sm"
            variant={enabled ? 'destructive' : 'outline'}
            disabled={loading || (!canEnable && !enabled)}
            onClick={handleToggle}
            className="shrink-0"
          >
            {loading ? '…' : enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {enabled && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Emergency access</p>
            <p>If you lose your passkey or authenticator, set <code className="font-mono">ADMIN_EMERGENCY_CODE</code> in your Coolify environment variables and use the "Emergency access" link on the login page.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
