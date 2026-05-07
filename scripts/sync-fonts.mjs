import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, extname, join } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'packages/shared/assets/fonts')
const targets = [
  resolve(root, 'apps/web/public/fonts'),
  resolve(root, 'apps/agent/console/public/fonts'),
]

const FONT_EXTS = new Set(['.ttf', '.woff', '.woff2', '.otf'])

const fontFiles = readdirSync(src).filter((f) => FONT_EXTS.has(extname(f).toLowerCase()))

for (const dest of targets) {
  mkdirSync(dest, { recursive: true })
  for (const file of fontFiles) {
    copyFileSync(join(src, file), join(dest, file))
  }
  console.log(`✓ ${fontFiles.length} font files → ${dest.replace(root + '/', '')}`)
}
