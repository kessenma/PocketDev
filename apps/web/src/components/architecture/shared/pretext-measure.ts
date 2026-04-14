import { measureNaturalWidth, prepareWithSegments, layoutWithLines, layoutNextLine } from '@chenglou/pretext'

// Resolve CSS custom properties in a font string to their computed values,
// since Canvas doesn't evaluate var(--token) notation.
function resolveCssFont(font: string): string {
  if (typeof document === 'undefined') {
    return font.replace(/var\([^)]+\)/g, 'sans-serif')
  }
  try {
    const style = getComputedStyle(document.documentElement)
    return font.replace(/var\(([^,)]+)(?:,[^)]+)?\)/g, (_match, varName) => {
      const value = style.getPropertyValue(varName.trim()).trim()
      return value || 'sans-serif'
    })
  } catch {
    return font.replace(/var\([^)]+\)/g, 'sans-serif')
  }
}

function canUseDom(): boolean {
  return typeof document !== 'undefined'
}

/**
 * Returns the natural (unwrapped) pixel width of a text string using Canvas measurement.
 * `font` must be a CSS font shorthand: e.g. "16px Inter" or "500 20px var(--font-sans), sans-serif".
 * Returns 0 when called during SSR.
 */
export function measureTextWidth(text: string, font: string): number {
  if (!text || !canUseDom()) return 0
  const prepared = prepareWithSegments(text, resolveCssFont(font))
  return measureNaturalWidth(prepared)
}

/**
 * Wraps `text` to fit within `maxWidth` pixels and returns the resulting lines.
 * `font` must be a CSS font shorthand: e.g. "16px Inter" or "500 20px var(--font-sans), sans-serif".
 * `lineHeight` is used by pretext's internal layout engine.
 * Falls back to a single-element array during SSR.
 */
export type TextSegment = { text: string; x: number; y: number; angle: number }

/**
 * Lays out `text` so it flows around an animated elliptical obstacle, returning
 * an array of positioned segments ready to render as individual SVG <text> elements.
 *
 * For each row the function checks how much horizontal space the ellipse occupies
 * at that baseline y (using the ellipse equation). Rows that fully clear the
 * ellipse get the full available width; rows that intersect it are split into a
 * left segment and a right segment at the same y.
 *
 * Animate `ellipse.ry` from 0 → full height to make text live-reflow as the
 * ellipse grows into the layout.
 */
export function layoutTextAroundEllipse({
  text,
  font,
  startX,
  endX,
  startY,
  lineHeight,
  ellipse,
  padding = 0,
}: {
  text: string
  font: string
  startX: number
  endX: number
  startY: number
  lineHeight: number
  ellipse: { cx: number; cy: number; rx: number; ry: number }
  padding?: number
}): TextSegment[] {
  if (!text || !canUseDom()) return [{ text, x: startX, y: startY, angle: 0 }]

  const prepared = prepareWithSegments(text, resolveCssFont(font))
  const segments: TextSegment[] = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = startY
  // minimum column width — don't squeeze text into a sliver narrower than one em
  const minWidth = lineHeight * 0.8

  for (let safetyLimit = 0; safetyLimit < 40; safetyLimit++) {
    const distY = Math.abs(y - ellipse.cy)
    const inEllipse = ellipse.ry > 1 && distY <= ellipse.ry

    if (!inEllipse) {
      // ── Full width row ──────────────────────────────────────────────────
      const line = layoutNextLine(prepared, cursor, endX - startX)
      if (!line || !line.text) break
      segments.push({ text: line.text, x: startX, y, angle: 0 })
      cursor = line.end
    } else {
      // ── Row intersects the ellipse — split into left + right columns ───
      const excHalfW = ellipse.rx * Math.sqrt(Math.max(0, 1 - (distY / ellipse.ry) ** 2))
      const excLeft = ellipse.cx - excHalfW - padding
      const excRight = ellipse.cx + excHalfW + padding
      const leftWidth = Math.max(0, excLeft - startX)
      const rightWidth = Math.max(0, endX - excRight)

      // If the ellipse is so wide that neither column has room, skip this row
      // without advancing the text cursor so the text picks up at the next y.
      if (leftWidth < minWidth && rightWidth < minWidth) {
        y += lineHeight
        continue
      }

      if (leftWidth >= minWidth) {
        const line = layoutNextLine(prepared, cursor, leftWidth)
        if (!line || !line.text) break
        segments.push({ text: line.text, x: startX, y, angle: 0 })
        cursor = line.end
      }

      if (rightWidth >= minWidth) {
        const line = layoutNextLine(prepared, cursor, rightWidth)
        if (line?.text) {
          segments.push({ text: line.text, x: excRight, y, angle: 0 })
          cursor = line.end
        }
      }
    }

    y += lineHeight
  }

  return segments
}

/**
 * Lays out `text` so each line *rides* one of the ellipse's contours rather than
 * being split into left/right columns:
 *
 *  • Lines whose baseline falls in the **upper half** of the ellipse are trimmed on
 *    the right — their available width ends at the ellipse's left edge.  The line
 *    hugs the upper-left eyelid as the ellipse grows.
 *  • Lines whose baseline falls in the **lower half** are offset on the left — they
 *    start at the ellipse's right edge.  The line hugs the lower-right eyelid.
 *  • Lines that are too narrow to fit even a single word on their assigned side are
 *    skipped (the eye "eats" them) without losing the cursor position, so text
 *    picks up cleanly once the ellipse narrows again.
 *
 * Animate `ellipse.ry` from 0 → full height to drive the live text warp.
 */
export function layoutTextRidingEllipse({
  text,
  font,
  startX,
  endX,
  startY,
  lineHeight,
  ellipse,
  padding = 0,
}: {
  text: string
  font: string
  startX: number
  endX: number
  startY: number
  lineHeight: number
  ellipse: { cx: number; cy: number; rx: number; ry: number }
  padding?: number
}): TextSegment[] {
  if (!text || !canUseDom()) return [{ text, x: startX, y: startY, angle: 0 }]

  const prepared = prepareWithSegments(text, resolveCssFont(font))
  const segments: TextSegment[] = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = startY
  const minWidth = lineHeight * 0.6

  for (let safetyLimit = 0; safetyLimit < 40; safetyLimit++) {
    const distY = Math.abs(y - ellipse.cy)
    const inEllipse = ellipse.ry > 1 && distY <= ellipse.ry

    if (!inEllipse) {
      // ── Full-width row ────────────────────────────────────────────────────
      const line = layoutNextLine(prepared, cursor, endX - startX)
      if (!line || !line.text) break
      segments.push({ text: line.text, x: startX, y, angle: 0 })
      cursor = line.end
    } else {
      const excHalfW = ellipse.rx * Math.sqrt(Math.max(0, 1 - (distY / ellipse.ry) ** 2))
      const excLeft  = ellipse.cx - excHalfW - padding
      const excRight = ellipse.cx + excHalfW + padding
      const isUpperHalf = y <= ellipse.cy

      // Compute the tangent angle that text flowing left-to-right makes when riding
      // the eye's contour at this y-level.
      //
      // Upper-half lines end at the LEFT intersection of the upper arc.  The
      // left-side parametric position satisfies sin(t_left) = (y-cy)/ry and
      // cos(t_left) < 0.  The tangent there is (-rx·sin, ry·cos) = (-rx·sinY, -ry·cosY)
      // (rightward + upward in SVG) — the angle is negative (above horizontal).
      //
      // Lower-half lines start at the RIGHT intersection of the lower arc.  The
      // parametric tangent is leftward-downward, but text travels rightward, so we
      // flip: (rx·sinY, -ry·cosY) — also rightward + upward, also a negative angle.
      //
      // Both cases collapse to:  angle = atan2(−ry·cosY,  ±rx·|sinY|)
      // where the sign on rx·sinY differs but |sinY| is the same, giving the same
      // magnitude and both in (−π/2, 0).
      const signedSinY = Math.max(-1, Math.min(1, (y - ellipse.cy) / ellipse.ry))
      const cosY = Math.sqrt(Math.max(0, 1 - signedSinY * signedSinY))
      const angle = isUpperHalf
        ? Math.atan2(-ellipse.ry * cosY, -ellipse.rx * signedSinY)  // sinY < 0 → x > 0
        : Math.atan2(-ellipse.ry * cosY, ellipse.rx * signedSinY)   // sinY > 0 → x > 0

      if (isUpperHalf) {
        // Upper eyelid side: line ends before the ellipse's left edge, tilted with upper lid
        const width = excLeft - startX
        if (width < minWidth) { y += lineHeight; continue }
        const line = layoutNextLine(prepared, cursor, width)
        if (!line || !line.text) break
        segments.push({ text: line.text, x: startX, y, angle })
        cursor = line.end
      } else {
        // Lower eyelid side: line starts after the ellipse's right edge, tilted with lower lid
        const width = endX - excRight
        if (width < minWidth) { y += lineHeight; continue }
        const line = layoutNextLine(prepared, cursor, width)
        if (!line || !line.text) break
        segments.push({ text: line.text, x: excRight, y, angle })
        cursor = line.end
      }
    }

    y += lineHeight
  }

  return segments
}

export function wrapTextToLines(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): string[] {
  if (!text) return []
  if (!canUseDom()) return [text]
  const prepared = prepareWithSegments(text, resolveCssFont(font))
  const { lines } = layoutWithLines(prepared, maxWidth, lineHeight)
  return lines.map((l) => l.text)
}
