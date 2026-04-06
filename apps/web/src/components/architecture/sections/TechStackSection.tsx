import { architectureTextStyles } from '../shared/theme'

export function TechStackSection() {
  const layers = [
    {
      label: 'Hosted Web',
      items: ['TanStack Start', 'Vite', 'Postgres', '@pocketdev/db'],
    },
    {
      label: 'Agent',
      items: ['Bun runtime', 'Elysia', 'SQLite + Drizzle', 'PTY + process orchestration'],
    },
    {
      label: 'Console',
      items: ['Vite + React 19', 'react-router-dom', 'xterm.js', 'shadcn/ui + Tailwind 4'],
    },
    {
      label: 'Mobile',
      items: ['React Native 0.83', 'Rock CLI + Re.Pack', 'Zustand', 'MMKV + Keychain'],
    },
    {
      label: 'Shared',
      items: ['Typed WS protocol', 'Zod schemas', 'Theme tokens', '@noble/ed25519'],
    },
    {
      label: 'Tooling',
      items: ['Claude / Codex / Copilot CLIs', 'ripgrep', 'git', 'local dev servers'],
    },
  ]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          <span style={architectureTextStyles.sectionEyebrow}>
            Tech Stack
          </span>
        </h2>
        <p className="mb-10 text-lg text-muted-foreground" style={architectureTextStyles.sectionLead}>
          The stack is intentionally split by responsibility. The public website,
          the self-hosted runtime, and the two clients each have their own
          runtime needs, but they stay aligned through shared TypeScript
          contracts in the monorepo.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {layers.map((layer) => (
            <div key={layer.label}>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" style={architectureTextStyles.sectionEyebrow}>
                {layer.label}
              </h3>
              <ul className="space-y-1.5">
                {layer.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-md border px-3 py-1.5 text-xs text-foreground"
                    style={architectureTextStyles.surface}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
