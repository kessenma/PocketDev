export function TechStack() {
  const layers = [
    {
      label: 'Mobile',
      items: ['React Native', 'Rock CLI + Re.Pack', 'Ed25519 (noble)', 'StyleSheet.create'],
    },
    {
      label: 'Agent Server',
      items: ['Bun runtime', 'Elysia', 'SQLite (bun:sqlite)', 'PTY via script(1)'],
    },
    {
      label: 'Web',
      items: ['TanStack Start', 'Vite', 'shadcn/ui', 'Tailwind CSS'],
    },
    {
      label: 'Shared',
      items: ['Zod schemas', 'TypeScript types', '@noble/ed25519', 'Drizzle ORM'],
    },
  ]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Tech Stack
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Every layer is TypeScript. Types, schemas, and crypto utilities are
          shared across mobile, agent, and web via a single monorepo package.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {layers.map((layer) => (
            <div key={layer.label}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {layer.label}
              </h3>
              <ul className="space-y-1.5">
                {layer.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-md bg-muted/40 px-3 py-1.5 text-xs text-foreground"
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
