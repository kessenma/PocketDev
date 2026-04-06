import { palette } from '@pocketdev/shared/theme'

export function AiBuildExplainer(_: {
  active: boolean
  takeoverProgress?: number
  mobileLayout?: boolean
}) {
  const mobileLayout = _.mobileLayout ?? false
  const connectorPath = mobileLayout
    ? 'M 92 110 C 122 122, 150 132, 186 138'
    : 'M 92 110 C 122 102, 150 90, 188 74'

  return (
    <>
      <rect x="34" y="58" width="58" height="106" rx="18" fill={palette.bauhaus.black} />
      <rect x="41" y="66" width="44" height="86" rx="12" fill="rgba(255,255,255,0.08)" />
      <rect x="51" y="78" width="24" height="4" rx="2" fill="rgba(255,255,255,0.82)" />
      <rect x="48" y="92" width="30" height="34" rx="8" fill="rgba(255,255,255,0.96)" />
      <rect x="53" y="131" width="20" height="6" rx="3" fill={palette.bauhaus.blue} />
      <circle cx="63" cy="149" r="3" fill="rgba(255,255,255,0.55)" />

      <path
        d={connectorPath}
        fill="none"
        stroke={palette.bauhaus.black}
        strokeWidth="8"
        strokeLinecap="round"
      />
    </>
  )
}
