import type { CSSProperties } from 'react'
import { HeadContent, Scripts, Outlet, createRootRoute } from '@tanstack/react-router'
import { webFontStacks } from '@pocketdev/shared/theme'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PocketDev — Run your dev environment from your pocket' },
      { name: 'description', content: 'Mobile-first interface for controlling AI coding agents on remote servers. Install on any Linux VPS, pair your phone, control Claude/Codex from anywhere.' },
      { name: 'theme-color', content: '#0a0a0a' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  shellComponent: RootShell,
})

function RootComponent() {
  return <Outlet />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}})()`,
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
