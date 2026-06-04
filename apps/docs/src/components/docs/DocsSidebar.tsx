import { Link, useRouter } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { docsTextStyles, docsTokens } from './theme'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    navLabel?: string
    navOrder?: number
  }
}

function useNavItems() {
  const router = useRouter()
  return Object.entries(router.routesByPath)
    .filter(([, route]) => route.options.staticData?.navLabel != null)
    .sort(([, a], [, b]) => (a.options.staticData!.navOrder ?? 0) - (b.options.staticData!.navOrder ?? 0))
    .map(([path, route]) => ({ href: path, label: route.options.staticData!.navLabel! }))
}

export function DocsSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navItems = useNavItems()

  const nav = (
    <nav className="py-8 px-4">
      <p style={docsTextStyles.sectionLabel} className="mb-3 px-3">
        Documentation
      </p>
      <ul className="space-y-0.5">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              onClick={onClose}
              activeOptions={{ exact: true }}
              className="block rounded-md px-3 py-1.5 text-sm transition-colors"
              style={{ color: docsTokens.colors.textTertiary }}
              activeProps={{
                style: {
                  color: docsTokens.colors.text,
                  backgroundColor: docsTokens.colors.surface,
                  fontWeight: 500,
                },
              }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block w-60 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
        style={{ borderRight: `1px solid ${docsTokens.colors.border}` }}
      >
        {nav}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <aside
            className="absolute left-0 top-0 h-full w-72 overflow-y-auto"
            style={{ backgroundColor: docsTokens.colors.background }}
          >
            <div className="flex items-center justify-end p-4">
              <button
                onClick={onClose}
                className="rounded-md p-2 transition-colors"
                style={{ color: docsTokens.colors.text }}
              >
                <X size={18} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  )
}
