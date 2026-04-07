import { RepoCloneTakeoverScene } from '../explainers/4-RepoCloneStage'
import type { SceneConfig } from '../timeline-types'

export const repoCloneScene: SceneConfig = {
  id: 'repo-clone',
  kind: 'takeover',
  weight: 3,
  holdRatio: 0.75,
  reducedMotionFullBleed: true,
  render: ({ progress, active, isDesktopLayout }) => (
    <div className="relative z-10 h-full w-full">
      <RepoCloneTakeoverScene
        progress={progress}
        active={active}
        isDesktopLayout={isDesktopLayout}
      />
    </div>
  ),
}
