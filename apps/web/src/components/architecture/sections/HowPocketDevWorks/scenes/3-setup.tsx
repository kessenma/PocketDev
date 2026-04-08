import { SetupTakeoverScene } from '../explainers/3-SetupStage'
import type { SceneConfig } from '../timeline-types'

export const setupScene: SceneConfig = {
  id: 'setup',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.75,
  reducedMotionFullBleed: true,
  render: ({ progress, active, isDesktopLayout, hideBlueCircle }) => (
    <div className="relative z-10 h-full w-full">
      <SetupTakeoverScene
        progress={progress}
        active={active}
        isDesktopLayout={isDesktopLayout}
        hideBlueCircle={hideBlueCircle}
      />
    </div>
  ),
}
