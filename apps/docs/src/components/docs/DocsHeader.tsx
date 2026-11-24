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
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-3 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{
            fontFamily: docsFonts.display,
            color: docsTokens.colors.text,
            border: `1px solid ${docsTokens.colors.border}`,
          }}
          title="Back to pocketdev.run"
        >
          <img src="/apple-touch-icon.png" alt="" width={24} height={24} className="rounded" />
          PocketDev
          <ArrowUpRight size={13} style={{ color: docsTokens.colors.textSecondary }} />
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
