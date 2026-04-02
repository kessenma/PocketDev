import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { ConnectionWizard } from '#/components/ConnectionWizard'
import { DeviceList } from '#/components/DeviceList'
import { SetupStatus } from '#/components/SetupStatus'
import { checkHealth, fetchStatus, logout, type ConsoleStatus } from '#/lib/api'
import { Server, LogOut, Activity } from 'lucide-react'

export function ConsolePage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConsoleStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStatus = useCallback(async () => {
    try {
      const health = await checkHealth()
      if (!health.hasAdmin) {
        navigate('/setup', { replace: true })
        return
      }

      const data = await fetchStatus()
      setStatus(data)
    } catch {
      // Unauthorized — redirect to login
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handlePasscodeChanged(code: string) {
    if (status) {
      setStatus({ ...status, passcode: code })
    }
  }

  if (loading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
              <Server className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">PocketDev Console</h1>
              <p className="text-xs text-muted-foreground">{status.serverIp}:{status.port}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl space-y-6 p-4 pt-6">
        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Server Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={status.paired ? 'default' : 'secondary'}>
                {status.paired ? 'Paired' : 'Awaiting Pairing'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {status.devices.length} device{status.devices.length !== 1 ? 's' : ''} connected
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Server Setup Status */}
        <SetupStatus />

        {/* Connection Wizard */}
        <ConnectionWizard
          passcode={status.passcode}
          serverIp={status.serverIp}
          port={status.port}
          onPasscodeChanged={handlePasscodeChanged}
        />

        {/* Paired Devices */}
        <DeviceList devices={status.devices} />
      </main>
    </div>
  )
}
