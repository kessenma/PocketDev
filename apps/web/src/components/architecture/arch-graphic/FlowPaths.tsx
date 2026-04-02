/**
 * Static connection paths between the three layer shapes.
 * Two routes: mobile↔agent and agent↔AI.
 * Each path has a slight vertical offset for visual depth.
 */

/** Mobile (right edge) → Agent (left edge of circle) */
export const pathMobileToAgent = 'M 110 135 C 155 115, 175 115, 220 135'
export const pathMobileToAgentLow = 'M 110 140 C 155 160, 175 160, 220 140'

/** Agent (right edge of circle) → AI (left edge) */
export const pathAgentToAI = 'M 320 130 C 340 115, 355 115, 375 130'
export const pathAgentToAILow = 'M 320 140 C 340 155, 355 155, 375 140'

const allPaths = [
  pathMobileToAgent,
  pathMobileToAgentLow,
  pathAgentToAI,
  pathAgentToAILow,
]

export function FlowPaths() {
  return (
    <g>
      {allPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}
