import { fontFamilyTokens } from '@pocketdev/shared/theme'

export function Labels() {
  return (
    <g
      fill="#71717a"
      style={{
        fontFamily: `${fontFamilyTokens.mono}, ui-monospace, monospace`,
      }}
    >
      <text x="370" y="88" textAnchor="middle" fontSize="9" letterSpacing="0.8">
        YOUR VPS
      </text>

      <g fontSize="10">
        <text x="144" y="56" textAnchor="middle">Hosted Web</text>
        <text x="100" y="228" textAnchor="middle">Mobile</text>
        <text x="185" y="288" textAnchor="middle">Console</text>
        <text x="316" y="230" textAnchor="middle">Agent</text>
        <text x="458" y="220" textAnchor="middle">AI / Files</text>
      </g>
    </g>
  )
}
