import { MobileAiTaskCallScene } from '../explainers/7-MobileAiTaskCallScene'
import type { SceneConfig } from '../timeline-types'

export const mobileAiTaskCallScene: SceneConfig = {
  id: 'mobile-ai-task-call',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.82,
  reducedMotionFullBleed: true,
  render: ({ progress, isDesktopLayout }) => (
    <div
      className="relative z-10 h-full"
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
      }}
    >
      <MobileAiTaskCallScene progress={progress} isDesktopLayout={isDesktopLayout} />
    </div>
  ),
}
