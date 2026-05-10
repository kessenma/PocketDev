import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname, extname, join } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
// Reads the PostScript name (nameID 6) from a TTF/OTF file.
// Prefers platform 3 (Windows, UTF-16-BE), falls back to platform 1 (Mac, Latin-1).
function readPostScriptName(filePath) {
  const data = readFileSync(filePath)
  const numTables = data.readUInt16BE(4)
  let nameOffset = -1
  for (let i = 0; i < numTables; i++) {
    const base = 12 + i * 16
    if (data.slice(base, base + 4).toString('ascii') === 'name') {
      nameOffset = data.readUInt32BE(base + 8)
      break
    }
  }
  if (nameOffset === -1) return null
  const count = data.readUInt16BE(nameOffset + 2)
  const strOffset = data.readUInt16BE(nameOffset + 4)
  let macResult = null
  for (let i = 0; i < count; i++) {
    const base = nameOffset + 6 + i * 12
    const platform = data.readUInt16BE(base)
    const nameId   = data.readUInt16BE(base + 6)
    const length   = data.readUInt16BE(base + 8)
    const off      = data.readUInt16BE(base + 10)
    if (nameId !== 6) continue
    const raw = data.slice(nameOffset + strOffset + off, nameOffset + strOffset + off + length)
    if (platform === 3) {
      // UTF-16-BE: swap bytes so Node's utf16le decoder reads it correctly
      const buf = Buffer.from(raw)
      for (let j = 0; j < buf.length - 1; j += 2) {
        const tmp = buf[j]; buf[j] = buf[j + 1]; buf[j + 1] = tmp
      }
      return buf.toString('utf16le')
    }
    if (platform === 1) macResult = raw.toString('latin1')
  }
  return macResult
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'packages/shared/assets/fonts')
const targets = [
  resolve(root, 'apps/web/public/fonts'),
  resolve(root, 'apps/agent/console/public/fonts'),
  resolve(root, 'apps/mobile/assets/fonts'),
  resolve(root, 'apps/mobile/android/app/src/main/assets/fonts'),
  resolve(root, 'apps/docs/public/fonts'),
]

const FONT_EXTS = new Set(['.ttf', '.woff', '.woff2', '.otf'])
const fontFiles = readdirSync(src).filter((f) => FONT_EXTS.has(extname(f).toLowerCase()))
const ttfFiles = fontFiles.filter((f) => extname(f).toLowerCase() === '.ttf')

// ── Copy to all targets ───────────────────────────────────────────────────────
for (const dest of targets) {
  mkdirSync(dest, { recursive: true })
  for (const file of fontFiles) {
    copyFileSync(join(src, file), join(dest, file))
  }
  console.log(`✓ ${fontFiles.length} font files → ${dest.replace(root + '/', '')}`)
}

// ── iOS Xcode project sync ────────────────────────────────────────────────────

// Stable 24-char UUID derived from a seed — same font always gets the same UUID
function uuid(seed) {
  return createHash('sha256').update(seed).digest('hex').slice(0, 24).toUpperCase()
}

// Insert `text` immediately before the first occurrence of `marker`
function insertBefore(str, marker, text) {
  const idx = str.indexOf(marker)
  if (idx === -1) throw new Error(`Marker not found: "${marker}"`)
  return str.slice(0, idx) + text + str.slice(idx)
}

// Append `item` as the last entry in the `arrayKey = (...)` array owned by `anchorId`
function appendToArray(str, anchorId, arrayKey, item) {
  const anchorIdx = str.indexOf(anchorId)
  if (anchorIdx === -1) throw new Error(`Anchor not found: ${anchorId}`)
  const arrayIdx = str.indexOf(`${arrayKey} = (`, anchorIdx)
  if (arrayIdx === -1) throw new Error(`Array "${arrayKey}" not found near ${anchorId}`)
  const closeIdx = str.indexOf('\n\t\t\t);', arrayIdx)
  if (closeIdx === -1) throw new Error(`Closing ); not found for array "${arrayKey}"`)
  return str.slice(0, closeIdx) + `\n\t\t\t\t${item},` + str.slice(closeIdx)
}

// IDs for the specific group and build phase in this project
const RESOURCES_GROUP_ID = '957C0910D0B342D0BFA89C3A'
const RESOURCES_PHASE_ID = '13B07F8E1A680F5B00A75B9A'

const pbxprojPath = resolve(root, 'apps/mobile/ios/Mobile.xcodeproj/project.pbxproj')
const infoPlistPath = resolve(root, 'apps/mobile/ios/Mobile/Info.plist')

let pbxproj = readFileSync(pbxprojPath, 'utf8')
let added = 0

for (const file of fontFiles) {
  if (pbxproj.includes(`name = "${file}"`)) continue  // already registered

  const fileRefId = uuid(`fileref:${file}`)
  const buildFileId = uuid(`buildfile:${file}`)
  const fontPath = `../assets/fonts/${file}`

  pbxproj = insertBefore(
    pbxproj,
    '/* End PBXFileReference section */',
    `\t\t${fileRefId} /* ${file} */ = {isa = PBXFileReference; explicitFileType = undefined; fileEncoding = undefined; includeInIndex = 0; lastKnownFileType = unknown; name = "${file}"; path = "${fontPath}"; sourceTree = "<group>"; };\n`
  )

  pbxproj = insertBefore(
    pbxproj,
    '/* End PBXBuildFile section */',
    `\t\t${buildFileId} /* ${file} in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* ${file} */; };\n`
  )

  pbxproj = appendToArray(pbxproj, RESOURCES_GROUP_ID, 'children', `${fileRefId} /* ${file} */`)
  pbxproj = appendToArray(pbxproj, RESOURCES_PHASE_ID, 'files', `${buildFileId} /* ${file} in Resources */`)

  added++
}

if (added > 0) {
  writeFileSync(pbxprojPath, pbxproj)
  console.log(`✓ ${added} new font(s) added to Xcode project`)
} else {
  console.log('✓ Xcode project already up to date')
}

// ── fontFamilyTokens sync (spacing.ts) ───────────────────────────────────────
const rolesPath = resolve(src, 'font-roles.json')
const roles = JSON.parse(readFileSync(rolesPath, 'utf8'))
const spacingPath = resolve(root, 'packages/shared/src/theme/spacing.ts')
let spacing = readFileSync(spacingPath, 'utf8')
const tokenUpdates = []
for (const [token, filename] of Object.entries(roles)) {
  const fontPath = resolve(src, filename)
  const psName = readPostScriptName(fontPath)
  if (!psName) throw new Error(`Could not read PostScript name from ${filename}`)
  const before = spacing
  spacing = spacing.replace(
    new RegExp(`(${token}:\\s*)'[^']*'`),
    `$1'${psName}'`
  )
  if (spacing !== before) tokenUpdates.push(`${token}: ${psName}`)
}
writeFileSync(spacingPath, spacing)
if (tokenUpdates.length) {
  console.log(`✓ fontFamilyTokens updated (${tokenUpdates.join(', ')})`)
} else {
  console.log('✓ fontFamilyTokens already up to date')
}

// ── Info.plist UIAppFonts sync ────────────────────────────────────────────────
const fontEntries = ttfFiles.sort().map((f) => `\t\t<string>${f}</string>`).join('\n')
let plist = readFileSync(infoPlistPath, 'utf8')
plist = plist.replace(
  /<key>UIAppFonts<\/key>\s*<array>[\s\S]*?<\/array>/,
  `<key>UIAppFonts</key>\n\t<array>\n${fontEntries}\n\t</array>`
)
writeFileSync(infoPlistPath, plist)
console.log(`✓ Info.plist updated with ${ttfFiles.length} TTF font(s)`)
