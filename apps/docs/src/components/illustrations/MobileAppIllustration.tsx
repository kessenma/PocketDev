import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const GROUND = '#7d7468'

/** Feature tiles around the phone: [x, y, fill] — the glyph is drawn per index below. */
const TILES: Array<[number, number, string]> = [
  [96, 66, yellow],
  [64, 140, blue],
  [96, 214, black],
  [544, 66, black],
  [576, 140, red],
  [544, 214, cream],
]

/**
 * Bauhaus-style illustration for the "Mobile App" page: the PocketDev phone
 * in the middle, with its features (tasks, files, diffs, terminal, containers,
 * ports) floating around it as tiles. Same flat-primaries style as
 * HomeServerIllustration.
 */
export function MobileAppIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 280"
        role="img"
        aria-labelledby="mobile-app-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="mobile-app-illustration-title">
          A phone running PocketDev, surrounded by tiles for tasks, files, diffs, terminal, containers and ports
        </title>
        <style>{`
          .pd-app-link { stroke-dasharray: 2 10; animation: pd-app-flow 1.6s linear infinite; }
          .pd-app-tile { animation: pd-app-float 4.8s ease-in-out infinite; }
          .pd-app-cursor { animation: pd-app-blink 1.2s steps(1) infinite; }
          @keyframes pd-app-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-app-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          @keyframes pd-app-blink { 50% { opacity: 0; } }
          @media (prefers-reduced-motion: reduce) { .pd-app-link, .pd-app-tile, .pd-app-cursor { animation: none; } }
        `}</style>

        {/* Links from each tile to the phone */}
        {TILES.map(([x, y]) => (
          <path
            key={`l${x}-${y}`}
            className="pd-app-link"
            d={x < 320 ? `M${x + 28} ${y} L 266 140` : `M${x - 28} ${y} L 374 140`}
            fill="none"
            stroke={yellow}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}

        {/* Phone: larger than usual, showing a task list */}
        <g transform="translate(320 140)">
          <rect x={-56} y={-110} width={112} height={220} rx={20} fill={black} stroke={GROUND} strokeWidth={2.5} />
          <rect x={-46} y={-92} width={92} height={186} rx={10} fill="rgba(255,255,255,0.08)" />
          <rect x={-16} y={-103} width={32} height={4} rx={2} fill="rgba(255,255,255,0.15)" />
          <rect x={-36} y={-80} width={44} height={5} rx={2.5} fill={cream} />
          {[-62, -30, 2].map((y, i) => (
            <g key={y}>
              <rect x={-36} y={y} width={72} height={24} rx={5} fill="rgba(255,255,255,0.1)" />
              <circle cx={-26} cy={y + 12} r={4} fill={[yellow, blue, red][i]} />
              <rect x={-16} y={y + 7} width={[40, 32, 44][i]} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
              <rect x={-16} y={y + 14} width={[24, 36, 20][i]} height={3} rx={1.5} fill="rgba(255,255,255,0.25)" />
            </g>
          ))}
          <rect x={-36} y={44} width={72} height={20} rx={5} fill={blue} />
          <path d="M0 48 V60 M-6 54 H6" stroke={cream} strokeWidth={3} strokeLinecap="round" />
          <rect x={-36} y={78} width={72} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
        </g>

        {/* Feature tiles */}
        {TILES.map(([x, y, fill], i) => (
          <g key={`t${x}-${y}`} transform={`translate(${x} ${y})`}>
            <g className="pd-app-tile" style={{ animationDelay: `${i * 0.8}s` }}>
              <rect x={-26} y={-26} width={52} height={52} rx={12} fill={fill} stroke={fill === black ? GROUND : 'none'} strokeWidth={2} />
              {i === 0 && (
                <>
                  <rect x={-14} y={-12} width={28} height={18} rx={4} fill={black} />
                  <polygon points="-8,6 -8,14 0,6" fill={black} />
                </>
              )}
              {i === 1 && <path d="M-16 -10 h11 l4 5 h17 v17 h-32 Z" fill={cream} />}
              {i === 2 && (
                <>
                  <path d="M-12 -8 h8 M-8 -12 v8" stroke={blue} strokeWidth={3.5} strokeLinecap="round" />
                  <rect x={0} y={-10} width={14} height={4} rx={2} fill={blue} />
                  <path d="M-12 8 h8" stroke={red} strokeWidth={3.5} strokeLinecap="round" />
                  <rect x={0} y={6} width={14} height={4} rx={2} fill={red} />
                </>
              )}
              {i === 3 && (
                <>
                  <path d="M-14 -8 l8 8 l-8 8" fill="none" stroke={yellow} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                  <rect className="pd-app-cursor" x={0} y={6} width={14} height={4} rx={2} fill={yellow} />
                </>
              )}
              {i === 4 && [-12, -2, 8].map((dy) => <rect key={dy} x={-14} y={dy} width={28} height={7} rx={2} fill={cream} />)}
              {i === 5 && (
                <>
                  <circle cx={0} cy={0} r={13} fill="none" stroke={blue} strokeWidth={4} />
                  <circle cx={0} cy={0} r={4} fill={black} />
                </>
              )}
            </g>
          </g>
        ))}

        {/* Ground */}
        <line x1={150} y1={264} x2={490} y2={264} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Tasks, files and terminal, all in one place —
        <br />
        your server, at home in a pocket-sized space.
      </figcaption>
    </figure>
  )
}
