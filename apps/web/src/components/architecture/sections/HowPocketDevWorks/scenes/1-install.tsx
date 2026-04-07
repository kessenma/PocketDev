import { InstallStage } from '../explainers/1-InstallStage'
import type { SceneConfig } from '../timeline-types'

export const installScene: SceneConfig = {
  id: 'install',
  kind: 'explainer',
  weight: 1.5,
  holdRatio: 0.5,
  explainer: {
    title: 'Install the agent on your server',
    caption:
      'Run one command on any Ubuntu server. PocketDev installs itself and starts the agent — ready to pair in under a minute.',
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
