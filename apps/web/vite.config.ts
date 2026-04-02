import { defineConfig, type Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function devMiddleware(): Plugin {
  return {
    name: 'dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Request logging — skip Vite internals and static assets
        if (req.url && !req.url.startsWith('/@') && !req.url.startsWith('/node_modules') && !req.url.startsWith('/src/') && !req.url.includes('?v=')) {
          let logUrl = req.url
          if (logUrl.startsWith('/_serverFn/')) {
            try {
              const decoded = JSON.parse(atob(logUrl.slice('/_serverFn/'.length).replace(/-/g, '+').replace(/_/g, '/')))
              logUrl = `/_serverFn/${decoded.export?.split('_')[0] || decoded.export || logUrl}`
            } catch {}
          }
          console.log(`[${req.method}] ${logUrl}`)
        }

        // Serve install script
        if (req.url === '/install.sh') {
          const { handleInstallScript } = await server.ssrLoadModule('./src/server/install-script.ts')
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
          }
          const request = new Request(`http://localhost${req.url}`, { headers })
          const response: Response = await handleInstallScript(request)
          res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
          res.end(await response.text())
          return
        }

        next()
      })
    },
  }
}

const config = defineConfig({
  envDir: '../../',
  server: {
    watch: {
      ignored: ['**/routeTree.gen.ts'],
    },
  },
  ssr: {
    resolve: {
      conditions: ['bun'],
    },
  },
  plugins: [
    devMiddleware(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
