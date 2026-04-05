import type { CSSProperties } from 'react'

export function BrandAssetIcon({
  src,
  alt,
  size = 14,
  scale = 1.22,
  invertOnDark = true,
}: {
  src: string
  alt: string
  size?: number
  scale?: number
  invertOnDark?: boolean
}) {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'contain',
    transform: `scale(${scale})`,
    transformOrigin: 'center',
  } satisfies CSSProperties

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={style}
      className={invertOnDark ? 'dark:invert' : undefined}
    />
  )
}
