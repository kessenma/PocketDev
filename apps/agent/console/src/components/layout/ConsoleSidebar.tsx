import { NavLink } from 'react-router-dom'
import { Shield, FolderGit2, Bug, X, Activity } from 'lucide-react'
import { useConsoleData } from '#/context/ConsoleDataContext'
import { Badge } from '#/components/ui/badge'

const NAV_ITEMS = [
  {
    to: '/console/security',
    label: 'Security',
    sublabel: 'Domain · Passkeys · Ports · Devices',
    icon: Shield,
  },
  {
    to: '/console/repositories',
    label: 'Repositories',
    sublabel: 'Files · Environment',
    icon: FolderGit2,
  },
  {
    to: '/console/tasks',
    label: 'Tasks',
    sublabel: 'History · Processes · Logs',
    icon: Activity,
  },
  {
    to: '/console/debug',
    label: 'Debug',
    sublabel: 'Diagnostics · Network · Auth',
    icon: Bug,
  },
]

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const { status } = useConsoleData()

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 px-3 py-6">
        <p className="mb-4 px-3 font-heading text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-foreground/40">
          Navigation
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      'flex items-start gap-3 rounded-[0.75rem] px-3 py-2.5 transition-colors',
                      isActive
                        ? 'bg-[var(--bauhaus-yellow)] text-black'
                        : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={['mt-0.5 h-4 w-4 shrink-0', isActive ? 'text-black' : 'text-foreground/50'].join(' ')} />
                      <div className="min-w-0">
                        <p className="font-heading text-sm font-semibold uppercase tracking-[0.08em]">{item.label}</p>
                        <p className={['mt-0.5 truncate text-[10px] font-normal tracking-wide', isActive ? 'text-black/60' : 'text-foreground/35'].join(' ')}>
                          {item.sublabel}
                        </p>
                      </div>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {status && (
        <div className="border-t-2 border-border px-3 py-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={status.paired ? 'bg-[var(--bauhaus-yellow)] text-black text-[10px]' : 'bg-secondary text-secondary-foreground text-[10px]'}>
              {status.paired ? 'Paired' : 'Unpaired'}
            </Badge>
            <Badge variant="outline" className="border-border text-foreground/60 text-[10px]">
              {status.devices.length} device{status.devices.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConsoleSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r-2 border-border bg-card">
        <SidebarNav />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r-2 border-border bg-card">
            <div className="flex items-center justify-end border-b-2 border-border p-4">
              <button
                onClick={onClose}
                className="rounded-md p-2 text-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarNav onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}
