import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/** One finder square of a QR code (outer black, cream ring, black centre). */
function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={22} height={22} rx={3} fill={black} />
      <rect x={x + 4} y={y + 4} width={14} height={14} rx={2} fill={cream} />
      <rect x={x + 7} y={y + 7} width={8} height={8} rx={1} fill={black} />
    </g>
  )
}

/**
 * Bauhaus-style illustration for the "Get Started" page: one install command
 * typed into a terminal on a Mac mini, a setup code (drawn as a QR square)
 * passed along, and a phone scanning it to pair, receiving its own key.
 */
export function GetStartedIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 260"
        role="img"
        aria-labelledby="get-started-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="get-started-illustration-title">
          An install command runs on a Mac mini, which shows a pairing code that a phone scans to pair
        </title>
        <style>{`
          .pd-start-link { stroke-dasharray: 2 10; animation: pd-start-flow 1.6s linear infinite; }
          .pd-start-cursor { animation: pd-start-blink 1.1s steps(1) infinite; }
          .pd-start-led { animation: pd-start-pulse 2.4s ease-in-out infinite; }
          .pd-start-scan { animation: pd-start-scan 2.6s ease-in-out infinite alternate; }
          .pd-start-key { animation: pd-start-bob 3.2s ease-in-out infinite; }
          @keyframes pd-start-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-start-blink { 0% { opacity: 1; } 50% { opacity: 0; } }
          @keyframes pd-start-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          @keyframes pd-start-scan { from { transform: translateY(0); } to { transform: translateY(26px); } }
          @keyframes pd-start-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          @media (prefers-reduced-motion: reduce) {
            .pd-start-link, .pd-start-cursor, .pd-start-led, .pd-start-scan, .pd-start-key { animation: none; }
          }
        `}</style>

        {/* Terminal with the one-line install command, speaking for the Mac mini below */}
        <g transform="translate(0 22)">
          <path d="M126 132 L136 148 L146 132" fill={black} stroke={GROUND} strokeWidth={2} strokeLinejoin="round" />
          <rect x={36} y={40} width={200} height={94} rx={10} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={124} y={131} width={24} height={4} fill={black} />
          <circle cx={52} cy={55} r={4} fill={red} />
          <circle cx={64} cy={55} r={4} fill={yellow} />
          <circle cx={76} cy={55} r={4} fill={blue} />
          <path d="M52 80 l8 6 l-8 6" fill="none" stroke={yellow} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={68} y={83} width={108} height={6} rx={3} fill={cream} />
          <rect className="pd-start-cursor" x={184} y={79} width={8} height={14} rx={1} fill={yellow} />
          <rect x={52} y={106} width={70} height={4} rx={2} fill="rgba(255,255,255,0.3)" />
          <rect x={52} y={116} width={118} height={4} rx={2} fill="rgba(255,255,255,0.18)" />
        </g>

        {/* Mac mini on the ground */}
        <rect x={86} y={186} width={100} height={34} rx={9} fill={ALUMINIUM} />
        <rect x={94} y={190} width={84} height={2.5} rx={1.25} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-start-led" cx={174} cy={206} r={2.6} fill={yellow} />

        {/* Link: Mac mini → setup code */}
        <path
          className="pd-start-link"
          d="M186 200 C 236 204, 250 160, 284 140"
          fill="none"
          stroke={yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={186} cy={200} r={4} fill={yellow} />
        <circle cx={284} cy={140} r={4} fill={yellow} />

        {/* Faint scan beam from the phone's camera to the code */}
        <polygon points="378,94 378,164 518,136 518,110" fill={cream} opacity={0.06} />

        {/* Setup code as a QR square */}
        <rect x={288} y={84} width={90} height={90} rx={8} fill={cream} />
        <Finder x={296} y={92} />
        <Finder x={348} y={92} />
        <Finder x={296} y={144} />
        <rect x={326} y={94} width={8} height={8} rx={1} fill={black} />
        <rect x={326} y={110} width={8} height={8} rx={1} fill={black} />
        <rect x={302} y={124} width={8} height={8} rx={1} fill={black} />
        <rect x={318} y={124} width={16} height={8} rx={1} fill={red} />
        <rect x={342} y={124} width={8} height={8} rx={1} fill={black} />
        <rect x={358} y={124} width={8} height={16} rx={1} fill={black} />
        <rect x={334} y={140} width={8} height={8} rx={1} fill={black} />
        <rect x={326} y={156} width={16} height={8} rx={1} fill={black} />
        <rect x={350} y={156} width={16} height={8} rx={1} fill={blue} />

        {/* Key handed to the phone once paired */}
        <g className="pd-start-key">
          <g transform="translate(544 56)">
            <circle cx={-12} cy={0} r={8} fill="none" stroke={yellow} strokeWidth={3.5} />
            <path d="M-4 0 H16 M10 0 V6 M15 0 V5" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" />
          </g>
        </g>

        {/* Phone scanning the code */}
        <g transform="translate(548 140)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          <path
            d="M-16 -28 V-34 H-10 M10 -34 H16 V-28 M16 -2 V4 H10 M-10 4 H-16 V-2"
            fill="none"
            stroke={yellow}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect className="pd-start-scan" x={-13} y={-28} width={26} height={2.5} rx={1.25} fill={red} />
          <rect x={-16} y={14} width={22} height={3} rx={1.5} fill="rgba(255,255,255,0.35)" />
          <rect x={-16} y={26} width={32} height={14} rx={4} fill={blue} />
        </g>

        {/* Ground */}
        <line x1={24} y1={220} x2={616} y2={220} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        One command to run, one code to scan —
        <br />
        and that&apos;s about the whole setup plan.
      </figcaption>
    </figure>
  )
}
