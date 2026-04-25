import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { palette } from '@pocketdev/shared/theme'
import { architectureTokens, architectureFonts, architectureTheme } from '#/components/architecture/shared/theme'
import { BauhausPhone } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausPhone'
import { BauhausFace } from '#/components/architecture/sections/HowPocketDevWorks/shared/BauhausFace'

const { blue, red, yellow, black } = palette.bauhaus

// ─── Spark animation (Panel 1) ───────────────────────────────────────────────

const RAYS = [
  { x1: 80, y1: 14, x2: 80,   y2: 8  },
  { x1: 84, y1: 16, x2: 88,   y2: 10 },
  { x1: 76, y1: 16, x2: 72,   y2: 10 },
  { x1: 87, y1: 22, x2: 92,   y2: 20 },
  { x1: 73, y1: 22, x2: 68,   y2: 20 },
]

function SparkRays() {
  return (
    <g>
      {/* Static dim guide lines */}
      {RAYS.map((r, i) => (
        <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke={yellow} strokeWidth="1.5" opacity="0.18" strokeLinecap="round" />
      ))}
      {/* Traveling spark dots — shoot outward along each ray */}
      {RAYS.map((r, i) => (
        <motion.circle
          key={i}
          r={1.5}
          fill={yellow}
          animate={{ cx: [r.x1, r.x2], cy: [r.y1, r.y2], opacity: [1, 0] }}
          transition={{ duration: 0.52, repeat: Infinity, delay: i * 0.11, ease: 'easeOut', repeatDelay: 0.5 }}
        />
      ))}
    </g>
  )
}

// ─── Bug (Panel 2) ───────────────────────────────────────────────────────────

// Lucide Bug paths in 24×24 space. strokeWidth is passed pre-scaled so the
// visual thickness stays constant regardless of the parent scale transform.
function BugPaths({ color, sw }: { color: string; sw: number }) {
  const p = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <>
      {/* Static: body spine, body, head */}
      <path d="M12 20v-9" {...p} />
      <path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" {...p} />
      <path d="M9 7.13V6a3 3 0 1 1 6 0v1.13" {...p} />
      {/* Antennae */}
      <path d="M14.12 3.88 16 2" {...p} />
      <path d="m8 2 1.88 1.88" {...p} />
      {/* Right legs — oscillate forward */}
      <motion.g
        animate={{ rotate: [-13, 13] }}
        transition={{ duration: 0.18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      >
        <path d="M22 13h-4" {...p} />
        <path d="M21 5a4 4 0 0 1-3.55 3.97" {...p} />
        <path d="M21 21a4 4 0 0 0-3.81-4" {...p} />
      </motion.g>
      {/* Left legs — oscillate opposite phase */}
      <motion.g
        animate={{ rotate: [13, -13] }}
        transition={{ duration: 0.18, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      >
        <path d="M6 13H2" {...p} />
        <path d="M3 5a4 4 0 0 0 3.55 3.97" {...p} />
        <path d="M3 21a4 4 0 0 1 3.81-4" {...p} />
      </motion.g>
    </>
  )
}

function CrawlingBug({
  xs, ys, times, duration, delay = 0, color, size = 9, repeatType = 'loop',
}: {
  xs: number[]
  ys: number[]
  times?: number[]
  duration: number
  delay?: number
  color: string
  size?: number
  repeatType?: 'loop' | 'reverse'
}) {
  const s = size / 24
  const t = times ?? xs.map((_, i) => i / Math.max(1, xs.length - 1))
  return (
    <motion.g
      animate={{ x: xs, y: ys }}
      transition={{ duration, repeat: Infinity, repeatType, ease: 'linear', delay, times: t }}
    >
      {/* Slight body rock to sell the crawl */}
      <motion.g
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '0px 0px' }}
      >
        <g transform={`translate(${-size / 2} ${-size / 2}) scale(${s})`}>
          <BugPaths color={color} sw={2 / s} />
        </g>
      </motion.g>
    </motion.g>
  )
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export function WhoIsItForView({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ zIndex: 20 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-3xl rounded-2xl px-8 py-8"
        style={{
          backgroundColor: architectureTheme.background,
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '-120%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '-120%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/8"
          aria-label="Close"
        >
          <X size={16} style={{ color: black }} />
        </button>

        <p
          className="mb-1 text-xs uppercase tracking-widest"
          style={{ color: architectureTokens.colors.textSecondary, fontFamily: 'var(--font-mono), monospace' }}
        >
          Use cases
        </p>
        <h2
          className="mb-6 text-2xl font-bold"
          style={{ color: architectureTokens.colors.text, fontFamily: architectureFonts.display, letterSpacing: '-0.03em' }}
        >
          Who uses PocketDev?
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DevOnTheGoPanel />
          <LinuxAdminPanel />
        </div>
      </motion.div>
    </div>
  )
}

// ─── Panel 1: Developer on the go ────────────────────────────────────────────

function DevOnTheGoPanel() {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: architectureTokens.colors.border }}>
      <svg viewBox="0 0 160 120" width="100%" height="120" aria-hidden="true">
        <BauhausPhone cx={32} cy={60} scale={0.55} />

        {/* Arc: phone → terminal */}
        <path d="M 60 60 Q 80 28 100 54" fill="none" stroke={blue} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        <path d="M 60 62 Q 80 30 100 56" fill="none" stroke={blue} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.35" />

        {/* Idea spark: pulsing triangle + animated rays */}
        <motion.polygon
          points="80,18 75,28 85,28"
          fill={yellow}
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
        <SparkRays />

        {/* Terminal window: VPS session */}
        <rect x="100" y="30" width="50" height="46" rx="4" fill={black} />
        <rect x="100" y="30" width="50" height="10" rx="4" fill="rgba(255,255,255,0.08)" />
        <circle cx="107" cy="35" r="2" fill={red} opacity="0.8" />
        <circle cx="113" cy="35" r="2" fill={yellow} opacity="0.8" />
        <circle cx="119" cy="35" r="2" fill={blue} opacity="0.8" />
        <rect x="105" y="46" width="22" height="2.5" rx="1" fill="rgba(80,255,100,0.7)" />
        <rect x="105" y="52" width="15" height="2.5" rx="1" fill="rgba(80,255,100,0.5)" />
        <rect x="105" y="58" width="18" height="2.5" rx="1" fill="rgba(80,255,100,0.4)" />
        <rect x="105" y="65" width="5" height="7" rx="1" fill="rgba(80,255,100,0.9)" />

        <text x="32" y="100" textAnchor="middle" fontSize="8" fill={architectureTokens.colors.textSecondary} fontFamily="var(--font-mono),monospace">phone</text>
        <text x="125" y="86" textAnchor="middle" fontSize="8" fill={architectureTokens.colors.textSecondary} fontFamily="var(--font-mono),monospace">vps</text>
      </svg>

      <h3 className="mt-3 text-sm font-bold" style={{ color: architectureTokens.colors.text, fontFamily: architectureFonts.display }}>
        Developer on the go
      </h3>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: architectureTokens.colors.textSecondary }}>
        Idea hits. Grab your phone. Code on any cheap Linux server — no laptop needed.
      </p>
    </div>
  )
}

// ─── Panel 2: Linux admin debugger ───────────────────────────────────────────

function LinuxAdminPanel() {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: architectureTokens.colors.border }}>
      {/* Wider viewBox to give BauhausFace room at scale=1.2 */}
      <svg viewBox="0 0 200 148" width="100%" height="148" aria-hidden="true">

        {/* Terminal: broken server — top-centre */}
        <rect x="48" y="6" width="62" height="52" rx="4" fill={black} />
        <rect x="48" y="6" width="62" height="10" rx="4" fill="rgba(255,255,255,0.08)" />
        <circle cx="55" cy="11" r="2" fill={red} opacity="0.9" />
        <circle cx="61" cy="11" r="2" fill="rgba(255,255,255,0.2)" />
        <circle cx="67" cy="11" r="2" fill="rgba(255,255,255,0.2)" />
        <rect x="53" y="22" width="26" height="2.5" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="53" y="28" width="44" height="2.5" rx="1" fill="rgba(255,80,80,0.9)" />
        <rect x="53" y="34" width="20" height="2.5" rx="1" fill="rgba(255,255,255,0.3)" />
        {/* Red warning badge */}
        <rect x="90" y="46" width="12" height="10" rx="2" fill={red} />
        <rect x="95" y="48" width="2" height="4" rx="1" fill="rgba(255,255,255,0.95)" />
        <circle cx="96" cy="55" r="1" fill="rgba(255,255,255,0.95)" />

        {/* Bugs crawling around the broken terminal */}
        <g opacity={0.82}>
          {/* Bug 1: across the top edge */}
          <CrawlingBug
            xs={[51, 107, 51]} ys={[3, 3, 3]}
            times={[0, 0.5, 1]}
            duration={3.5}
            color={red}
            size={8}
          />
          {/* Bug 2: down and up the right edge */}
          <CrawlingBug
            xs={[112, 112]} ys={[10, 56]}
            duration={2.5}
            delay={1.3}
            repeatType="reverse"
            color={red}
            size={8}
          />
        </g>

        {/* Phone — bottom-left */}
        <BauhausPhone cx={26} cy={108} scale={0.50}>
          <rect x={-16} y={-33} width={24} height={2.5} rx={1} fill="rgba(80,255,100,0.6)" />
          <rect x={-16} y={-25} width={32} height={2.5} rx={1} fill="rgba(80,255,100,0.4)" />
          <rect x={-16} y={-17} width={18} height={2.5} rx={1} fill="rgba(80,255,100,0.5)" />
          <rect x={-16} y={-9}  width={28} height={2.5} rx={1} fill="rgba(80,255,100,0.3)" />
        </BauhausPhone>

        {/* BauhausFace / Claude — right, larger */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BauhausFace cx={162} cy={82} scale={1.2} fillColor={black} />
        </motion.g>

        {/* Arc 1: phone → server (blue, inquiry) */}
        <path d="M 26 82 Q 40 44 48 38" fill="none" stroke={blue} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        <path d="M 27 83 Q 41 45 49 39" fill="none" stroke={blue} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.35" />

        {/* Arc 2: server → Claude (yellow, AI analysis) */}
        <path d="M 110 32 Q 132 26 142 70" fill="none" stroke={yellow} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        <path d="M 111 33 Q 133 27 143 71" fill="none" stroke={yellow} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.35" />

        <text x="26" y="134" textAnchor="middle" fontSize="8" fill={architectureTokens.colors.textSecondary} fontFamily="var(--font-mono),monospace">phone</text>
        <text x="79" y="68" textAnchor="middle" fontSize="8" fill={architectureTokens.colors.textSecondary} fontFamily="var(--font-mono),monospace">server</text>
        <text x="162" y="114" textAnchor="middle" fontSize="8" fill={architectureTokens.colors.textSecondary} fontFamily="var(--font-mono),monospace">claude</text>
      </svg>

      <h3 className="mt-3 text-sm font-bold" style={{ color: architectureTokens.colors.text, fontFamily: architectureFonts.display }}>
        Linux admin debugger
      </h3>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: architectureTokens.colors.textSecondary }}>
        Port breaks at 2am. Open PocketDev, ask Claude what's wrong, get a fix — without touching a laptop.
      </p>
    </div>
  )
}
