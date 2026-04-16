const { getToolPresentation, parseCodexRawLogToActivity } = require('./task-stream-utils')

describe('task stream utils', () => {
  it('maps Claude and Codex tool names into unified categories', () => {
    expect(getToolPresentation({
      type: 'tool_use',
      tool: 'Read',
      filePath: 'src/app.ts',
    })).toMatchObject({ kind: 'read', label: 'Reading', detail: 'src/app.ts' })

    expect(getToolPresentation({
      type: 'tool_use',
      tool: 'exec_command',
      kind: 'run',
      command: 'npm test',
    })).toMatchObject({ kind: 'run', label: 'Running', detail: 'npm test' })

    expect(getToolPresentation({
      type: 'tool_use',
      tool: 'apply_patch',
      kind: 'write',
      detail: 'src/app.ts +1 more',
    })).toMatchObject({ kind: 'write', label: 'Editing', detail: 'src/app.ts +1 more' })
  })

  it('parses Codex raw log lines into fallback activities for detail cards', () => {
    expect(parseCodexRawLogToActivity('[tool] exec_command: npm test')).toMatchObject({
      type: 'tool_use',
      provider: 'codex',
      tool: 'exec_command',
      detail: 'npm test',
    })

    expect(parseCodexRawLogToActivity('[result] tests passed')).toMatchObject({
      type: 'tool_result',
      provider: 'codex',
      isError: false,
      preview: 'tests passed',
    })

    expect(parseCodexRawLogToActivity('[thinking] check the failing test')).toMatchObject({
      type: 'thinking',
      provider: 'codex',
      preview: 'check the failing test',
    })

    expect(parseCodexRawLogToActivity('I found the issue.')).toMatchObject({
      type: 'text',
      provider: 'codex',
      content: 'I found the issue.',
    })
  })
})
