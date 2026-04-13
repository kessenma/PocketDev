import { EnvInjectionTakeoverStage } from '../explainers/6-EnvInjectionStage'
import type { SceneConfig } from '../timeline-types'

export const envInjectionScene: SceneConfig = {
  id: 'env-injection',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.8,
  reducedMotionFullBleed: true,
  render: ({ progress, isDesktopLayout, hideBlueCircle }) => (
    <div className="relative z-10 h-full w-full">
      <EnvInjectionTakeoverStage
        progress={progress}
        isDesktopLayout={isDesktopLayout}
        hideBlueCircle={hideBlueCircle}
      />
    </div>
  ),
}
