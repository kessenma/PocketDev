import { useEffect, useRef, useState } from 'react'
import { architectureTokens } from '#/components/architecture/shared/theme'

const DOCS_URL = 'https://docs.pocketdev.run'

export function NavBar() {
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
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
      className="fixed top-0 right-0 mr-12 hover:border-gray-300 z-50 flex items-center px-6 py-4 transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative text-sm font-medium transition-colors duration-200 hover:shadow-lg"
        style={{ color: architectureTokens.colors.textSecondary }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        Docs
        <span
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-all duration-200"
          style={{
            backgroundColor: architectureTokens.colors.panelAlt,
            color: architectureTokens.colors.textSecondary,
            border: `1px solid ${architectureTokens.colors.border}`,
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-4px)',
            pointerEvents: 'none',
          }}
        >
          {DOCS_URL}
        </span>
      </a>
    </nav>
  )
}
