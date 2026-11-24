import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/**
 * Bauhaus-style illustration for the "Shipping iOS Apps" page: a task sent
 * from a phone to a Mac mini at home, which passes a signed build on to an
 * app tile with an upload arrow. Same flat-primaries style as
 * HomeServerIllustration.
 */
export function ShipIosIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 260"
        role="img"
        aria-labelledby="ship-ios-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="ship-ios-illustration-title">
          A phone sends a task to a Mac mini, which uploads a signed app build
        </title>
        <style>{`
          .pd-ship-link { stroke-dasharray: 2 10; animation: pd-ship-flow 1.6s linear infinite; }
          .pd-ship-led { animation: pd-ship-pulse 2.4s ease-in-out infinite; }
          @keyframes pd-ship-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-ship-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          @media (prefers-reduced-motion: reduce) { .pd-ship-link, .pd-ship-led { animation: none; } }
        `}</style>

        {/* Phone with a task bubble */}
        <g transform="translate(96 132)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          {/* task bubble */}
          <rect x={-18} y={-34} width={36} height={22} rx={5} fill={yellow} />
          <rect x={-12} y={-28} width={24} height={3} rx={1.5} fill={black} />
          <rect x={-12} y={-21} width={16} height={3} rx={1.5} fill={black} />
          <rect x={-16} y={-2} width={26} height={3} rx={1.5} fill="rgba(255,255,255,0.35)" />
          <rect x={-16} y={6} width={18} height={3} rx={1.5} fill="rgba(255,255,255,0.25)" />
          <rect x={-16} y={24} width={32} height={14} rx={4} fill={blue} />
        </g>

        {/* Link: phone → Mac mini */}
        <path
          className="pd-ship-link"
          d="M128 100 C 180 40, 250 60, 274 156"
          fill="none"
          stroke={yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={128} cy={100} r={4} fill={yellow} />
        <circle cx={274} cy={156} r={4} fill={yellow} />

        {/* Desk + Mac mini */}
        <rect x={236} y={186} width={128} height={7} fill={blue} />
        <rect x={246} y={193} width={6} height={27} fill={blue} />
        <rect x={348} y={193} width={6} height={27} fill={blue} />
        <rect x={262} y={158} width={76} height={28} rx={8} fill={ALUMINIUM} />
        <rect x={270} y={162} width={60} height={2.5} rx={1.25} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-ship-led" cx={328} cy={176} r={2.6} fill={yellow} />

        {/* "Signed" stamp above the Mac */}
        <circle cx={300} cy={128} r={14} fill={red} />
        <path d="M293 128 l5 5 l9 -10" fill="none" stroke={cream} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* Link: Mac mini → app tile */}
        <path
          className="pd-ship-link"
          d="M338 160 C 400 150, 440 110, 486 92"
          fill="none"
          stroke={yellow}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={338} cy={160} r={4} fill={yellow} />

        {/* App tile with an upload arrow */}
        <g transform="translate(530 92)">
          <rect x={-40} y={-40} width={80} height={80} rx={18} fill={blue} />
          <path d="M0 -20 V16" stroke={cream} strokeWidth={6} strokeLinecap="round" />
          <path d="M-14 -6 L0 -20 L14 -6" fill="none" stroke={cream} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={-18} y={24} width={36} height={5} rx={2.5} fill={yellow} />
        </g>

        {/* Ground */}
        <line x1={24} y1={220} x2={616} y2={220} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Ask from your phone, the Mac does the rest —
        <br />
        signed, uploaded, and ready to test.
      </figcaption>
    </figure>
  )
}
