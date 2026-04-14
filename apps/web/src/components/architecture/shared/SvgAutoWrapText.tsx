import type { SVGAttributes } from 'react'
import { wrapTextToLines } from './pretext-measure'

type Props = Omit<SVGAttributes<SVGTextElement>, 'children'> & {
  x: number
  y: number
  /** CSS font shorthand for pretext measurement, e.g. "500 16px Inter, sans-serif" */
  font: string
  /** Maximum line width in SVG user units (= CSS pixels before any SVG transform) */
  maxWidth: number
  /** Line height in SVG user units, used for dy offset between tspans */
  lineHeight: number
  children: string
}

/**
 * Drop-in SVG <text> replacement that auto-wraps text using pretext instead of
 * manual hardcoded <tspan> line breaks.
 *
 * Pass `font` (CSS shorthand for measurement) alongside the usual SVG text
 * presentation attributes (fontFamily, fontSize, fontWeight, fill, etc.).
 */
export function SvgAutoWrapText({ x, y, font, maxWidth, lineHeight, children, ...rest }: Props) {
  const lines = wrapTextToLines(children, font, maxWidth, lineHeight)
  return (
    <text x={x} y={y} {...rest}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}
