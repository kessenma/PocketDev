import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { ConnectionWizard } from '#/components/ConnectionWizard'
import { DeviceList } from '#/components/DeviceList'
import { PasskeySettings } from '#/components/PasskeySettings'
import { ServerTerminal } from '#/components/ServerTerminal'
import { DiagnosticsPanel } from '#/components/DiagnosticsPanel'
import { RepoInspectorPanel } from '#/components/RepoInspectorPanel'
import { EnvVarsPanel } from '#/components/EnvVarsPanel'
import { UserManagementPanel } from '#/components/UserManagementPanel'
import { UpdateBanner } from '#/components/UpdateBanner'
import { Modal } from '#/components/ui/modal'
import { checkHealth, fetchStatus, logout, triggerUpdate, type ConsoleStatus, type UpdateInfo } from '#/lib/api'
import { toast } from 'sonner'
import { Server, LogOut, Maximize2, Shield, ArrowUpCircle, Loader2 } from 'lucide-react'

export function ConsolePage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConsoleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [agentVersion, setAgentVersion] = useState<string>('unknown')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const upgradePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const health = await checkHealth()
      if (!health.hasAdmin) {
        navigate('/setup', { replace: true })
        return
      }

      setAgentVersion(health.version)
      setUpdateInfo(health.update)

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

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      await triggerUpdate()
      toast.info('Upgrade in progress — the agent will restart shortly...')
      let attempts = 0
      upgradePollRef.current = setInterval(async () => {
        attempts++
        try {
          const health = await checkHealth()
          if (health.version !== agentVersion || attempts > 5) {
            clearInterval(upgradePollRef.current!)
            upgradePollRef.current = null
            toast.success(`Updated to v${health.version}`)
            setTimeout(() => window.location.reload(), 1000)
          }
        } catch {
          // still restarting
        }
        if (attempts >= 20) {
          clearInterval(upgradePollRef.current!)
          upgradePollRef.current = null
          setUpgrading(false)
          toast.error('Upgrade timed out — try refreshing the page.')
        }
      }, 3000)
    } catch (err) {
      setUpgrading(false)
      toast.error(err instanceof Error ? err.message : 'Upgrade failed')
    }
  }

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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(240,196,25,0.16),transparent_24%),linear-gradient(180deg,#12100d_0%,#12100d_100%)] text-[#f5eedf]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="mb-4 overflow-hidden rounded-[1.1rem] border-2 border-[var(--border)] bg-[linear-gradient(135deg,#1a1713_0%,#1a1713_72%,#d93025_72%,#d93025_100%)] text-[#f5eedf] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[0.55rem] border-2 border-black/75 bg-[#f0c419] text-black shadow-[6px_6px_0_0_rgba(0,0,0,0.28)]">
                  <Server className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#f5eedf]/58">PocketDev Console</p>
                    <h1 className="font-heading text-[2rem] leading-none font-semibold uppercase tracking-[0.08em] sm:text-[2.5rem]">Server Control Board</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="border-[var(--border)] text-[#f5eedf]">
                      Build v{agentVersion}
                    </Badge>
                    <Badge className="bg-[#f4efdf] text-black">{status.serverIp}:{status.port}</Badge>
                    <Badge className={status.paired ? 'bg-[#f0c419] text-black' : 'bg-[#2a241d] text-[#f5eedf]'}>
                      {status.paired ? 'Paired' : 'Awaiting Pairing'}
                    </Badge>
                    <Badge className={status.currentUser.role === 'owner' ? 'bg-[#d93025] text-white' : 'bg-[#2a241d] text-[#f5eedf]'}>
                      <Shield className="mr-1 h-3 w-3" />
                      {status.currentUser.role}
                    </Badge>
                    <Badge variant="outline" className="border-[var(--border)] text-[#f5eedf]">
                      {status.devices.length} device{status.devices.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
                  onClick={() => setTerminalOpen(true)}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Terminal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                >
                  {upgrading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                  )}
                  {upgrading ? 'Upgrading...' : 'Upgrade'}
                </Button>
                <Button variant="outline" size="sm" className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <UpdateBanner version={agentVersion} update={updateInfo} />

          <main className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <PasskeySettings />
            </div>

            {status.permissions.canManageUsers && (
              <div className="lg:col-span-5">
                <UserManagementPanel
                  currentUser={status.currentUser}
                  permissions={status.permissions}
                  signupEnabled={status.signupEnabled}
                />
              </div>
            )}

            <div className="lg:col-span-7">
              <ConnectionWizard
                passcode={status.passcode}
                serverIp={status.serverIp}
                port={status.port}
                secure={status.secure}
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

            <div className="lg:col-span-12">
              <EnvVarsPanel />
            </div>

            <div className="lg:col-span-12">
              <RepoInspectorPanel />
            </div>

            <div className="lg:col-span-12">
              <DiagnosticsPanel onOpenTerminal={() => setTerminalOpen(true)} />
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
        <ServerTerminal className="h-full rounded-[0.9rem] border-2 border-[var(--border)] bg-black text-[#f5eedf] shadow-none" heightClassName="h-full" />
      </Modal>
    </>
  )
}
