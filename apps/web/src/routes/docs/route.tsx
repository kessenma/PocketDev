import { useState } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DocsHeader } from '#/components/docs/DocsHeader'
import { DocsSidebar } from '#/components/docs/DocsSidebar'
import { docsTokens } from '#/components/docs/theme'

export const Route = createFileRoute('/docs')({
  component: DocsLayout,
})

function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: docsTokens.colors.background }}
    >
      <DocsHeader onMenuToggle={() => setSidebarOpen((o) => !o)} />

      <div className="mx-auto max-w-6xl flex">
        <DocsSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 px-6 py-12 lg:px-12">
          <article className="prose">
            <Outlet />
          </article>
        </main>
      </div>
    </div>
  )
}
