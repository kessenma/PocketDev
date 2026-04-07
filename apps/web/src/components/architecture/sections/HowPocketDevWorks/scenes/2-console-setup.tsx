import { ConsoleSetupStage } from '../explainers/2-ConsoleSetupStage'
import type { SceneConfig } from '../timeline-types'

export const consoleSetupScene: SceneConfig = {
  id: 'console-setup',
  kind: 'explainer',
  weight: 4,
  holdRatio: 0.82,
  explainer: {
    title: 'Claim your server',
    caption:
      "SSH in, run the install script, and create your admin account. The console is now yours — ready to pair a device.",
    cardClassName: 'w-full max-w-6xl',
    stageMinHeight: 540,
    stageHeight: '86vh',
    stageBorderless: true,
    viewBox: '0 0 420 320',
    preserveAspectRatio: 'xMidYMid meet',
  },
  render: ({ active, progress }) => (
    <ConsoleSetupStage active={active} progress={progress} />
  ),
}
