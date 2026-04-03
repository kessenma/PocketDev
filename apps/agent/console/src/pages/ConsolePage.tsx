import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { ConnectionWizard } from '#/components/ConnectionWizard'
import { DeviceList } from '#/components/DeviceList'
import { SetupStatus } from '#/components/SetupStatus'
import { ServerTerminal } from '#/components/ServerTerminal'
import { AuthDebugPanel } from '#/components/AuthDebugPanel'
import { Modal } from '#/components/ui/modal'
import { checkHealth, fetchStatus, logout, type ConsoleStatus } from '#/lib/api'
import { Server, LogOut, Monitor, Maximize2 } from 'lucide-react'

export function ConsolePage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConsoleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(false)

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
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(240,196,25,0.2),transparent_28%),linear-gradient(180deg,#0d0d0d_0%,#0d0d0d_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="mb-4 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#111111_0%,#111111_66%,#d93a2f_66%,#d93a2f_100%)] text-[#f4f0e8] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[#f0c419] text-black shadow-[6px_6px_0_0_rgba(0,0,0,0.24)]">
                  <Server className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[#f4f0e8]/60">PocketDev Console</p>
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Server Control Board</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-[#f4f0e8] text-black">{status.serverIp}:{status.port}</Badge>
                    <Badge className={status.paired ? 'bg-[#f0c419] text-black' : 'bg-white/15 text-[#f4f0e8]'}>
                      {status.paired ? 'Paired' : 'Awaiting Pairing'}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-[#f4f0e8]">
                      {status.devices.length} device{status.devices.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/8 text-[#f4f0e8] hover:bg-white/14"
                  onClick={() => setTerminalOpen(true)}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Terminal
                </Button>
                <Button variant="outline" size="sm" className="border-white/20 bg-white/8 text-[#f4f0e8] hover:bg-white/14" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <SetupStatus />
            </div>

            <div className="lg:col-span-7">
              <ConnectionWizard
                passcode={status.passcode}
                serverIp={status.serverIp}
                port={status.port}
                onPasscodeChanged={handlePasscodeChanged}
              />
            </div>

            <div className="lg:col-span-5">
              <DeviceList
                devices={status.devices}
                onDeviceRemoved={(id) => {
                  if (status) {
                    setStatus({ ...status, devices: status.devices.filter((d) => d.id !== id) })
                  }
                }}
                onDeviceRenamed={(id, name) => {
                  if (status) {
                    setStatus({ ...status, devices: status.devices.map((d) => d.id === id ? { ...d, name } : d) })
                  }
                }}
              />
            </div>

            <div className="lg:col-span-7">
              <section className="h-full overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#111111_0%,#171717_100%)] text-[#f4f0e8] shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="space-y-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#f4f0e8]/45">Focus Tool</p>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-[#f0c419]" />
                      <h2 className="text-lg font-semibold">Server Terminal</h2>
                    </div>
                    <p className="text-sm text-[#f4f0e8]/58">Keep the dashboard compact, then open the terminal full-screen when you need full attention.</p>
                  </div>
                  <Button variant="outline" className="border-white/15 bg-white/8 text-[#f4f0e8] hover:bg-white/14" onClick={() => setTerminalOpen(true)}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Open Full Screen
                  </Button>
                </div>
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                  <ServerTerminal className="rounded-[1.5rem] border border-white/8 bg-black/30" heightClassName="h-[240px]" />
                </div>
              </section>
            </div>

            <div className="lg:col-span-5">
              <AuthDebugPanel />
            </div>
          </main>
        </div>
      </div>

      <Modal
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        title="Server Terminal"
        description="A full-screen terminal surface for server commands, logs, and focused debugging."
      >
        <ServerTerminal className="h-full rounded-[1.5rem] border border-black/10 bg-black text-[#f4f0e8] shadow-none" heightClassName="h-full" />
      </Modal>
    </>
  )
}
