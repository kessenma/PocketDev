import { describe, expect, test } from 'bun:test'
import { buildCommand } from './task-manager.ts'

describe('task-manager copilot command building', () => {
  test('includes selected copilot model when provided', () => {
    const command = buildCommand('copilot', 'ignored', 'gpt-5.4', 'default')
    expect(command.slice(-2)).toEqual(['--model', 'gpt-5.4'])
  })

  test('omits copilot model flag when no model is selected', () => {
    const command = buildCommand('copilot', 'ignored', null, 'default')
    expect(command).toHaveLength(1)
    expect(command[0].includes('copilot')).toBe(true)
  })

  test('uses json output for codex tasks', () => {
    const command = buildCommand('codex', 'hello', 'gpt-5.4', 'default')
    expect(command.slice(0, 5)).toEqual([command[0], 'exec', '--json', '--color', 'never'])
    expect(command.at(-1)).toBe('hello')
  })
})
