import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from '@tanstack/react-router'
import { checkAdminSession, logoutFn } from '#/lib/adminAuth'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/admin/login') return
    let authed = false
    try {
      authed = await checkAdminSession()
    } catch {}
    if (!authed) {
      throw redirect({ to: '/admin/login', search: { redirect: location.href } })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const router = useRouter()
  const isLoginPage = useRouterState({
    select: (s) => s.location.pathname === '/admin/login',
  })

  if (isLoginPage) return <Outlet />

  async function handleLogout() {
    await logoutFn()
    router.navigate({ to: '/admin/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-muted-foreground">pocketdev admin</span>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/admin/beta"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              beta
            </Link>
            <Link
              to="/admin/push"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              push
            </Link>
            <Link
              to="/admin/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              settings
            </Link>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          logout
        </button>
      </div>
      <Outlet />
    </div>
  )
}
