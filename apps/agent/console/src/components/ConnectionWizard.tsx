import { useState, type FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { CopyButton } from '@pocketdev/shared/components'
import { QRCodeDisplay } from './QRCodeDisplay'
import { setPasscode, refreshPasscode } from '#/lib/api'
import { QrCode, RefreshCw, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  passcode: string | null
  serverIp: string
  port: number
  secure?: boolean
  onPasscodeChanged: (code: string) => void
}

export function ConnectionWizard({ passcode, serverIp, port, secure = false, onPasscodeChanged }: Props) {
  const [customCode, setCustomCode] = useState('')
  const [loading, setLoading] = useState(false)

  const qrPayload = passcode
    ? JSON.stringify({ host: serverIp, port, code: passcode, secure })
    : null

  const scheme = secure ? 'pocketdevs' : 'pocketdev'
  const connectionUrl = passcode
    ? `${scheme}://${serverIp}:${port}/${passcode}`
    : null

  async function handleSetPasscode(e: FormEvent) {
    e.preventDefault()
    if (!customCode.trim()) return
    setLoading(true)
    try {
      await setPasscode(customCode.trim())
      onPasscodeChanged(customCode.trim())
      setCustomCode('')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setLoading(true)
    try {
      const data = await refreshPasscode()
      onPasscodeChanged(data.code)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full rounded-[2rem]">
      <CardHeader>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-foreground/45">Pairing Studio</p>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Connect Mobile App
        </CardTitle>
        <CardDescription>
          Scan the QR code with the PocketDev mobile app, or enter the connection details manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Set custom passcode */}
        <form onSubmit={handleSetPasscode} className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="passcode">Custom Passcode</Label>
            <Input
              id="passcode"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="Enter your own passcode"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" disabled={loading || !customCode.trim()}>
              Set
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {passcode ? (
          <>
            <Separator />

            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="h-4 w-4" />
                Scan with PocketDev app
              </div>
              <QRCodeDisplay data={qrPayload!} size={220} />
            </div>

            <Separator />

            {/* Manual connection info */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Manual Connection</p>
              <div className="flex items-center gap-2 rounded-[1.4rem] border border-border bg-black p-4 font-mono text-sm text-[#f4f0e8]">
                <p className="flex-1 break-all font-bold">{connectionUrl}</p>
                <CopyButton
                  value={connectionUrl!}
                  size="icon"
                  variant="ghost"
                  className="text-[#f4f0e8] hover:bg-white/10"
                  onCopied={showCopyToast}
                />
              </div>
              <div className="space-y-0.5 px-1 text-xs text-foreground/55">
                <p>Server: {serverIp}:{port}</p>
                <p>Passcode: {passcode}</p>
              </div>
              <CopyButton
                value={connectionUrl!}
                label="Copy connection URL"
                className="w-full"
                onCopied={showCopyToast}
              />
            </div>
          </>
        ) : (
          <div className="rounded-[1.4rem] border border-border bg-muted/50 p-6 text-center">
            <p className="text-sm text-foreground/60">
              Set a passcode above or click refresh to generate one automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function showCopyToast(value: string) {
  toast.success('Copied to clipboard', {
    description: value.length > 60 ? `${value.slice(0, 60)}...` : value,
  })
}
