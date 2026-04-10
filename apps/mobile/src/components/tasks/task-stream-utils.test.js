const { getToolPresentation } = require('./task-stream-utils')

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
})
