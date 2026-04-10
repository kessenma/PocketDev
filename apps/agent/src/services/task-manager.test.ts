import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('../db/index.ts', () => ({
  getProject: () => undefined,
  getRecentTasks: () => [],
  getTask: () => undefined,
  getToolPath: () => null,
  insertTask: () => {},
  insertTaskTurn: () => {},
  resetTaskForContinuation: () => {},
}))

mock.module('./projects.ts', () => ({
  getActiveProjectId: () => null,
}))

mock.module('./managed-process.ts', () => ({
  ManagedProcess: class ManagedProcess {},
}))

mock.module('./managed-tmux-process.ts', () => ({
  ManagedTmuxProcess: class ManagedTmuxProcess {},
}))

let buildCommand: typeof import('./task-manager.ts').buildCommand

beforeAll(async () => {
  ;({ buildCommand } = await import('./task-manager.ts'))
})

describe('task-manager command building', () => {
  test('includes selected copilot model when provided', () => {
    const command = buildCommand('copilot', 'ignored', 'gpt-5.4', 'default')
    expect(command.slice(-2)).toEqual(['--model', 'gpt-5.4'])
  })

  test('omits copilot model flag when no model is selected', () => {
    const command = buildCommand('copilot', 'ignored', null, 'default')
    expect(command).toHaveLength(1)
    expect(command[0].includes('copilot')).toBe(true)
  })

  test('uses app-server transport for codex tasks', () => {
    const command = buildCommand('codex', 'hello', 'gpt-5.4', 'default')
    expect(command.slice(0, 4)).toEqual([command[0], 'app-server', '--listen', 'stdio://'])
  })
})
