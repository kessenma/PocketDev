import { useEffect, useRef, useState } from 'react'
import { architectureTokens } from '#/components/architecture/shared/theme'
import { brandAssets } from '#/components/architecture/shared/brand-assets'
import { APP_STORE_URL, DOCS_URL, GITHUB_URL } from '@pocketdev/shared/links'

export function NavBar() {
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState<'docs' | 'github' | 'appstore' | null>(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      setVisible(y < 50 || y < lastScrollY.current)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className="fixed top-0 right-0 mr-12 hover:border-gray-300 z-50 flex items-center gap-6 px-6 py-4 transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200"
        style={{
          color: architectureTokens.colors.text,
          borderColor: architectureTokens.colors.border,
          backgroundColor: architectureTokens.colors.paper,
        }}
        onMouseEnter={() => setHovered('appstore')}
        onMouseLeave={() => setHovered(null)}
      >
        <img src={brandAssets.appleBlack} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />
        Download on iOS
        <span
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-all duration-200"
          style={{
            backgroundColor: architectureTokens.colors.panelAlt,
            color: architectureTokens.colors.textSecondary,
            border: `1px solid ${architectureTokens.colors.border}`,
            opacity: hovered === 'appstore' ? 1 : 0,
            transform: hovered === 'appstore' ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-4px)',
            pointerEvents: 'none',
          }}
        >
          Available on the App Store
        </span>
      </a>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative text-sm font-medium transition-colors duration-200 hover:shadow-lg"
        style={{ color: architectureTokens.colors.textSecondary }}
        onMouseEnter={() => setHovered('github')}
        onMouseLeave={() => setHovered(null)}
      >
        GitHub
        <span
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-all duration-200"
          style={{
            backgroundColor: architectureTokens.colors.panelAlt,
            color: architectureTokens.colors.textSecondary,
            border: `1px solid ${architectureTokens.colors.border}`,
            opacity: hovered === 'github' ? 1 : 0,
            transform: hovered === 'github' ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-4px)',
            pointerEvents: 'none',
          }}
        >
          Source available on GitHub
        </span>
      </a>
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative text-sm font-medium transition-colors duration-200 hover:shadow-lg"
        style={{ color: architectureTokens.colors.textSecondary }}
        onMouseEnter={() => setHovered('docs')}
        onMouseLeave={() => setHovered(null)}
      >
        Docs
        <span
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-all duration-200"
          style={{
            backgroundColor: architectureTokens.colors.panelAlt,
            color: architectureTokens.colors.textSecondary,
            border: `1px solid ${architectureTokens.colors.border}`,
            opacity: hovered === 'docs' ? 1 : 0,
            transform: hovered === 'docs' ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-4px)',
            pointerEvents: 'none',
          }}
        >
          {DOCS_URL}
        </span>
      </a>
    </nav>
  )
}
