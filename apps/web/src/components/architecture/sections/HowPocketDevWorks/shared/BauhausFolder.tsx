import { motion } from 'framer-motion'
import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black } = palette.bauhaus

/**
 * Bauhaus-style folder with three file pages that fan out when open.
 * All SVG — works inside any <svg> viewBox.
 */
export function BauhausFolder({
  cx,
  cy,
  scale = 1,
  open = false,
}: {
  cx: number
  cy: number
  scale?: number
  /** When true, files fan out above the folder */
  open?: boolean
}) {
  const fw = 72 // folder width
  const fh = 52 // folder height
  const tabW = 24
  const tabH = 10
  const fileW = 40
  const fileH = 50
  const fileFold = 10
  const r = 6

  // File page path (with dog-ear)
  const filePath = `
    M ${-fileW / 2} ${-fileH / 2 + 4}
    Q ${-fileW / 2} ${-fileH / 2}, ${-fileW / 2 + 4} ${-fileH / 2}
    L ${fileW / 2 - fileFold} ${-fileH / 2}
    L ${fileW / 2} ${-fileH / 2 + fileFold}
    L ${fileW / 2} ${fileH / 2 - 4}
    Q ${fileW / 2} ${fileH / 2}, ${fileW / 2 - 4} ${fileH / 2}
    L ${-fileW / 2 + 4} ${fileH / 2}
    Q ${-fileW / 2} ${fileH / 2}, ${-fileW / 2} ${fileH / 2 - 4}
    Z
  `

  // Fan-out positions for the three files when open
  const files = [
    { color: red, closedY: -8, openX: -28, openY: -48, openRotate: -15 },
    { color: yellow, closedY: -4, openX: 0, openY: -56, openRotate: 5 },
    { color: blue, closedY: 0, openX: 26, openY: -44, openRotate: 18 },
  ]

  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* Folder back panel */}
      <rect
        x={-fw / 2}
        y={-fh / 2}
        width={fw}
        height={fh}
        rx={r}
        fill={darken(black, 0.15)}
      />
      {/* Tab */}
      <rect
        x={-fw / 2}
        y={-fh / 2 - tabH}
        width={tabW}
        height={tabH + r}
        rx={r / 2}
        fill={darken(black, 0.15)}
      />

      {/* File pages */}
      {files.map((f, i) => (
        <motion.g
          key={i}
          animate={
            open
              ? { x: f.openX, y: f.openY, rotate: f.openRotate }
              : { x: 0, y: f.closedY, rotate: 0 }
          }
          transition={{ duration: 0.5, delay: open ? i * 0.08 : 0, ease: 'easeOut' }}
          style={{ transformOrigin: '0px 0px' }}
        >
          <path d={filePath} fill={f.color} />
          {/* Fold triangle */}
          <path
            d={`M ${fileW / 2 - fileFold} ${-fileH / 2}
                L ${fileW / 2 - fileFold} ${-fileH / 2 + fileFold}
                L ${fileW / 2} ${-fileH / 2 + fileFold}`}
            fill="rgba(255,255,255,0.15)"
          />
          {/* Code lines */}
          <rect x={-fileW / 2 + 8} y={-fileH / 2 + 16} width={18} height={2.5} rx={1} fill="rgba(255,255,255,0.5)" />
          <rect x={-fileW / 2 + 8} y={-fileH / 2 + 22} width={24} height={2.5} rx={1} fill="rgba(255,255,255,0.3)" />
          <rect x={-fileW / 2 + 8} y={-fileH / 2 + 28} width={14} height={2.5} rx={1} fill="rgba(255,255,255,0.4)" />
        </motion.g>
      ))}

      {/* Folder front flap — renders on top */}
      <motion.g
        animate={open ? { scaleY: 0.55, skewX: 12 } : { scaleY: 1, skewX: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ transformOrigin: `0px ${fh / 2}px` }}
      >
        <rect
          x={-fw / 2}
          y={-fh / 2}
          width={fw}
          height={fh}
          rx={r}
          fill={black}
        />
      </motion.g>
    </g>
  )
}

function darken(hex: string, amount: number): string {
  const c = hex.startsWith('#') ? hex.slice(1) : hex
  const n = parseInt(c, 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
