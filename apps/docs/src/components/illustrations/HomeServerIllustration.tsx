import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/**
 * Bauhaus-style illustration for the "Running on a Home Server" page: a Mac
 * mini inside a house, with a private (dashed, padlocked) link out through the
 * wall to a phone. Same flat-primaries style as the landing-page SVGs.
 */
export function HomeServerIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 280"
        role="img"
        aria-labelledby="home-server-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="home-server-illustration-title">
          A Mac mini inside a house, connected to a phone outside by a private, encrypted link
        </title>
        <style>{`
          .pd-link { stroke-dasharray: 2 10; animation: pd-link-flow 1.6s linear infinite; }
          .pd-led { animation: pd-led-pulse 2.4s ease-in-out infinite; }
          @keyframes pd-link-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-led-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          @media (prefers-reduced-motion: reduce) { .pd-link, .pd-led { animation: none; } }
        `}</style>

        {/* Sun */}
        <circle cx={78} cy={70} r={26} fill={yellow} />

        {/* Chimney (behind the roof) */}
        <rect x={338} y={56} width={24} height={44} fill={yellow} />

        {/* House */}
        <rect x={170} y={122} width={220} height={118} fill={cream} />
        <polygon points="148,126 280,40 412,126" fill={red} />

        {/* Door: arch-topped, Bauhaus blue */}
        <path d="M190 240 V192 a20 20 0 0 1 40 0 V240 Z" fill={blue} />
        <circle cx={222} cy={214} r={3} fill={cream} />

        {/* Window looking in on the desk */}
        <rect x={250} y={146} width={122} height={80} rx={4} fill={black} />
        {/* Desk */}
        <rect x={262} y={201} width={98} height={6} fill={blue} />
        <rect x={270} y={207} width={5} height={19} fill={blue} />
        <rect x={347} y={207} width={5} height={19} fill={blue} />
        {/* Mac mini: low aluminium square with a status light */}
        <rect x={284} y={181} width={54} height={20} rx={6} fill={ALUMINIUM} />
        <rect x={290} y={184} width={42} height={2} rx={1} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-led" cx={330} cy={194} r={2.2} fill={yellow} />

        {/* Private link: from the Mac mini, through the wall, to the phone */}
        <path
          className="pd-link"
          d="M338 182 C 400 70, 470 52, 528 104"
          fill="none"
          stroke={yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={338} cy={182} r={4} fill={yellow} />
        <circle cx={528} cy={104} r={4} fill={yellow} />

        {/* Padlock on the link */}
        <g transform="translate(436 74)">
          <path d="M-6 -2 V-7 a6 6 0 0 1 12 0 V-2" fill="none" stroke={cream} strokeWidth={3} />
          <rect x={-10} y={-3} width={20} height={15} rx={3} fill={cream} />
          <circle cx={0} cy={4} r={2.2} fill={black} />
        </g>

        {/* Phone */}
        <g transform="translate(550 168)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          <rect x={-16} y={-32} width={24} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-16} y={-24} width={32} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
          <rect x={-16} y={-16} width={18} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          <rect x={-16} y={18} width={32} height={14} rx={4} fill={blue} />
        </g>

        {/* Ground */}
        <line x1={24} y1={240} x2={616} y2={240} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Your Mac stays put, your phone can roam —
        <br />
        a private path that leads it home.
      </figcaption>
    </figure>
  )
}
