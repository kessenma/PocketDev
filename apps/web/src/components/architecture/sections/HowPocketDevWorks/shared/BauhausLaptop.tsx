import type { ReactNode } from 'react'
import { palette } from '@pocketdev/shared/theme'

export function BauhausLaptop({
  cx,
  cy,
  scale = 1,
  children,
}: {
  cx: number
  cy: number
  scale?: number
  children?: ReactNode
}) {
  const w = 180
  const h = 120
  const baseW = 200
  const baseH = 10

  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* Screen lid */}
      <rect
        x={-w / 2}
        y={-h - baseH / 2}
        width={w}
        height={h}
        rx={8}
        fill={palette.bauhaus.black}
      />
      {/* Screen inner */}
      <rect
        x={-w / 2 + 8}
        y={-h - baseH / 2 + 8}
        width={w - 16}
        height={h - 16}
        rx={4}
        fill="rgba(255,255,255,0.08)"
      />
      {/* Screen content */}
      {children ?? (
        <>
          <rect x={-w / 2 + 18} y={-h - baseH / 2 + 22} width={60} height={4} rx={2} fill="rgba(255,255,255,0.5)" />
          <rect x={-w / 2 + 18} y={-h - baseH / 2 + 32} width={90} height={4} rx={2} fill="rgba(255,255,255,0.3)" />
          <rect x={-w / 2 + 18} y={-h - baseH / 2 + 42} width={45} height={4} rx={2} fill="rgba(255,255,255,0.4)" />
          <rect x={-w / 2 + 18} y={-h - baseH / 2 + 52} width={72} height={4} rx={2} fill="rgba(255,255,255,0.25)" />
          <rect x={-w / 2 + 18} y={-h - baseH / 2 + 62} width={54} height={4} rx={2} fill="rgba(255,255,255,0.35)" />
        </>
      )}

      {/* Keyboard base */}
      <rect
        x={-baseW / 2}
        y={-baseH / 2}
        width={baseW}
        height={baseH}
        rx={3}
        fill={palette.bauhaus.black}
      />
      {/* Trackpad hint */}
      <rect
        x={-16}
        y={-baseH / 2 + 2}
        width={32}
        height={baseH - 4}
        rx={2}
        fill="rgba(255,255,255,0.1)"
      />
    </g>
  )
}
