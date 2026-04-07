import type { SceneConfig } from '../timeline-types'
import { installScene } from './1-install'
import { consoleSetupScene } from './2-console-setup'
import { connectScene } from './2-connect'
import { setupScene } from './3-setup'
import { repoCloneScene } from './4-repo-clone'
import { remoteAiScene } from './5-remote-ai-takeover'
import { taskFlowScene } from './6-task-flow-takeover'

export const howItWorksScenes: SceneConfig[] = [
  installScene,
  consoleSetupScene,
  connectScene,
  setupScene,
  repoCloneScene,
  remoteAiScene,
  taskFlowScene,
]
