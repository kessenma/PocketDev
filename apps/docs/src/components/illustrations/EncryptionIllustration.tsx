import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/**
 * Bauhaus-style illustration for the "Encryption" page: the phone holds its
 * private key and seals each request with a signature; the request travels
 * through a padlocked TLS tunnel to the server, which checks the seal with the
 * device's public key. Same flat-primaries style as HomeServerIllustration.
 */
export function EncryptionIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 30 640 230"
        role="img"
        aria-labelledby="encryption-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="encryption-illustration-title">
          A phone signs a request with its private key and sends it through a padlocked TLS tunnel to a Mac mini that
          verifies the signature
        </title>
        <style>{`
          .pd-enc-link { stroke-dasharray: 2 10; animation: pd-enc-flow 1.6s linear infinite; }
          .pd-enc-note { animation: pd-enc-travel 4.8s ease-in-out infinite; }
          .pd-enc-check { animation: pd-enc-ok 4.8s ease-in-out infinite; }
          .pd-enc-led { animation: pd-enc-pulse 2.4s ease-in-out infinite; }
          @keyframes pd-enc-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-enc-travel {
            0% { transform: translateX(0); opacity: 0; }
            10% { opacity: 1; }
            70% { transform: translateX(276px); opacity: 1; }
            80%, 100% { transform: translateX(276px); opacity: 0; }
          }
          @keyframes pd-enc-ok { 0%, 68% { opacity: 0.45; } 76%, 94% { opacity: 1; } 100% { opacity: 0.45; } }
          @keyframes pd-enc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          @media (prefers-reduced-motion: reduce) {
            .pd-enc-link, .pd-enc-note, .pd-enc-check, .pd-enc-led { animation: none; }
          }
        `}</style>

        {/* Phone */}
        <g transform="translate(92 168)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          <rect x={-16} y={-32} width={24} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-16} y={-24} width={32} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
          <rect x={-16} y={24} width={32} height={14} rx={4} fill={blue} />
        </g>

        {/* Private key, kept on the phone */}
        <g transform="translate(96 86) rotate(-20)">
          <circle cx={-14} cy={0} r={11} fill="none" stroke={yellow} strokeWidth={6} />
          <path d="M-3 0 H24 M16 0 V9 M24 0 V7" stroke={yellow} strokeWidth={6} strokeLinecap="round" />
        </g>

        {/* TLS tunnel: a thick cream pipe with a flowing centre line */}
        <rect x={140} y={146} width={358} height={44} rx={22} fill="rgba(245,245,220,0.06)" stroke={cream} strokeWidth={4} />
        <path className="pd-enc-link" d="M156 168 H482" fill="none" stroke={yellow} strokeWidth={3} strokeLinecap="round" opacity={0.6} />

        {/* Padlock riding on the tunnel */}
        <g transform="translate(319 126)">
          <path d="M-8 -2 V-10 a8 8 0 0 1 16 0 V-2" fill="none" stroke={cream} strokeWidth={4} />
          <rect x={-14} y={-3} width={28} height={21} rx={4} fill={cream} />
          <circle cx={0} cy={6} r={3} fill={black} />
          <rect x={-1.5} y={7} width={3} height={6} rx={1.5} fill={black} />
        </g>

        {/* A signed request travelling through the tunnel */}
        <g className="pd-enc-note">
          <rect x={160} y={156} width={40} height={24} rx={4} fill={cream} />
          <rect x={166} y={162} width={18} height={3} rx={1.5} fill={black} />
          <rect x={166} y={169} width={12} height={3} rx={1.5} fill={GROUND} />
          <circle cx={194} cy={176} r={7} fill={red} />
        </g>

        {/* Desk + Mac mini (the server) */}
        <rect x={492} y={196} width={124} height={7} fill={blue} />
        <rect x={502} y={203} width={6} height={23} fill={blue} />
        <rect x={600} y={203} width={6} height={23} fill={blue} />
        <rect x={516} y={168} width={76} height={28} rx={8} fill={ALUMINIUM} />
        <rect x={524} y={172} width={60} height={2.5} rx={1.25} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-enc-led" cx={582} cy={186} r={2.6} fill={yellow} />

        {/* Public key + verified stamp above the server */}
        <g transform="translate(530 132)">
          <circle cx={-6} cy={0} r={8} fill="none" stroke={blue} strokeWidth={5} />
          <path d="M2 0 H22 M16 0 V7" stroke={blue} strokeWidth={5} strokeLinecap="round" />
        </g>
        <g className="pd-enc-check">
          <circle cx={584} cy={132} r={14} fill={red} />
          <path d="M577 132 l5 5 l9 -10" fill="none" stroke={cream} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Ground */}
        <line x1={24} y1={226} x2={616} y2={226} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Each note is signed, so the server knows it&apos;s you,
        <br />
        and wrapped in TLS the whole way through.
      </figcaption>
    </figure>
  )
}
