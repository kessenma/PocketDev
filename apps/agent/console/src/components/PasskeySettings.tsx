import { useState, useEffect, useCallback } from 'react'
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  listPasskeys,
  removePasskey,
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  type PasskeyCredential,
} from '#/lib/api'
import { Fingerprint, Plus, Trash2 } from 'lucide-react'

function isIpAddress(hostname: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':') // IPv4 or IPv6
}

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [error, setError] = useState('')

  const webAuthnAvailable = browserSupportsWebAuthn()
  const accessedViaIp = isIpAddress(window.location.hostname)

  const load = useCallback(async () => {
    if (!webAuthnAvailable) {
      setLoading(false)
      return
    }
    try {
      const creds = await listPasskeys()
      setPasskeys(creds)
    } catch {
      // Not critical if this fails
    } finally {
      setLoading(false)
    }
  }, [webAuthnAvailable])

  useEffect(() => { load() }, [load])

  async function handleRegister() {
    setError('')
    setRegistering(true)

    try {
      const { options, challengeId } = await getPasskeyRegistrationOptions()
      const credential = await startRegistration({ optionsJSON: options })
      await verifyPasskeyRegistration(challengeId, credential, deviceName || undefined)
      setShowNameInput(false)
      setDeviceName('')
      await load()
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Passkey registration was cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed')
      }
    } finally {
      setRegistering(false)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removePasskey(id)
      setPasskeys((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove passkey')
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Card className="border-2 border-[var(--border)] bg-[#1a1713] text-[#f5eedf] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-heading text-sm uppercase tracking-[0.2em]">
          <Fingerprint className="h-4 w-4" />
          Passkeys
        </CardTitle>
        {!showNameInput && webAuthnAvailable && (
          <Button
            variant="outline"
            size="sm"
            className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
            onClick={() => setShowNameInput(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!webAuthnAvailable && (
          <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[#2a241d] px-3 py-3">
            <p className="text-sm text-muted-foreground">
              Passkeys require a domain name — browsers don't support WebAuthn on IP addresses.
            </p>
            {accessedViaIp && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-[#f0c419]">Quick fix:</p>
                <p>1. Add to <code className="rounded bg-[#12100d] px-1">/etc/hosts</code> on your computer:</p>
                <code className="block rounded bg-[#12100d] px-2 py-1">
                  {window.location.hostname} pocketdev.local
                </code>
                <p>2. Set on your server: <code className="rounded bg-[#12100d] px-1">POCKETDEV_HOSTNAME=pocketdev.local</code></p>
                <p>3. Access via <code className="rounded bg-[#12100d] px-1">http://pocketdev.local:{window.location.port || '4387'}/PocketDev/console</code></p>
              </div>
            )}
          </div>
        )}
        {showNameInput && webAuthnAvailable && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Device name (optional)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Register'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
              onClick={() => { setShowNameInput(false); setDeviceName('') }}
            >
              Cancel
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered. Add one for passwordless login.</p>
        ) : (
          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[#2a241d] px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{pk.deviceName || 'Unnamed passkey'}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDate(pk.createdAt)}
                    {pk.lastUsedAt && ` \u00B7 Last used ${formatDate(pk.lastUsedAt)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemove(pk.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
