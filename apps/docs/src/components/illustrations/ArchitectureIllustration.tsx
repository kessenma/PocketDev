import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/**
 * Bauhaus-style illustration for the "Architecture" page: a phone outside the
 * boundary of your own machine, exchanging commands and events with the agent
 * through a padlocked gate; inside, the agent drives the AI CLIs (circle,
 * square, triangle) and your repository.
 */
export function ArchitectureIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 260"
        role="img"
        aria-labelledby="architecture-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="architecture-illustration-title">
          A phone sends commands to the agent on your machine and receives events back; the agent runs AI coding tools against your repository
        </title>
        <style>{`
          .pd-arch-out { stroke-dasharray: 2 10; animation: pd-arch-out 1.6s linear infinite; }
          .pd-arch-in { stroke-dasharray: 2 10; animation: pd-arch-in 1.6s linear infinite; }
          .pd-arch-tool { stroke-dasharray: 2 9; animation: pd-arch-out 2.2s linear infinite; }
          .pd-arch-led { animation: pd-arch-pulse 2.4s ease-in-out infinite; }
          .pd-arch-shape { transform-box: fill-box; transform-origin: center; animation: pd-arch-breathe 4.8s ease-in-out infinite; }
          @keyframes pd-arch-out { to { stroke-dashoffset: -24; } }
          @keyframes pd-arch-in { to { stroke-dashoffset: 24; } }
          @keyframes pd-arch-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          @keyframes pd-arch-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
          @media (prefers-reduced-motion: reduce) {
            .pd-arch-out, .pd-arch-in, .pd-arch-tool, .pd-arch-led, .pd-arch-shape { animation: none; }
          }
        `}</style>

        {/* Your machine: everything inside this boundary stays with you */}
        <rect x={196} y={26} width={420} height={208} rx={24} fill="rgba(255,255,255,0.03)" stroke={GROUND} strokeWidth={3} />

        {/* Phone */}
        <g transform="translate(92 130)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          <rect x={-16} y={-32} width={24} height={3} rx={1.5} fill="rgba(255,255,255,0.5)" />
          <rect x={-16} y={-24} width={32} height={3} rx={1.5} fill="rgba(255,255,255,0.3)" />
          <rect x={-16} y={-16} width={18} height={3} rx={1.5} fill="rgba(255,255,255,0.4)" />
          <rect x={-16} y={18} width={32} height={14} rx={4} fill={blue} />
        </g>

        {/* Commands out (yellow) and events back (cream) */}
        <path className="pd-arch-out" d="M126 116 H252" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" />
        <path className="pd-arch-in" d="M126 138 H252" fill="none" stroke={cream} strokeWidth={3.5} strokeLinecap="round" />

        {/* Padlocked gate where the link crosses into your machine */}
        <g transform="translate(196 90)">
          <path d="M-6 -2 V-7 a6 6 0 0 1 12 0 V-2" fill="none" stroke={cream} strokeWidth={3} />
          <rect x={-10} y={-3} width={20} height={15} rx={3} fill={cream} />
          <circle cx={0} cy={4} r={2.2} fill={black} />
        </g>

        {/* The agent, on a Mac mini */}
        <rect x={252} y={106} width={96} height={42} rx={10} fill={ALUMINIUM} />
        <rect x={260} y={110} width={80} height={2.5} rx={1.25} fill="rgba(255,255,255,0.7)" />
        <circle className="pd-arch-led" cx={336} cy={136} r={2.8} fill={yellow} />

        {/* Repository below the agent: a folder with a branch */}
        <line x1={300} y1={148} x2={300} y2={174} stroke={GROUND} strokeWidth={3} />
        <rect x={270} y={170} width={22} height={10} rx={3} fill={ALUMINIUM} />
        <rect x={270} y={176} width={60} height={38} rx={5} fill={ALUMINIUM} />
        <path d="M290 186 V206 M290 200 C 290 194, 310 196, 310 188" fill="none" stroke={black} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={290} cy={186} r={3.5} fill={black} />
        <circle cx={290} cy={206} r={3.5} fill={black} />
        <circle cx={310} cy={188} r={3.5} fill={red} />

        {/* Agent → AI coding CLIs */}
        <path className="pd-arch-tool" d="M348 120 C 410 116, 430 66, 494 64" fill="none" stroke={cream} strokeWidth={3} strokeLinecap="round" />
        <path className="pd-arch-tool" d="M348 128 H494" fill="none" stroke={cream} strokeWidth={3} strokeLinecap="round" style={{ animationDelay: '0.5s' }} />
        <path className="pd-arch-tool" d="M348 136 C 410 140, 430 196, 494 198" fill="none" stroke={cream} strokeWidth={3} strokeLinecap="round" style={{ animationDelay: '1s' }} />

        <circle className="pd-arch-shape" cx={522} cy={64} r={24} fill={red} />
        <rect className="pd-arch-shape" x={498} y={104} width={48} height={48} rx={4} fill={blue} style={{ animationDelay: '1.6s' }} />
        <polygon className="pd-arch-shape" points="522,176 548,218 496,218" fill={yellow} style={{ animationDelay: '3.2s' }} />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Phone talks to agent, agent to tools —
        <br />
        your own machine, playing by your rules.
      </figcaption>
    </figure>
  )
}
