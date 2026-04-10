import { useState } from 'react'
import { docsTokens } from '#/components/docs/theme'

const INSTALL_CMD = 'curl -fsSL https://pocketdev.run/install.sh | bash'

export function InstallCommand() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(INSTALL_CMD)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="install" className="flex flex-col items-center px-6 py-8">
      <div
        className="flex w-full max-w-xl items-center gap-2 rounded-lg border p-3 font-mono text-sm"
        style={{
          backgroundColor: docsTokens.colors.surfaceHover,
          borderColor: docsTokens.colors.border,
        }}
      >
        <span style={{ color: docsTokens.colors.textTertiary }} className="select-none">$</span>
        <code className="flex-1 overflow-x-auto" style={{ color: docsTokens.colors.text }}>
          {INSTALL_CMD}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md p-1.5 transition-colors hover:opacity-80"
          style={{ color: docsTokens.colors.textTertiary }}
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          )}
        </button>
      </div>
    </section>
  )
}
