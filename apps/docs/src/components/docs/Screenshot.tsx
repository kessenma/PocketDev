import type { ReactNode } from 'react'

/**
 * A real screenshot for a setup step. Red boxes in the images mark what to
 * tap or click. `phone` renders a narrow, rounded frame; `desktop` is full width.
 */
export function Screenshot({
  src,
  alt,
  caption,
  width,
  height,
  variant = 'desktop',
}: {
  src: string
  alt: string
  caption?: ReactNode
  width: number
  height: number
  variant?: 'desktop' | 'phone' | 'dialog'
}) {
  const frame =
    variant === 'phone'
      ? 'mx-auto max-w-[240px] rounded-[26px]'
      : variant === 'dialog'
        ? 'mx-auto max-w-[260px] rounded-2xl'
        : 'w-full rounded-xl'
  return (
    <figure className="not-prose m-0 flex flex-col">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={`block h-auto border border-white/10 shadow-lg ${frame}`}
      />
      {caption ? (
        <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

/** Lays screenshots out side by side (stacking on narrow screens). */
export function ScreenshotRow({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  const cols = columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return <div className={`not-prose my-6 grid grid-cols-1 items-start gap-6 ${cols}`}>{children}</div>
}
