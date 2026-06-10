import { architectureTokens } from '#/components/architecture/shared/theme'

export function Footer() {
  return (
    <footer className="px-6 py-8" style={{ borderTop: `1px solid ${architectureTokens.colors.border}` }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between text-sm" style={{ color: architectureTokens.colors.textSecondary }}>
        <a
          href="https://github.com/kessenma/PocketDev"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: architectureTokens.colors.text }}
        >
          Open Source on GitHub
        </a>
        <span>
          Built by{' '}
          <a
            href="https://github.com/kessenmacher"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: architectureTokens.colors.text }}
          >
            Kyle Essenmacher
          </a>
        </span>
      </div>
    </footer>
  )
}
