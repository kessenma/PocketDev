import { getToolPath } from '../../../db/index.ts'
import { shellEscape, exec } from './utils.ts'
import type { AgentProviderConfig, SetupCtx } from './types.ts'

export function minimaxProviderConfig(): AgentProviderConfig {
  return {
    pollIntervalMs: 500,
    startupTimeoutMs: 30_000,
    ptyWidth: 120,
    ptyHeight: 40,
    forwardRawOutput: true,

    async setup(ctx: SetupCtx) {
      const opencodePath = getToolPath('opencode_cli') ?? 'opencode'
      const modelFlag = ctx.model ?? 'minimax/minimax-text-01'
      const scriptPath = `/tmp/pocketdev-run-${ctx.taskId}.sh`

      const script = [
        '#!/bin/bash',
        'export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"',
        `cd ${shellEscape(ctx.cwd)}`,
        `${shellEscape(opencodePath)} run -m ${shellEscape(modelFlag)} --prompt ${shellEscape(ctx.prompt)}`,
      ].join('\n')
      await Bun.write(scriptPath, script)
      await exec(`chmod +x ${shellEscape(scriptPath)}`)

      return { command: scriptPath, tempFiles: [scriptPath] }
    },

    onPaneSnapshot(_snapshot, _ctx) {
      // opencode runs and exits — completion handled by onPtyExit in ManagedAgentProcess
      return { type: 'continue' }
    },
  }
}
