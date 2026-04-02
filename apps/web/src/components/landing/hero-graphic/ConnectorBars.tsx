import { palette } from '@pocketdev/shared/theme'

export function ConnectorBars() {
  return (
    <g>
      {/* Red horizontal connector bar — crosses the top of the routing area */}
      <rect x="265" y="148" width="100" height="16" rx="2" fill={palette.bauhaus.red} />

      {/* Yellow vertical backing block — behind lower routing lines */}
      <rect x="250" y="220" width="65" height="200" rx="4" fill={palette.bauhaus.yellow} />
    </g>
  )
}
