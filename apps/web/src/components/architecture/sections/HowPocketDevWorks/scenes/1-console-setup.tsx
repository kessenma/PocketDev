import { ConsoleSetupStage } from '../explainers/1-ConsoleSetupStage'
import type { SceneConfig } from '../timeline-types'

export const consoleSetupScene: SceneConfig = {
  id: 'console-setup',
  kind: 'explainer',
  weight: 4,
  holdRatio: 0.82,
  explainer: {
    title: 'Enter in credentials',
    caption:
      "Then open up the Pocket Dev web console on you IP address",
    cardClassName: 'w-full max-w-6xl',
    stageMinHeight: 540,
    stageHeight: '86vh',
    stageBorderless: true,
    viewBox: '0 0 420 320',
    preserveAspectRatio: 'xMidYMid meet',
  },
  render: ({ progress, hideLaptop }) => (
    <ConsoleSetupStage
      progress={progress}
      hideLaptop={hideLaptop}
    />
  ),
}
