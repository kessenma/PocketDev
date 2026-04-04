const { inferLanguage } = require('./model')

describe('inferLanguage', () => {
  it('detects common source and text-based file types', () => {
    expect(inferLanguage('app.py')).toBe('python')
    expect(inferLanguage('README.md')).toBe('markdown')
    expect(inferLanguage('lib.rs')).toBe('rust')
    expect(inferLanguage('config.json')).toBe('json')
    expect(inferLanguage('.gitignore')).toBe('text')
    expect(inferLanguage('Dockerfile')).toBe('text')
  })

  it('falls back to unknown for unsupported binary-like extensions', () => {
    expect(inferLanguage('photo.png')).toBe('unknown')
  })
})
