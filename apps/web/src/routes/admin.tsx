import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border px-6 py-3 flex items-center gap-3">
        <span className="text-sm font-mono text-muted-foreground">pocketdev admin</span>
      </div>
      <Outlet />
    </div>
  )
}
