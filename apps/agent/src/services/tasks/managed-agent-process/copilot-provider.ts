import { getToolPath } from '../../../db/index.ts'
import { shellEscape, exec } from './utils.ts'
import type { AgentProviderConfig, SetupCtx } from './types.ts'

const TRUST_PROMPT_PATTERN = /do you trust (?:the files in this folder|the contents of this directory)\?/i
const COPILOT_IDLE_TIMEOUT_MS = 10_000
const COPILOT_READY_PATTERNS = [
  /describe a task to get started/i,
  /type @ to mention files/i,
  /what (?:would you like|can i help|do you want)/i,
  /ask copilot/i,
  /type a message/i,
  /how can i help/i,
]

function isCopilotReady(normalized: string): boolean {
  return COPILOT_READY_PATTERNS.some((p) => p.test(normalized))
}

export function copilotProviderConfig(): AgentProviderConfig {
  return {
    pollIntervalMs: 1500,
    startupTimeoutMs: 45_000,
    ptyWidth: 120,
    ptyHeight: 40,
    forwardRawOutput: true,

    async setup(ctx: SetupCtx) {
      const copilotPath = getToolPath('copilot_cli') ?? 'copilot'
      const command = ctx.model
        ? `${shellEscape(copilotPath)} --model ${shellEscape(ctx.model)}`
        : shellEscape(copilotPath)

      const scriptPath = `/tmp/pocketdev-run-${ctx.taskId}.sh`
      const script = [
        '#!/bin/bash',
        'export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"',
        `cd ${shellEscape(ctx.cwd)}`,
        command,
      ].join('\n')
      await Bun.write(scriptPath, script)
      await exec(`chmod +x ${shellEscape(scriptPath)}`)

      return { command: scriptPath, tempFiles: [scriptPath] }
    },

    async onPaneSnapshot(snapshot, ctx) {
      // Auto-answer trust prompt
      if (TRUST_PROMPT_PATTERN.test(snapshot)) {
        ctx.broadcastOutput('[copilot] Trust prompt detected — auto-accepting...')
        ctx.sendRaw('\x1b[B')  // Down arrow
        await Bun.sleep(300)
        ctx.sendRaw('\r')      // Enter
        return { type: 'continue' }
      }

      // Send prompt when TUI is ready for the first time
      if (!ctx.promptSent && isCopilotReady(snapshot)) {
        ctx.broadcastOutput('[copilot] TUI ready — sending prompt...')
        ctx.sendLine(ctx.prompt)
        return { type: 'continue', markPromptSent: true }
      }

      // Completion: prompt sent + output idle + ready pattern visible again
      if (ctx.promptSent && isCopilotReady(snapshot) && ctx.lastChangeMs > COPILOT_IDLE_TIMEOUT_MS) {
        ctx.broadcastOutput('[copilot] Task complete — agent returned to idle')
        return { type: 'complete', status: 'completed' }
      }

      return { type: 'continue' }
    },
  }
}
