import { useId } from 'react'
import { architectureTokens } from '../../../shared/theme'
import { RemoteAiStage } from '../explainers/5-RemoteAiStage'
import { TextGroup } from '../shared/TextGroup'
import { BauhausLaptop } from '../shared/BauhausLaptop'
import type { SceneConfig } from '../timeline-types'

export function RemoteAiTakeoverScene({
  takeoverProgress,
  isDesktopLayout,
}: {
  takeoverProgress: number
  isDesktopLayout: boolean
}) {
  const clipId = useId()
  const eased = takeoverProgress * takeoverProgress

  const vbW = isDesktopLayout ? 1200 : 750
  const vbH = 1200

  const centerX = vbW / 2
  const textCenterY = vbH * 0.38

  const textBottomY = textCenterY + (isDesktopLayout ? 132 : 84)
  const circleCenterY = textBottomY + (isDesktopLayout ? 120 : 90)

  const maxRadius = Math.sqrt(vbW * vbW + vbH * vbH) / 2 + 400
  const circleRadius = 60 + eased * maxRadius
  const isFilled = circleRadius >= maxRadius * 0.85

  const phoneX = centerX
  const phoneY = circleCenterY - (isDesktopLayout ? 20 : 10)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {isFilled && (
        <rect x="0" y="0" width={vbW} height={vbH} fill={architectureTokens.colors.blue} />
      )}

      <defs>
        <clipPath id={clipId}>
          <circle cx={centerX} cy={circleCenterY} r={circleRadius} />
        </clipPath>
      </defs>

      <BauhausLaptop
        cx={centerX + (isDesktopLayout ? 160 : 100)}
        cy={circleCenterY + (isDesktopLayout ? 60 : 40)}
        scale={isDesktopLayout ? 1.1 : 0.8}
      />

      <circle cx={centerX} cy={circleCenterY} r={circleRadius} fill={architectureTokens.colors.blue} />

      <TextGroup color={architectureTokens.colors.text} centerX={centerX} centerY={textCenterY} isDesktop={isDesktopLayout} />
      <g clipPath={`url(#${clipId})`}>
        <TextGroup color="#ffffff" centerX={centerX} centerY={textCenterY} isDesktop={isDesktopLayout} />
      </g>

      <RemoteAiStage
        active={takeoverProgress > 0}
        takeoverProgress={takeoverProgress}
        hideConnector
        transform={`translate(${phoneX - 34} ${phoneY - 58})`}
      />
    </svg>
  )
}

export const remoteAiScene: SceneConfig = {
  id: 'remote-ai',
  kind: 'takeover',
  weight: 4,
  holdRatio: 0.85,
  panelClassName: 'overflow-visible',
  reducedMotionFullBleed: true,
  render: ({ progress, isDesktopLayout }) => (
    <>
      <div className="relative z-10 h-full w-full">
        <RemoteAiTakeoverScene takeoverProgress={progress} isDesktopLayout={isDesktopLayout} />
      </div>
      {/* Extend blue fill rightward so no gap shows before the next panel */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0"
        style={{
          width: '50vw',
          transform: 'translateX(100%)',
          backgroundColor: architectureTokens.colors.blue,
        }}
      />
    </>
  ),
}
