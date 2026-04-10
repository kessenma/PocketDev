import { useState, type CSSProperties } from 'react'
import { HeadContent, Scripts, Outlet, createRootRoute } from '@tanstack/react-router'
import { webFontStacks } from '@pocketdev/shared/theme'
import { DocsHeader } from '#/components/docs/DocsHeader'
import { DocsSidebar } from '#/components/docs/DocsSidebar'
import { docsTokens } from '#/components/docs/theme'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PocketDev Docs' },
      { name: 'description', content: 'Documentation for PocketDev — mobile-first interface for controlling AI coding agents on remote servers.' },
      { name: 'theme-color', content: '#12100d' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  shellComponent: RootShell,
})

function RootComponent() {
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

function RootShell({ children }: { children: React.ReactNode }) {
  const fontVars = {
    '--font-sans': webFontStacks.body,
    '--font-display': webFontStacks.display,
    '--font-heading': webFontStacks.display,
    '--font-mono': webFontStacks.mono,
  } as CSSProperties

  return (
    <html lang="en" className="dark" style={fontVars}>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
