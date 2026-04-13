import { palette } from '@pocketdev/shared/theme'
import { BauhausPhone } from '../shared/BauhausPhone'

export function RemoteAiStage({
  mobileLayout = false,
  hideConnector = false,
  transform,
}: {
  active: boolean
  takeoverProgress?: number
  mobileLayout?: boolean
  hideConnector?: boolean
  transform?: string
}) {
  const connectorPath = mobileLayout
    ? 'M 92 110 C 122 122, 150 132, 186 138'
    : 'M 92 110 C 122 102, 150 90, 188 74'

  return (
    <g transform={transform}>
      <BauhausPhone cx={63} cy={111}>
        {/* White content area */}
        <rect x={-15} y={-19} width={30} height={34} rx={8} fill="rgba(255,255,255,0.96)" />
        {/* Blue badge */}
        <rect x={-10} y={20} width={20} height={6} rx={3} fill={palette.bauhaus.blue} />
      </BauhausPhone>

      {!hideConnector && (
        <path
          d={connectorPath}
          fill="none"
          stroke={palette.bauhaus.black}
          strokeWidth="8"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}
