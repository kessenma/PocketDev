import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Menu } from 'lucide-react'
import githubIcon from '../../../../../packages/shared/assets/brands/github-white.png'
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

      <div className="flex flex-1 items-center gap-3">
        <a
          href="https://pocketdev.run"
          className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            fontFamily: docsFonts.display,
            color: docsTokens.colors.text,
          }}
          aria-label="PocketDev home"
        >
          <img src="/apple-touch-icon.png" alt="" width={28} height={28} className="rounded-lg" />
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

      <a
        href="https://pocketdev.run"
        className="hidden items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70 sm:flex"
        style={{
          color: docsTokens.colors.textSecondary,
          border: `1px solid ${docsTokens.colors.border}`,
        }}
      >
        pocketdev.run
        <ArrowUpRight size={13} />
      </a>

      <a
        href="https://github.com/kessenma/PocketDev"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
        style={{
          color: docsTokens.colors.textSecondary,
          border: `1px solid ${docsTokens.colors.border}`,
        }}
      >
        <img src={githubIcon} alt="" width={14} height={14} />
        GitHub
      </a>
    </header>
  )
}
