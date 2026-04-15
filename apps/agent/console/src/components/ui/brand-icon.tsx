import type { CSSProperties } from 'react'

export const BRAND_SRCS = {
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

export type BrandKey = keyof typeof BRAND_SRCS

export function BrandIcon({
  brand,
  size = 16,
  scale = 1.16,
}: {
  brand: BrandKey
  size?: number
  scale?: number
}) {
  return (
    <img
      src={BRAND_SRCS[brand]}
      alt={brand}
      width={size}
      height={size}
      style={{ objectFit: 'contain', transform: `scale(${scale})`, transformOrigin: 'center' } as CSSProperties}
      className="dark:invert"
    />
  )
}
