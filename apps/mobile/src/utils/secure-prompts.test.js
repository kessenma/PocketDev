const {
  createSecurePromptMatcher,
  outputHasLine,
  stripAnsi,
  SECURE_PROMPT_BUFFER_SIZE,
} = require('./secure-prompts')

const PASSWORD = { pattern: /Apple Account password:\s*$/, title: 'Apple Account password', kind: 'password' }
const CODE = {
  pattern: /Enter 2FA code:\s*$/,
  title: 'Verification code',
  message: 'Enter the code',
  detailPattern: /Verification code sent to[^\r\n]*/,
  kind: 'code',
}

describe('createSecurePromptMatcher', () => {
  it('detects a prompt delivered in one chunk', () => {
    const matcher = createSecurePromptMatcher([PASSWORD])
    const match = matcher.push('Signing in…\r\nApple Account password: ')
    expect(match).toMatchObject({ title: 'Apple Account password', kind: 'password', message: null })
  })

  it('detects a prompt split across chunks', () => {
    const matcher = createSecurePromptMatcher([PASSWORD])
    expect(matcher.push('Apple Acc')).toBeNull()
    expect(matcher.push('ount pass')).toBeNull()
    expect(matcher.push('word: ')).toMatchObject({ kind: 'password' })
  })

  it('triggers once per occurrence', () => {
    const matcher = createSecurePromptMatcher([PASSWORD])
    expect(matcher.push('Apple Account password: ')).not.toBeNull()
    // More output (e.g. a newline after the hidden input) must not re-trigger the same prompt
    expect(matcher.push('\r\n')).toBeNull()
    expect(matcher.push('Checking…\r\n')).toBeNull()
    // A new prompt (wrong password, asked again) triggers again
    expect(matcher.push('Apple Account password: ')).not.toBeNull()
  })

  it('does not match a prompt that already got an answer', () => {
    const matcher = createSecurePromptMatcher([PASSWORD])
    expect(matcher.push('Apple Account password: hunter2\r\nok\r\n')).toBeNull()
  })

  it('ignores ANSI escape codes, including ones split across chunks', () => {
    const matcher = createSecurePromptMatcher([PASSWORD])
    expect(matcher.push('\x1b[1mApple Account password:\x1b')).toBeNull()
    expect(matcher.push('[0m ')).toMatchObject({ kind: 'password' })
  })

  it('uses detail text from recent output as the message', () => {
    const matcher = createSecurePromptMatcher([CODE])
    expect(matcher.push('Verification code sent to •••• 12\r\n')).toBeNull()
    expect(matcher.push('Enter 2FA code: ')).toMatchObject({
      kind: 'code',
      message: 'Verification code sent to •••• 12',
    })
  })

  it('falls back to the spec message when there is no detail', () => {
    const matcher = createSecurePromptMatcher([CODE])
    expect(matcher.push('Enter 2FA code: ').message).toBe('Enter the code')
  })

  it('only keeps a bounded buffer', () => {
    const matcher = createSecurePromptMatcher([{ pattern: /needle/, title: 'x', kind: 'text' }], 20)
    expect(matcher.push('nee')).toBeNull()
    expect(matcher.push('x'.repeat(SECURE_PROMPT_BUFFER_SIZE))).toBeNull()
    expect(matcher.push('dle')).toBeNull()
  })

  it('reads the latest specs when given a function', () => {
    let specs = []
    const matcher = createSecurePromptMatcher(() => specs)
    expect(matcher.push('Apple Account password: ')).toBeNull()
    specs = [PASSWORD]
    expect(matcher.push('Apple Account password: ')).toMatchObject({ kind: 'password' })
  })

  it('reset() drops partial output', () => {
    const matcher = createSecurePromptMatcher([PASSWORD])
    matcher.push('Apple Account pass')
    matcher.reset()
    expect(matcher.push('word: ')).toBeNull()
  })

  it('passes through prefill and alternative answers', () => {
    const matcher = createSecurePromptMatcher([
      { pattern: /Apple ID:\s*$/, title: 'Email', kind: 'text', defaultValue: 'me@example.com', alternative: { label: 'SMS', value: 'sms' } },
    ])
    expect(matcher.push('Apple ID: ')).toMatchObject({
      defaultValue: 'me@example.com',
      alternative: { label: 'SMS', value: 'sms' },
    })
  })
})

describe('stripAnsi', () => {
  it('removes colour and OSC sequences', () => {
    expect(stripAnsi('\x1b[32mok\x1b[0m \x1b]0;title\x07done')).toBe('ok done')
  })
})

describe('outputHasLine', () => {
  it('finds a line printed on its own', () => {
    expect(outputHasLine('foo\r\nPocketDev: API key created.\r\n', 'PocketDev: API key created.')).toBe(true)
  })

  it('ignores the echoed command that prints the line', () => {
    const echo = "% asc web api-keys create > out.json && echo 'PocketDev: API key created.'\r\n"
    expect(outputHasLine(echo, 'PocketDev: API key created.')).toBe(false)
  })
})

describe('cleanTerminalOutput', () => {
  const { cleanTerminalOutput } = require('./secure-prompts')
  it('strips ANSI codes, backspaces and carriage-return redraws', () => {
    const raw = "(\x08( sudo xcode-select -s '/Applications/Xcode.app/Contents/D \r\x1b[Ke\reveloper' ) && printf __PD_x1 OK\x1b[?2004l\r\r\n[sudo] password for ke: "
    expect(cleanTerminalOutput(raw)).toBe('[sudo] password for ke: ')
  })
  it('applies carriage-return progress redraws', () => {
    expect(cleanTerminalOutput('Downloading 10%\rDownloading 55%\rDownloading 100%\ndone')).toBe('Downloading 100%\ndone')
  })
  it('keeps plain output unchanged', () => {
    expect(cleanTerminalOutput('line one\nline two')).toBe('line one\nline two')
  })
})
