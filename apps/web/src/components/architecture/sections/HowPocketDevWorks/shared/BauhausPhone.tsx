import type { ReactNode } from 'react'
import { palette } from '@pocketdev/shared/theme'

export function BauhausPhone({
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
  const w = 60
  const h = 110
  const bezelX = 8
  const bezelTop = 14
  const bezelBot = 10

  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* Body */}
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={12}
        fill={palette.bauhaus.black}
      />
      {/* Screen */}
      <rect
        x={-w / 2 + bezelX}
        y={-h / 2 + bezelTop}
        width={w - bezelX * 2}
        height={h - bezelTop - bezelBot}
        rx={6}
        fill="rgba(255,255,255,0.08)"
      />
      {/* Ear piece */}
      <rect
        x={-10}
        y={-h / 2 + 5}
        width={20}
        height={3}
        rx={1.5}
        fill="rgba(255,255,255,0.15)"
      />
      {/* Screen content */}
      {children ?? (
        <>
          <rect x={-w / 2 + 14} y={-h / 2 + 22} width={24} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-w / 2 + 14} y={-h / 2 + 30} width={32} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
          <rect x={-w / 2 + 14} y={-h / 2 + 38} width={18} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          <rect x={-w / 2 + 14} y={-h / 2 + 46} width={28} height={3} rx={1.5} fill="rgba(255,255,255,0.25)" />
        </>
      )}
    </g>
  )
}
