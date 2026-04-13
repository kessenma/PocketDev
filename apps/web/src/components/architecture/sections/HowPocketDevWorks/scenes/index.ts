import type { SceneConfig } from '../timeline-types'
import { consoleSetupScene } from './1-console-setup'
import { connectScene } from './2-connect'
import { portSecurityScene } from './3-port-security'
import { setupScene } from './4-setup'
import { repoCloneScene } from './5-repo-clone'
import { envInjectionScene } from './6-env-injection'
import { remoteAiScene } from './7-remote-ai-takeover'
import { taskFlowScene } from './8-task-flow-takeover'
import { mobileAiTaskCallScene } from './9-mobile-ai-task-call'

export const howItWorksScenes: SceneConfig[] = [
  consoleSetupScene,     // 0
  connectScene,          // 1
  portSecurityScene,     // 2 — two-door shape-lock animation
  setupScene,            // 3
  repoCloneScene,        // 4
  envInjectionScene,     // 5
  remoteAiScene,         // 6
  taskFlowScene,         // 7
  mobileAiTaskCallScene, // 8
]
