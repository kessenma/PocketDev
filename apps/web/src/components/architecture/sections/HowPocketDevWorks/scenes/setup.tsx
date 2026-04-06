import {
  SiDocker,
  SiDockerHex,
  SiGithub,
  SiGithubHex,
  SiNodedotjs,
  SiNodedotjsHex,
} from '@icons-pack/react-simple-icons'
import { SetupStage } from '../explainers/SetupStage'
import type { SceneConfig } from '../timeline-types'

export const setupScene: SceneConfig = {
  id: 'setup',
  kind: 'explainer',
  weight: 2,
  holdRatio: 0.7,
  explainer: {
    title: 'Prepare The Workspace',
    caption:
      'After pairing the mobile app to the agent on the server, PocketDev relies on server-side-helper scripts to setup git SSH, package tooling, AI CLIs, and Docker on the box itself.',
    cardClassName: 'w-full max-w-5xl',
    stageMinHeight: 420,
    stageHeight: 420,
    stageBorderless: true,
    legend: [
      { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
      { label: 'Docker', icon: <SiDocker size={14} color={`#${SiDockerHex}`} /> },
      { label: 'Node', icon: <SiNodedotjs size={14} color={`#${SiNodedotjsHex}`} /> },
    ],
  },
  render: ({ active, progress }) => (
    <SetupStage active={active} progress={progress} timelineProgress={progress} />
  ),
}
