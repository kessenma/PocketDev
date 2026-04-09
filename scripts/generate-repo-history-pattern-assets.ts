import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  REPO_HISTORY_PATTERN_PRESETS,
  buildRepoHistoryMaskSvg,
  buildRepoHistoryVisualSvg,
} from '../apps/web/src/components/architecture/sections/repo-history-pattern'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(scriptDir, '../apps/web/public/assets/architecture')
const dotColor = '#2D5FE5'

async function main() {
  await mkdir(outputDir, { recursive: true })

  await Promise.all(
    REPO_HISTORY_PATTERN_PRESETS.flatMap((preset) => [
      writeFile(
        path.join(outputDir, `repo-history-pattern-${preset.name}.svg`),
        buildRepoHistoryVisualSvg(preset, dotColor, true),
        'utf8',
      ),
      writeFile(
        path.join(outputDir, `repo-history-mask-${preset.name}.svg`),
        buildRepoHistoryMaskSvg(preset),
        'utf8',
      ),
    ]),
  )
}

await main()
