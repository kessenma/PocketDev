import { architectureFonts } from '../../../shared/theme'

/**
 * SVG text rendered in this component:
 *
 * Server ready.
 * Repos cloned.
 * Now...
 * Code from anywhere, on any device.
 */
export function TextGroup({
  color,
  centerX,
  centerY,
  isDesktop,
}: {
  color: string
  centerX: number
  centerY: number
  isDesktop: boolean
}) {
  const blockWidth = isDesktop ? 480 : 340
  const baseX = centerX - blockWidth / 2
  const headingSize = isDesktop ? 44 : 32
  const headingLineHeight = isDesktop ? 56 : 42
  const topY = centerY - (isDesktop ? 200 : 160)

  return (
    <g fill={color}>
      <text
        x={baseX}
        y={topY}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktop ? 18 : 14}
        letterSpacing="0.22em"
        opacity="0.68"
      >
        Server ready.
      </text>
      <text
        x={baseX + (isDesktop ? 40 : 20)}
        y={topY + (isDesktop ? 70 : 50)}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktop ? 20 : 16}
        opacity="0.76"
      >
        Repos cloned.
      </text>
      <text
        x={baseX + (isDesktop ? 80 : 40)}
        y={topY + (isDesktop ? 120 : 90)}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktop ? 22 : 17}
        opacity="0.84"
      >
        Now...
      </text>
      <text
        x={baseX}
        y={topY + (isDesktop ? 220 : 160)}
        fontFamily={architectureFonts.display}
        fontSize={headingSize}
        fontWeight="700"
        letterSpacing="-0.03em"
      >
        <tspan x={baseX} dy="0">Code from anywhere,</tspan>
        <tspan x={baseX} dy={headingLineHeight}>on any device.</tspan>
      </text>
    </g>
  )
}
