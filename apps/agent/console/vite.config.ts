import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/PocketDev/',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '#': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/PocketDev/ws/console/terminal': {
        target: 'http://localhost:4387',
        ws: true,
      },
      '/PocketDev/api': {
        target: 'http://localhost:4387',
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
