import { TaskFlowTakeoverScene } from '../explainers/6-TaskFlowTakeoverScene'
import type { SceneConfig } from '../timeline-types'

export const taskFlowScene: SceneConfig = {
  id: 'task-flow',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.8,
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
      <TaskFlowTakeoverScene progress={progress} isDesktopLayout={isDesktopLayout} />
    </div>
  ),
}
