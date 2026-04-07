import { ConnectTakeoverScene } from '../explainers/2-ConnectStage'
import type { SceneConfig } from '../timeline-types'

export const connectScene: SceneConfig = {
  id: 'connect',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.8,
  reducedMotionFullBleed: true,
  render: ({ progress, active, isDesktopLayout }) => (
    <div className="relative z-10 h-full w-full">
      <ConnectTakeoverScene
        progress={progress}
        active={active}
        isDesktopLayout={isDesktopLayout}
      />
    </div>
  ),
}
