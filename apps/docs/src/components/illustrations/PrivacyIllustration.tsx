import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/**
 * Bauhaus-style illustration for the Privacy Policy page: your server and
 * your keys stay inside your own (locked) house; the only thing that travels
 * out is a small dot — the installation IP — to a plain install box.
 */
export function PrivacyIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 180"
        role="img"
        aria-labelledby="privacy-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="privacy-illustration-title">
          A Mac mini and its keys stay inside a locked house; only an installation IP address travels out
        </title>
        <style>{`
          .pd-priv-ip { animation: pd-priv-travel 7s ease-in-out infinite; }
          .pd-priv-led { animation: pd-priv-pulse 3.6s ease-in-out infinite; }
          @keyframes pd-priv-travel {
            0% { transform: translateX(0); opacity: 0; }
            15% { opacity: 1; }
            70% { transform: translateX(150px); opacity: 1; }
            85%, 100% { transform: translateX(150px); opacity: 0; }
          }
          @keyframes pd-priv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          @media (prefers-reduced-motion: reduce) { .pd-priv-ip, .pd-priv-led { animation: none; } }
        `}</style>

        {/* House */}
        <rect x={120} y={72} width={214} height={88} fill={cream} />
        <polygon points="102,76 227,18 352,76" fill={red} />

        {/* Door, locked */}
        <path d="M138 160 V118 a18 18 0 0 1 36 0 V160 Z" fill={blue} />
        <g transform="translate(156 132)">
          <path d="M-4 -1 V-5 a4 4 0 0 1 8 0 V-1" fill="none" stroke={cream} strokeWidth={2.5} />
          <rect x={-7} y={-2} width={14} height={11} rx={2} fill={cream} />
          <circle cx={0} cy={3} r={1.6} fill={black} />
        </g>

        {/* Window: Mac mini and your keys, on your own desk */}
        <rect x={196} y={88} width={122} height={60} rx={4} fill={black} />
        <rect x={206} y={130} width={102} height={5} fill={blue} />
        <rect x={214} y={135} width={4} height={13} fill={blue} />
        <rect x={296} y={135} width={4} height={13} fill={blue} />
        <rect x={216} y={113} width={50} height={17} rx={5} fill={ALUMINIUM} />
        <rect x={222} y={116} width={38} height={2} rx={1} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-priv-led" cx={259} cy={124} r={2} fill={yellow} />
        {/* key */}
        <g transform="translate(282 123)">
          <circle cx={0} cy={0} r={6} fill="none" stroke={yellow} strokeWidth={3} />
          <path d="M6 0 H22 M16 0 V5 M20 0 V4" fill="none" stroke={yellow} strokeWidth={3} strokeLinecap="round" />
        </g>

        {/* The one thing that leaves: an installation IP, on a thin plain line */}
        <path d="M336 124 H500" fill="none" stroke={GROUND} strokeWidth={2} strokeDasharray="2 8" strokeLinecap="round" />
        <circle className="pd-priv-ip" cx={346} cy={124} r={4.5} fill={cream} />

        {/* Install box: small and plain */}
        <rect x={504} y={102} width={58} height={44} rx={8} fill="none" stroke={GROUND} strokeWidth={3} />
        <rect x={516} y={116} width={34} height={3} rx={1.5} fill={GROUND} />
        <rect x={516} y={126} width={22} height={3} rx={1.5} fill={GROUND} />

        {/* Ground */}
        <line x1={24} y1={160} x2={616} y2={160} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Your keys and passwords stay with you;
        <br />
        at install, your IP is noted too.
      </figcaption>
    </figure>
  )
}
