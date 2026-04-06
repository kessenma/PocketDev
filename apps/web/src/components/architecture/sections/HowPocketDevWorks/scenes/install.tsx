import { InstallStage } from '../explainers/InstallStage'
import type { SceneConfig } from '../timeline-types'

export const installScene: SceneConfig = {
  id: 'install',
  kind: 'explainer',
  weight: 1.5,
  holdRatio: 0.5,
  explainer: {
    title: 'Install The PocketDev Agent',
    caption:
      'To get started, install the PocketDev agent on your self-hosted Linux Ubuntu server, then wake the runtime with a single tap.',
    cardClassName: 'w-full max-w-6xl',
    stageMinHeight: 540,
    stageHeight: '86vh',
    stageBorderless: true,
    viewBox: '0 0 420 200',
    preserveAspectRatio: 'xMidYMid meet',
  },
  render: ({ active, progress }) => (
    <InstallStage active={active} progress={progress} />
  ),
}
