import type { ReactNode } from 'react'
import { palette } from '@pocketdev/shared/theme'

/**
 * macOS-style file icon in Bauhaus design language.
 * Top-right corner is folded (dog-ear), body uses the provided accent color.
 */
export function BauhausFile({
  cx,
  cy,
  scale = 1,
  color = palette.bauhaus.black,
  children,
}: {
  cx: number
  cy: number
  scale?: number
  /** Accent color for the file body. Defaults to bauhaus black. */
  color?: string
  children?: ReactNode
}) {
  const w = 48
  const h = 58
  const fold = 14

  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* File body with dog-ear cutout */}
      <path
        d={`M ${-w / 2} ${-h / 2 + 6}
            Q ${-w / 2} ${-h / 2}, ${-w / 2 + 6} ${-h / 2}
            L ${w / 2 - fold} ${-h / 2}
            L ${w / 2} ${-h / 2 + fold}
            L ${w / 2} ${h / 2 - 6}
            Q ${w / 2} ${h / 2}, ${w / 2 - 6} ${h / 2}
            L ${-w / 2 + 6} ${h / 2}
            Q ${-w / 2} ${h / 2}, ${-w / 2} ${h / 2 - 6}
            Z`}
        fill={color}
      />
      {/* Fold triangle */}
      <path
        d={`M ${w / 2 - fold} ${-h / 2}
            L ${w / 2 - fold} ${-h / 2 + fold}
            L ${w / 2} ${-h / 2 + fold}`}
        fill="rgba(255,255,255,0.12)"
      />
      {/* Fold crease line */}
      <path
        d={`M ${w / 2 - fold} ${-h / 2}
            L ${w / 2} ${-h / 2 + fold}`}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.8"
        fill="none"
      />

      {/* Content */}
      {children ?? (
        <>
          <rect x={-w / 2 + 10} y={-h / 2 + 20} width={22} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-w / 2 + 10} y={-h / 2 + 27} width={28} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
          <rect x={-w / 2 + 10} y={-h / 2 + 34} width={16} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          <rect x={-w / 2 + 10} y={-h / 2 + 41} width={24} height={3} rx={1.5} fill="rgba(255,255,255,0.25)" />
        </>
      )}
    </g>
  )
}
