import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { docsFonts, docsTokens } from './theme'

export function DocsHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center gap-4 px-6"
      style={{
        backgroundColor: docsTokens.colors.background,
        borderBottom: `1px solid ${docsTokens.colors.border}`,
      }}
    >
      <button
        onClick={onMenuToggle}
        className="rounded-md p-2 transition-colors lg:hidden"
        style={{ color: docsTokens.colors.text }}
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-3">
        <a
          href="https://pocketdev.run"
          className="text-sm font-semibold transition-colors hover:opacity-80"
          style={{
            fontFamily: docsFonts.display,
            color: docsTokens.colors.text,
          }}
        >
          PocketDev
        </a>
        <span
          className="text-xs"
          style={{ color: docsTokens.colors.textTertiary }}
        >
          /
        </span>
        <Link
          to="/"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: docsTokens.colors.textSecondary }}
        >
          Docs
        </Link>
      </div>
    </header>
  )
}
