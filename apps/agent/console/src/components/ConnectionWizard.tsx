import { useState, type FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { QRCodeDisplay } from './QRCodeDisplay'
import { setPasscode, refreshPasscode } from '#/lib/api'
import { QrCode, Copy, RefreshCw, Check, Smartphone } from 'lucide-react'

interface Props {
  passcode: string | null
  serverIp: string
  port: number
  onPasscodeChanged: (code: string) => void
}

export function ConnectionWizard({ passcode, serverIp, port, onPasscodeChanged }: Props) {
  const [customCode, setCustomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const qrPayload = passcode
    ? JSON.stringify({ host: serverIp, port, code: passcode })
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

  const connectionUrl = passcode
    ? `pocketdev://${serverIp}:${port}/${passcode}`
    : null

  function handleCopy() {
    if (!connectionUrl) return
    navigator.clipboard.writeText(connectionUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
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
              <div className="rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm space-y-2">
                <p className="break-all text-primary font-bold">{connectionUrl}</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Server: {serverIp}:{port}</p>
                  <p>Passcode: {passcode}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy connection details
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Set a passcode above or click refresh to generate one automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
