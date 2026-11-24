import { palette } from '@pocketdev/shared/theme'

const { blue, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/**
 * Bauhaus-style illustration for the User Agreement page: a yellow "beta, as
 * is" caution sign, a phone where you approve each proposed action, and the
 * Mac mini on your own desk that you look after.
 */
export function UserAgreementIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 180"
        role="img"
        aria-labelledby="user-agreement-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="user-agreement-illustration-title">
          A beta caution sign, a phone asking you to approve an action, and your own Mac mini
        </title>
        <style>{`
          .pd-terms-sign { transform-box: view-box; transform-origin: 140px 160px; animation: pd-terms-sway 7s ease-in-out infinite; }
          .pd-terms-link { stroke-dasharray: 2 10; animation: pd-terms-flow 3.2s linear infinite; }
          .pd-terms-ok, .pd-terms-led { animation: pd-terms-pulse 3.6s ease-in-out infinite; }
          @keyframes pd-terms-sway { 0%, 100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
          @keyframes pd-terms-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-terms-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @media (prefers-reduced-motion: reduce) { .pd-terms-sign, .pd-terms-link, .pd-terms-ok, .pd-terms-led { animation: none; } }
        `}</style>

        {/* Beta, as is: a caution sign on a post */}
        <g className="pd-terms-sign">
          <rect x={137} y={96} width={6} height={64} fill={GROUND} />
          <polygon points="140,30 180,98 100,98" fill={yellow} stroke={yellow} strokeWidth={8} strokeLinejoin="round" />
          <rect x={136.5} y={52} width={7} height={26} rx={3.5} fill={black} />
          <circle cx={140} cy={88} r={4} fill={black} />
        </g>

        {/* Phone: one proposed action, waiting for your approval */}
        <g transform="translate(320 100)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          <rect x={-18} y={-34} width={36} height={30} rx={5} fill={cream} />
          <rect x={-12} y={-27} width={24} height={3} rx={1.5} fill={black} />
          <rect x={-12} y={-20} width={18} height={3} rx={1.5} fill={black} />
          <rect x={-12} y={-13} width={22} height={3} rx={1.5} fill={black} />
          <rect x={-18} y={22} width={16} height={14} rx={4} fill="none" stroke={GROUND} strokeWidth={2} />
          <g className="pd-terms-ok">
            <rect x={2} y={22} width={16} height={14} rx={4} fill={blue} />
            <path d="M6 29 l3 3 l5 -6" fill="none" stroke={cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* Link: phone → your Mac */}
        <path className="pd-terms-link" d="M352 74 C 400 50, 450 64, 476 104" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={352} cy={74} r={4} fill={yellow} />
        <circle cx={476} cy={104} r={4} fill={yellow} />

        {/* Your desk, your Mac mini */}
        <rect x={444} y={130} width={128} height={6} fill={blue} />
        <rect x={454} y={136} width={5} height={24} fill={blue} />
        <rect x={557} y={136} width={5} height={24} fill={blue} />
        <rect x={472} y={106} width={72} height={24} rx={7} fill={ALUMINIUM} />
        <rect x={479} y={110} width={58} height={2.5} rx={1.25} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-terms-led" cx={535} cy={121} r={2.4} fill={yellow} />

        {/* Ground */}
        <line x1={24} y1={160} x2={616} y2={160} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Free for now, and still in beta too —
        <br />
        your server, your call; each step&apos;s up to you.
      </figcaption>
    </figure>
  )
}
