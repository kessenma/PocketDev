import { useState, type FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { CopyButton } from './CopyButton'
import { QRCodeDisplay } from './QRCodeDisplay'
import { setPasscode, refreshPasscode } from '#/lib/api'
import { QrCode, RefreshCw, Smartphone } from 'lucide-react'

interface Props {
  passcode: string | null
  serverIp: string
  port: number
  onPasscodeChanged: (code: string) => void
}

export function ConnectionWizard({ passcode, serverIp, port, onPasscodeChanged }: Props) {
  const [customCode, setCustomCode] = useState('')
  const [loading, setLoading] = useState(false)

  const qrPayload = passcode
    ? JSON.stringify({ host: serverIp, port, code: passcode })
    : null

  const connectionUrl = passcode
    ? `pocketdev://${serverIp}:${port}/${passcode}`
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
    <Card className="h-full rounded-[2rem] border border-black/12 bg-[linear-gradient(180deg,#f4f0e8_0%,#f4f0e8_100%)] text-black shadow-[0_14px_40px_rgba(0,0,0,0.12)]">
      <CardHeader>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-black/45">Pairing Studio</p>
        <CardTitle className="flex items-center gap-2 text-black">
          <Smartphone className="h-5 w-5" />
          Connect Mobile App
        </CardTitle>
        <CardDescription className="text-black/60">
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
            <Button type="submit" variant="secondary" className="bg-black text-[#f4f0e8] hover:bg-black/85" disabled={loading || !customCode.trim()}>
              Set
            </Button>
            <Button type="button" variant="outline" size="icon" className="border-black/15 bg-white/60 hover:bg-white" onClick={handleRefresh} disabled={loading}>
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
              <div className="flex items-center gap-2 rounded-[1.4rem] border border-black/10 bg-black p-4 font-mono text-sm text-[#f4f0e8]">
                <p className="flex-1 break-all font-bold">{connectionUrl}</p>
                <CopyButton value={connectionUrl!} size="icon" variant="ghost" />
              </div>
              <div className="space-y-0.5 px-1 text-xs text-black/55">
                <p>Server: {serverIp}:{port}</p>
                <p>Passcode: {passcode}</p>
              </div>
              <CopyButton
                value={connectionUrl!}
                label="Copy connection URL"
                className="w-full"
              />
            </div>
          </>
        ) : (
          <div className="rounded-[1.4rem] border border-black/10 bg-white/70 p-6 text-center">
            <p className="text-sm text-black/60">
              Set a passcode above or click refresh to generate one automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
