/**
 * Minimal text labels below each shape, plus a "Your VPS" label
 * on the dashed boundary so it's clear what runs where.
 */
export function Labels() {
  return (
    <g fontFamily="ui-monospace, monospace" fill="#71717a">
      {/* VPS boundary label */}
      <text x="325" y="88" textAnchor="middle" fontSize="9" letterSpacing="0.5">
        Your VPS
      </text>

      {/* Shape labels */}
      <g fontSize="10">
        <text x="85" y="205" textAnchor="middle">Mobile</text>
        <text x="270" y="210" textAnchor="middle">Agent</text>
        <text x="402" y="190" textAnchor="middle">AI / CLI</text>
      </g>
    </g>
  )
}
