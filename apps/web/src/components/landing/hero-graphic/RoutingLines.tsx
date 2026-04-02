/**
 * Generates d-attribute for one routing line.
 * Each line arcs over the top-right, descends the right side,
 * then curves left toward the phone — like nested pipe bends.
 */
function routePath(index: number): string {
  const spacing = 14
  const offset = index * spacing

  // Vertical start on the right side, staggered inward
  const x = 440 - offset
  const topY = 60 + offset * 1.5 // inner lines start lower (shorter arc)
  const arcR = 60 - offset * 0.5 // radius decreases for inner lines

  // Top arc: comes from the left, curves over to go downward
  const arcStartX = x - arcR
  const arcStartY = topY

  // Vertical descent
  const bottomY = 380 + offset * 0.8

  // Bottom curve: turns left toward the phone
  const bottomR = 30 + index * 4
  const endX = 210 + offset * 0.3
  const endY = bottomY + bottomR

  return [
    // Start with the top arc
    `M ${arcStartX} ${arcStartY}`,
    `Q ${x} ${arcStartY} ${x} ${arcStartY + arcR}`,
    // Straight descent
    `L ${x} ${bottomY}`,
    // Bottom curve turning left
    `Q ${x} ${bottomY + bottomR} ${x - bottomR} ${bottomY + bottomR}`,
    // Horizontal run toward phone
    `L ${endX} ${endY}`,
  ].join(' ')
}

const LINE_COUNT = 7

export const routePaths = Array.from({ length: LINE_COUNT }, (_, i) =>
  routePath(i),
)

export function RoutingLines() {
  return (
    <g>
      {routePaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="6"
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}
