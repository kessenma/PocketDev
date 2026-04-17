import { describe, expect, test } from 'bun:test'
import type { TaskActivity, TaskQuestion } from '@pocketdev/shared/types'
import { createTaskStreamAdapter, type CollectedToolUse, type PermissionDenial } from './task-stream-adapters/index.ts'

function createHarness(agentType: string) {
  const outputs: string[] = []
  const activities: TaskActivity[] = []
  const questions: Array<{ question: TaskQuestion; onAnswer: (answer: string) => void | Promise<void> }> = []
  const denials: PermissionDenial[][] = []
  const toolUses: CollectedToolUse[] = []
  const stdinWrites: string[] = []
  const sessionIds: string[] = []

  const adapter = createTaskStreamAdapter({
    agentType,
    taskId: 'task-1',
    sink: {
      emitOutput: (line) => outputs.push(line),
      emitActivity: (activity) => activities.push(activity),
      emitQuestion: (question, onAnswer) => questions.push({ question, onAnswer }),
      emitPermissionRequest: (next) => denials.push(next),
      updateSessionId: (sessionId) => sessionIds.push(sessionId),
      recordCollectedToolUse: (toolUse) => toolUses.push(toolUse),
    },
    writeStdin: (data) => stdinWrites.push(data),
  })

  if (!adapter) throw new Error(`Missing adapter for ${agentType}`)

  return { adapter, outputs, activities, questions, denials, toolUses, stdinWrites, sessionIds }
}

describe('task stream adapters', () => {
  test('keeps Claude streaming behavior and question routing', async () => {
    const harness = createHarness('claude')

    harness.adapter.handleJsonMessage({
      type: 'system',
      subtype: 'init',
      model: 'sonnet',
      permissionMode: 'acceptEdits',
      session_id: 'claude-session',
    })
    harness.adapter.handleJsonMessage({
      type: 'assistant',
      message: {
        content: [
          { type: 'thinking', thinking: 'Check task context first' },
          { type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: 'src/app.ts' } },
          { type: 'text', text: 'I found the issue.' },
        ],
      },
      permission_denials: [
        {
          tool_name: 'Bash',
          tool_use_id: 'deny-1',
          tool_input: { command: 'npm test' },
        },
      ],
    })

    expect(harness.sessionIds).toEqual(['claude-session'])
    expect(harness.outputs).toContain('[system] Session started - model: sonnet, permission: acceptEdits')
    expect(harness.activities.some((activity) => activity.type === 'tool_use' && activity.tool === 'Read')).toBe(true)
    expect(harness.activities.some((activity) => activity.type === 'text' && activity.content === 'I found the issue.')).toBe(true)
    expect(harness.toolUses).toHaveLength(1)
    expect(harness.denials).toHaveLength(1)
    expect(harness.questions[0]?.question.type).toBe('permission')

    await harness.questions[0]?.onAnswer('allow')
    expect(harness.stdinWrites).toEqual(['y\n'])
  })

  test('normalizes Codex tool events and structured question responses', async () => {
    const harness = createHarness('codex')

    harness.adapter.handleJsonMessage({
      method: 'item/started',
      params: {
        item: {
          id: 'cmd-1',
          type: 'commandExecution',
          command: 'npm test',
        },
      },
    })
    harness.adapter.handleJsonMessage({
      method: 'item/completed',
      params: {
        item: {
          id: 'cmd-1',
          type: 'commandExecution',
          aggregatedOutput: 'tests passed',
        },
      },
    })
    harness.adapter.handleJsonMessage({
      id: 42,
      method: 'item/commandExecution/requestApproval',
      params: {
        command: 'pnpm lint',
        cwd: '/repo',
        reason: 'Needed to verify the change',
      },
    })
    harness.adapter.handleJsonMessage({
      id: 44,
      method: 'item/tool/requestUserInput',
      params: {
        questions: [
          {
            id: 'target',
            header: 'Target',
            question: 'Which target should I use?',
            options: [
              { label: 'web', description: 'Run the web tests' },
              { label: 'mobile', description: 'Run the mobile tests' },
            ],
          },
        ],
      },
    })

    expect(harness.activities.some((activity) => activity.type === 'tool_use' && activity.tool === 'exec_command')).toBe(true)
    expect(harness.activities.some((activity) => activity.type === 'tool_result' && activity.preview === 'tests passed')).toBe(true)
    expect(harness.toolUses.some((toolUse) => toolUse.name === 'exec_command')).toBe(true)
    expect(harness.questions).toHaveLength(2)
    expect(harness.questions[0]?.question.type).toBe('permission')
    expect(harness.questions[1]?.question.type).toBe('multiple_choice')

    await harness.questions[0]?.onAnswer('yes')
    await harness.questions[1]?.onAnswer('mobile')

    expect(harness.stdinWrites).toEqual([
      '{"jsonrpc":"2.0","id":42,"result":{"decision":"accept"}}\n',
      '{"jsonrpc":"2.0","id":44,"result":{"answers":{"target":"mobile"}}}\n',
    ])
  })
})
