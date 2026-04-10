import type { SceneConfig } from '../timeline-types'
import { consoleSetupScene } from './1-console-setup'
import { connectScene } from './2-connect'
import { setupScene } from './3-setup'
import { repoCloneScene } from './4-repo-clone'
import { envInjectionScene } from './4-5-env-injection'
import { remoteAiScene } from './5-remote-ai-takeover'
import { taskFlowScene } from './6-task-flow-takeover'
import { mobileAiTaskCallScene } from './7-mobile-ai-task-call'

export const howItWorksScenes: SceneConfig[] = [
  consoleSetupScene,
  connectScene,
  setupScene,
  repoCloneScene,
  envInjectionScene,
  remoteAiScene,
  taskFlowScene,
  mobileAiTaskCallScene,
]
