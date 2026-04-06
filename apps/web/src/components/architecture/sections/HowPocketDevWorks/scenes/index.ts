import type { SceneConfig } from '../timeline-types'
import { installScene } from './install'
import { connectScene } from './connect'
import { setupScene } from './setup'
import { repoCloneScene } from './repo-clone'
import { remoteAiScene } from './remote-ai-takeover'
import { taskFlowScene } from './task-flow-takeover'

export const howItWorksScenes: SceneConfig[] = [
  installScene,
  connectScene,
  setupScene,
  repoCloneScene,
  remoteAiScene,
  taskFlowScene,
]
