import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { NAV_ITEMS } from './nav-items'
import { docsTextStyles, docsTokens } from './theme'

export function DocsSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const nav = (
    <nav className="py-8 px-4">
      <p style={docsTextStyles.sectionLabel} className="mb-3 px-3">
        Documentation
      </p>
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
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
                className="rounded-md p-2 transition-colors hover:bg-muted"
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
