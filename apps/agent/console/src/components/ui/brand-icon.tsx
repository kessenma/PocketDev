import type { CSSProperties } from 'react'
import { useTheme } from '#/context/ThemeContext'

const BRAND_BLACK = {
  claude:     new URL('../../../../../../packages/shared/assets/brands/claude-black.png', import.meta.url).href,
  codex:      new URL('../../../../../../packages/shared/assets/brands/codex-black.png', import.meta.url).href,
  copilot:    new URL('../../../../../../packages/shared/assets/brands/github-copilot-black.png', import.meta.url).href,
  minimax:    new URL('../../../../../../packages/shared/assets/brands/minimax-black.png', import.meta.url).href,
  github:     new URL('../../../../../../packages/shared/assets/brands/github-black.png', import.meta.url).href,
  git:        new URL('../../../../../../packages/shared/assets/brands/git-black.png', import.meta.url).href,
  python:     new URL('../../../../../../packages/shared/assets/brands/python-black.png', import.meta.url).href,
  rust:       new URL('../../../../../../packages/shared/assets/brands/rust-black.png', import.meta.url).href,
  go:         new URL('../../../../../../packages/shared/assets/brands/go-black.png', import.meta.url).href,
  typescript: new URL('../../../../../../packages/shared/assets/brands/typescript-black.png', import.meta.url).href,
  node:       new URL('../../../../../../packages/shared/assets/brands/node-black.png', import.meta.url).href,
  npm:        new URL('../../../../../../packages/shared/assets/brands/npm-black.png', import.meta.url).href,
  pnpm:       new URL('../../../../../../packages/shared/assets/brands/pnpm-black.png', import.meta.url).href,
  bun:        new URL('../../../../../../packages/shared/assets/brands/bun-black.png', import.meta.url).href,
  nvm:        new URL('../../../../../../packages/shared/assets/brands/nvm-black.png', import.meta.url).href,
  docker:     new URL('../../../../../../packages/shared/assets/brands/docker-black.png', import.meta.url).href,
  postgresql: new URL('../../../../../../packages/shared/assets/brands/postgresql-black.png', import.meta.url).href,
  mongodb:    new URL('../../../../../../packages/shared/assets/brands/mongodb-black.png', import.meta.url).href,
  opencode:   new URL('../../../../../../packages/shared/assets/brands/opencode-black.png', import.meta.url).href,
  chromium:   new URL('../../../../../../packages/shared/assets/brands/chromium-black.png', import.meta.url).href,
  java:       new URL('../../../../../../packages/shared/assets/brands/java-black.png', import.meta.url).href,
  cpp:        new URL('../../../../../../packages/shared/assets/brands/cpp-black.png', import.meta.url).href,
}

const BRAND_WHITE = {
  claude:     new URL('../../../../../../packages/shared/assets/brands/claude-white.png', import.meta.url).href,
  codex:      new URL('../../../../../../packages/shared/assets/brands/codex-white.png', import.meta.url).href,
  copilot:    new URL('../../../../../../packages/shared/assets/brands/github-copilot-white.png', import.meta.url).href,
  minimax:    new URL('../../../../../../packages/shared/assets/brands/minimax-white.png', import.meta.url).href,
  github:     new URL('../../../../../../packages/shared/assets/brands/github-white.png', import.meta.url).href,
  git:        new URL('../../../../../../packages/shared/assets/brands/git-white.png', import.meta.url).href,
  python:     new URL('../../../../../../packages/shared/assets/brands/python-white.png', import.meta.url).href,
  rust:       new URL('../../../../../../packages/shared/assets/brands/rust-white.png', import.meta.url).href,
  go:         new URL('../../../../../../packages/shared/assets/brands/go-white.png', import.meta.url).href,
  typescript: new URL('../../../../../../packages/shared/assets/brands/typescript-white.png', import.meta.url).href,
  node:       new URL('../../../../../../packages/shared/assets/brands/node-white.png', import.meta.url).href,
  npm:        new URL('../../../../../../packages/shared/assets/brands/npm-white.png', import.meta.url).href,
  pnpm:       new URL('../../../../../../packages/shared/assets/brands/pnpm-white.png', import.meta.url).href,
  bun:        new URL('../../../../../../packages/shared/assets/brands/bun-white.png', import.meta.url).href,
  nvm:        new URL('../../../../../../packages/shared/assets/brands/nvm-white.png', import.meta.url).href,
  docker:     new URL('../../../../../../packages/shared/assets/brands/docker-white.png', import.meta.url).href,
  postgresql: new URL('../../../../../../packages/shared/assets/brands/postgresql-white.png', import.meta.url).href,
  mongodb:    new URL('../../../../../../packages/shared/assets/brands/mongodb-white.png', import.meta.url).href,
  opencode:   new URL('../../../../../../packages/shared/assets/brands/opencode-white.png', import.meta.url).href,
  chromium:   new URL('../../../../../../packages/shared/assets/brands/chromium-white.png', import.meta.url).href,
  java:       new URL('../../../../../../packages/shared/assets/brands/java-white.png', import.meta.url).href,
  cpp:        new URL('../../../../../../packages/shared/assets/brands/cpp-white.png', import.meta.url).href,
}

// Keep BRAND_SRCS exported for any consumers that read it directly
export const BRAND_SRCS = BRAND_BLACK

export type BrandKey = keyof typeof BRAND_BLACK

export function BrandIcon({
  brand,
  size = 16,
  scale = 1.16,
  scheme = 'auto',
}: {
  brand: BrandKey
  size?: number
  scale?: number
  /** 'auto' follows the app theme; 'light' forces the black icon (for use on light/yellow bg); 'dark' forces the white icon */
  scheme?: 'auto' | 'light' | 'dark'
}) {
  const { theme } = useTheme()
  const isDark = scheme === 'dark' || (scheme === 'auto' && theme === 'dark')
  const src = isDark ? BRAND_WHITE[brand] : BRAND_BLACK[brand]

  return (
    <img
      src={src}
      alt={brand}
      width={size}
      height={size}
      style={{ objectFit: 'contain', transform: `scale(${scale})`, transformOrigin: 'center' } as CSSProperties}
    />
  )
}
