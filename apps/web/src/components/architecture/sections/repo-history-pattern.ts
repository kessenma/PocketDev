export type RepoHistoryPatternPreset = {
  name: 'mobile' | 'tablet' | 'desktop'
  width: number
  height: number
  rows: number
  maxCols: number
  minCols: number
  dotRadius: number
  rowGapTop: number
  rowGapBottom: number
  topTransitionBand: number
  topRowBoost: number
  secondRowBoost: number
}

export type RepoHistoryDot = {
  key: string
  x: number
  y: number
  radius: number
  row: number
}

export const REPO_HISTORY_PATTERN_PRESETS: RepoHistoryPatternPreset[] = [
  {
    name: 'mobile',
    width: 768,
    height: 1024,
    rows: 12,
    maxCols: 15,
    minCols: 7,
    dotRadius: 34,
    rowGapTop: 35,
    rowGapBottom: 110,
    topTransitionBand: 38,
    topRowBoost: 4,
    secondRowBoost: 2,
  },
  {
    name: 'tablet',
    width: 1024,
    height: 1024,
    rows: 11,
    maxCols: 18,
    minCols: 9,
    dotRadius: 30,
    rowGapTop: 34,
    rowGapBottom: 112,
    topTransitionBand: 34,
    topRowBoost: 5,
    secondRowBoost: 2,
  },
  {
    name: 'desktop',
    width: 1440,
    height: 960,
    rows: 11,
    maxCols: 21,
    minCols: 10,
    dotRadius: 40,
    rowGapTop: 36,
    rowGapBottom: 113,
    topTransitionBand: 43,
    topRowBoost: 6,
    secondRowBoost: 3,
  },
] as const

export function getRepoHistoryPatternPreset(viewportWidth: number): RepoHistoryPatternPreset {
  if (viewportWidth >= 1200) return REPO_HISTORY_PATTERN_PRESETS[2]
  if (viewportWidth >= 768) return REPO_HISTORY_PATTERN_PRESETS[1]
  return REPO_HISTORY_PATTERN_PRESETS[0]
}

export function buildRepoHistoryDots(preset: RepoHistoryPatternPreset): RepoHistoryDot[] {
  const dots: RepoHistoryDot[] = []
  const baseY = preset.topTransitionBand + preset.dotRadius * 0.34

  for (let row = 0; row < preset.rows; row++) {
    const rowT = row / (preset.rows - 1)
    const topRowBoost = row === 0 ? preset.topRowBoost : row === 1 ? preset.secondRowBoost : 0
    const colsForRow = Math.round(mix(preset.maxCols, preset.minCols, rowT ** 0.95)) + topRowBoost
    const usableWidth = preset.width + preset.dotRadius * (row < 3 ? 2.6 : 1.7)
    const spacing = usableWidth / Math.max(1, colsForRow - 1)
    const rowWidth = spacing * Math.max(0, colsForRow - 1)
    const originX = (preset.width - rowWidth) / 2
    const y = baseY + cumulativeGap(row, preset.rows, preset.rowGapTop, preset.rowGapBottom)

    for (let col = 0; col < colsForRow; col++) {
      const staggerOffset = row < 4 && row % 2 === 1 ? spacing * 0.5 : 0
      const x = originX + col * spacing + staggerOffset

      dots.push({
        key: `${row}-${col}`,
        x,
        y,
        radius: preset.dotRadius,
        row,
      })
    }
  }

  return dots
}

export function buildRepoHistoryVisualSvg(preset: RepoHistoryPatternPreset, dotColor: string, transparent = true) {
  const dots = buildRepoHistoryDots(preset)
  const topRowDots = dots.filter((dot) => dot.row === 0)
  const background = transparent ? 'transparent' : '#f7f1e3'
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${preset.width} ${preset.height}" preserveAspectRatio="xMidYMid slice">`,
    `<rect width="${preset.width}" height="${preset.height}" fill="${background}"/>`,
    `<rect x="0" y="0" width="${preset.width}" height="${preset.topTransitionBand}" fill="${dotColor}"/>`,
    ...topRowDots.map((dot) => `<path d="${bottomHalfCirclePath(dot.x, dot.radius, preset.topTransitionBand)}" fill="#f7f1e3"/>`),
    ...dots.map((dot) => `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.radius}" fill="${dotColor}"/>`),
    `</svg>`,
  ]

  return parts.join('')
}

export function buildRepoHistoryMaskSvg(preset: RepoHistoryPatternPreset) {
  const dots = buildRepoHistoryDots(preset)
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${preset.width} ${preset.height}" preserveAspectRatio="xMidYMid slice">`,
    ...dots.map((dot) => `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.radius}" fill="white"/>`),
    `</svg>`,
  ]

  return parts.join('')
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function cumulativeGap(row: number, rows: number, topGap: number, bottomGap: number) {
  let total = 0
  for (let index = 0; index < row; index++) {
    const t = rows <= 1 ? 0 : index / (rows - 1)
    total += mix(topGap, bottomGap, t ** 1.2)
  }
  return total
}

function bottomHalfCirclePath(cx: number, radius: number, y: number) {
  const left = cx - radius
  const right = cx + radius
  return [
    `M ${left} ${y}`,
    `A ${radius} ${radius} 0 0 0 ${right} ${y}`,
    `L ${left} ${y}`,
    'Z',
  ].join(' ')
}
