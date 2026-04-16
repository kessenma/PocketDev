import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { ConsoleSidebar } from '#/components/layout/ConsoleSidebar'
import { ServerTerminal } from '#/components/ServerTerminal'
import { UpdateBanner } from '#/components/UpdateBanner'
import { Modal } from '#/components/ui/modal'
import { useConsoleData } from '#/context/ConsoleDataContext'
import { useTheme } from '#/context/ThemeContext'
import { SecuritySection } from '#/pages/sections/SecuritySection'
import { RepositoriesSection } from '#/pages/sections/RepositoriesSection'
import { TasksSection } from '#/pages/sections/TasksSection'
import { DebugSection } from '#/pages/sections/DebugSection'
import { Server, LogOut, Maximize2, Shield, ArrowUpCircle, Loader2, Menu, Sun, Moon } from 'lucide-react'

export function ConsoleLayout() {
  const { status, loading, agentVersion, updateInfo, upgrading, handleUpgrade, handleLogout } = useConsoleData()
  const { theme, toggle } = useTheme()
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const section = location.pathname.includes('/repositories')
    ? 'repositories'
    : location.pathname.includes('/tasks')
      ? 'tasks'
      : location.pathname.includes('/debug')
        ? 'debug'
        : 'security'

  const upgradeTooltip = status?.lastUpgradeAt
    ? `Last upgraded ${new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(status.lastUpgradeAt))}`
    : 'No completed upgrades recorded yet'
  const upgradeMetaLabel = status?.lastUpgradeAt
    ? `Updated ${new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(status.lastUpgradeAt))}`
    : 'No upgrades recorded yet'

  if (loading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground/60">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen flex-col text-foreground">
        {/* Header */}
        <header className="shrink-0 overflow-hidden border-b-2 border-border bg-[linear-gradient(135deg,var(--card)_0%,var(--card)_72%,var(--bauhaus-red)_72%,var(--bauhaus-red)_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-4 px-4 py-4 sm:px-6">
            {/* Mobile hamburger */}
            <button
              className="rounded-md p-2 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.55rem] border-2 border-black/75 bg-[var(--bauhaus-yellow)] text-black shadow-[6px_6px_0_0_rgba(0,0,0,0.28)]">
              <Server className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-heading text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-foreground/60">PocketDev Console</p>
              <h1 className="font-heading text-lg font-semibold uppercase leading-none tracking-[0.08em] sm:text-xl">Server Control Board</h1>
            </div>

            <div className="hidden shrink-0 flex-wrap items-center gap-2 text-sm sm:flex">
              <Badge variant="outline" className="border-border text-foreground">
                Build v{agentVersion}
              </Badge>
              <Badge className="bg-secondary text-secondary-foreground">{status.serverIp}:{status.port}</Badge>
              <Badge className={status.paired ? 'bg-[var(--bauhaus-yellow)] text-black' : 'bg-secondary text-secondary-foreground'}>
                {status.paired ? 'Paired' : 'Awaiting Pairing'}
              </Badge>
              <Badge className={status.currentUser.role === 'owner' ? 'bg-[var(--bauhaus-red)] text-white' : 'bg-secondary text-secondary-foreground'}>
                <Shield className="mr-1 h-3 w-3" />
                {status.currentUser.role}
              </Badge>
            </div>

            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground/70 hover:text-foreground"
                  onClick={toggle}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  onClick={() => setTerminalOpen(true)}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Terminal</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  title={upgradeTooltip}
                  aria-label={`${upgrading ? 'Upgrading' : 'Upgrade'}. ${upgradeTooltip}`}
                >
                  {upgrading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{upgrading ? 'Upgrading...' : 'Upgrade'}</span>
                </Button>
                <Button variant="outline" size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
              <p className="mt-1 text-right text-[0.62rem] font-medium uppercase tracking-[0.14em] text-foreground/55">
                {upgradeMetaLabel}
              </p>
            </div>
          </div>
        </header>

        <UpdateBanner version={agentVersion} update={updateInfo} />

        {/* Body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          <ConsoleSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="min-w-0 flex-1 overflow-y-auto">
            {/* Keep all sections mounted; show only the active one */}
            <div style={{ display: section === 'security' ? '' : 'none' }} className="px-4 py-6 sm:px-6">
              <SecuritySection />
            </div>
            <div style={{ display: section === 'repositories' ? '' : 'none' }} className="px-4 py-6 sm:px-6">
              <RepositoriesSection />
            </div>
            <div style={{ display: section === 'tasks' ? '' : 'none' }} className="px-4 py-6 sm:px-6">
              <TasksSection />
            </div>
            <div style={{ display: section === 'debug' ? '' : 'none' }} className="px-4 py-6 sm:px-6">
              <DebugSection onOpenTerminal={() => setTerminalOpen(true)} />
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
        <ServerTerminal className="h-full rounded-[0.9rem] border-2 border-border bg-black text-[#f5eedf] shadow-none" heightClassName="h-full" />
      </Modal>
    </>
  )
}
