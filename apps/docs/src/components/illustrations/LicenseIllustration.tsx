import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/** One source file: a cream sheet with a folded corner and a few code lines. */
function Sheet({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 30)`}>
      <polygon points="0,0 80,0 100,20 100,120 0,120" fill={cream} />
      <polygon points="80,0 80,20 100,20" fill={ALUMINIUM} />
      <rect x={14} y={30} width={44} height={6} rx={3} fill={blue} />
      <rect x={24} y={44} width={56} height={6} rx={3} fill={black} />
      <rect x={24} y={58} width={36} height={6} rx={3} fill={red} />
      <rect x={24} y={72} width={50} height={6} rx={3} fill={black} />
      <rect x={14} y={86} width={30} height={6} rx={3} fill={blue} />
    </g>
  )
}

/** A small app-store tile; `blocked` adds the red slash for the one restriction. */
function StoreTile({ x, blocked }: { x: number; blocked?: boolean }) {
  return (
    <g transform={`translate(${x} 128)`}>
      <rect x={-17} y={-17} width={34} height={34} rx={9} fill={blue} stroke={black} strokeWidth={3} />
      <path d="M0 -8 V7 M-6 -2 L0 -8 L6 -2" fill="none" stroke={cream} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {blocked && <line x1={-20} y1={20} x2={20} y2={-20} stroke={red} strokeWidth={5} strokeLinecap="round" />}
    </g>
  )
}

/**
 * Bauhaus-style illustration for the License page: the same source sheet
 * today (free to use, with the single app-store restriction slashed in red)
 * and two years on, when it converts to Apache 2.0 and the slash is gone.
 */
export function LicenseIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 180"
        role="img"
        aria-labelledby="license-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="license-illustration-title">
          A source file under FSL with one app-store restriction, becoming Apache 2.0 after two years
        </title>
        <style>{`
          .pd-lic-link { stroke-dasharray: 2 10; animation: pd-lic-flow 3.2s linear infinite; }
          .pd-lic-year { animation: pd-lic-glow 4.8s ease-in-out infinite; }
          .pd-lic-year-2 { animation-delay: 1.2s; }
          .pd-lic-sun { transform-box: fill-box; transform-origin: center; animation: pd-lic-breathe 6s ease-in-out infinite; }
          @keyframes pd-lic-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-lic-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
          @keyframes pd-lic-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
          @media (prefers-reduced-motion: reduce) { .pd-lic-link, .pd-lic-year, .pd-lic-sun { animation: none; } }
        `}</style>

        {/* Today: FSL — read, fork, run; just not the app stores */}
        <Sheet x={110} />
        <StoreTile x={214} blocked />

        {/* Two years, one dot per year */}
        <path className="pd-lic-link" d="M262 90 H438" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" />
        <circle className="pd-lic-year" cx={322} cy={90} r={7} fill={cream} />
        <circle className="pd-lic-year pd-lic-year-2" cx={378} cy={90} r={7} fill={cream} />
        <path d="M430 82 L440 90 L430 98" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Later: Apache 2.0 — same sheet, restriction gone, a sun behind it */}
        <circle className="pd-lic-sun" cx={578} cy={36} r={24} fill={yellow} />
        <Sheet x={470} />
        <StoreTile x={574} />

        {/* Ground */}
        <line x1={24} y1={160} x2={616} y2={160} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Yours to read, to fork, to run;
        <br />
        in two years, Apache for everyone.
      </figcaption>
    </figure>
  )
}
