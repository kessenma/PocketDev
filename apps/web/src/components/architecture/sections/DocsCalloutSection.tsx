import { architectureFonts, architectureTokens } from '../shared/theme'
import { palette } from '@pocketdev/shared/theme'

export function DocsCalloutSection() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-20 text-center">
      <p
        className="text-sm uppercase tracking-widest"
        style={{ color: architectureTokens.colors.textSecondary, fontFamily: architectureFonts.mono }}
      >
        Want the full picture?
      </p>
      <h2
        className="text-3xl font-bold tracking-tight sm:text-4xl"
        style={{ fontFamily: architectureFonts.display, letterSpacing: '-0.03em', color: architectureTokens.colors.text }}
      >
        Read the docs
      </h2>
      <p className="max-w-md text-base" style={{ color: architectureTokens.colors.textSecondary }}>
        Deep-dives on the wire protocol, security model, agent endpoints, and more.
        PocketDev is free to self-host — the source code is on GitHub.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://docs.pocketdev.run/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: palette.bauhaus.black, color: palette.bauhaus.cream }}
        >
          Learn more in the docs
        </a>
        <a
          href="https://github.com/kessenma/PocketDev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: architectureTokens.colors.text, border: `1px solid ${architectureTokens.colors.border}` }}
        >
          View on GitHub
        </a>
      </div>
    </div>
  )
}
