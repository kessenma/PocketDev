import {
  SiGit,
  SiGitHex,
  SiGithub,
  SiGithubHex,
} from '@icons-pack/react-simple-icons'
import { RepoCloneStage } from '../explainers/RepoCloneStage'
import type { SceneConfig } from '../timeline-types'

export const repoCloneScene: SceneConfig = {
  id: 'repo-clone',
  kind: 'explainer',
  weight: 1,
  holdRatio: 0.4,
  explainer: {
    title: 'Then the PocketDev chooses which repos to clone',
    caption:
      'With the files staying on the server and file names cached locally on the phone for a snappy UX.',
    cardClassName: 'w-full max-w-[92rem]',
    stageMinHeight: 620,
    stageHeight: '78vh',
    stageBorderless: true,
    legend: [
      { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
      { label: 'Git', icon: <SiGit size={14} color={`#${SiGitHex}`} /> },
    ],
  },
  render: ({ active, progress }) => (
    <RepoCloneStage active={active} progress={progress} timelineProgress={progress} />
  ),
}
