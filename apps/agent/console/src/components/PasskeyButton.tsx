import { useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Button } from '#/components/ui/button'
import { getPasskeyAuthenticationOptions, verifyPasskeyAuthentication } from '#/lib/api'
import { Fingerprint } from 'lucide-react'

interface Props {
  onSuccess: () => void
}

export function PasskeyButton({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePasskeyLogin() {
    setError('')
    setLoading(true)

    try {
      // 1. Get authentication options from server
      const { options, challengeId } = await getPasskeyAuthenticationOptions()

      // 2. Trigger platform authenticator (Touch ID, Windows Hello, etc.)
      const credential = await startAuthentication({ optionsJSON: options })

      // 3. Verify with server (sets session cookie)
      await verifyPasskeyAuthentication(challengeId, credential)

      onSuccess()
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Passkey authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handlePasskeyLogin}
        disabled={loading}
      >
        {loading ? 'Authenticating...' : (
          <>
            <Fingerprint className="mr-2 h-4 w-4" />
            Sign in with Passkey
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
