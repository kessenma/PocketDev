import { PortSecurityStage } from '../explainers/3-PortSecurityStage'
import type { SceneConfig } from '../timeline-types'

export const portSecurityScene: SceneConfig = {
  id: 'port-security',
  kind: 'takeover',
  weight: 8,
  holdRatio: 0.96,
  reducedMotionFullBleed: true,
  render: ({ progress, active, isDesktopLayout, hideLaptop, hideBlueCircle, hidePhone, hideDoor, doorPreviewProgress, assetsRevealP }) => (
    <div className="relative z-10 h-full w-full">
      <PortSecurityStage
        progress={progress}
        active={active}
        isDesktopLayout={isDesktopLayout}
        hideLaptop={hideLaptop}
        hideBlueCircle={hideBlueCircle}
        hidePhone={hidePhone}
        hideDoor={hideDoor}
        doorPreviewProgress={doorPreviewProgress ?? 0}
        assetsRevealP={assetsRevealP ?? 1}
      />
    </div>
  ),
}
