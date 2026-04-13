import { PortSecurityStage } from '../explainers/3-PortSecurityStage'
import type { SceneConfig } from '../timeline-types'

export const portSecurityScene: SceneConfig = {
  id: 'port-security',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.78,
  reducedMotionFullBleed: true,
  render: ({ progress, active, isDesktopLayout, hideBlueCircle, hidePhone }) => (
    <div className="relative z-10 h-full w-full">
      <PortSecurityStage
        progress={progress}
        active={active}
        isDesktopLayout={isDesktopLayout}
        hideBlueCircle={hideBlueCircle}
        hidePhone={hidePhone}
      />
    </div>
  ),
}
