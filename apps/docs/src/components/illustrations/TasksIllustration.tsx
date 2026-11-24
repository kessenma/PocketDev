import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const GROUND = '#7d7468'

const STEPS = [64, 100, 136]

/**
 * Bauhaus-style illustration for the "Tasks" page: a prompt goes out from the
 * phone, the agent ticks through its checklist, and a diff travels back home.
 * Same flat-primaries style as HomeServerIllustration.
 */
export function TasksIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 260"
        role="img"
        aria-labelledby="tasks-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="tasks-illustration-title">
          A prompt is sent from a phone to an agent that works through a checklist, and a diff comes back to the phone
        </title>
        <style>{`
          .pd-task-link { stroke-dasharray: 2 10; animation: pd-task-flow 1.6s linear infinite; }
          .pd-task-back { stroke-dasharray: 2 10; animation: pd-task-flow 1.6s linear infinite; }
          .pd-task-spin { transform-box: fill-box; transform-origin: center; animation: pd-task-spin 3.2s linear infinite; }
          .pd-task-check { transform-box: fill-box; transform-origin: center; animation: pd-task-tick 6s ease-out infinite both; }
          @keyframes pd-task-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-task-spin { to { transform: rotate(360deg); } }
          @keyframes pd-task-tick {
            0%, 8% { opacity: 0; transform: scale(0.5); }
            16%, 86% { opacity: 1; transform: scale(1); }
            96%, 100% { opacity: 0; transform: scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .pd-task-link, .pd-task-back, .pd-task-spin, .pd-task-check { animation: none; }
          }
        `}</style>

        {/* Phone with a prompt bubble */}
        <g transform="translate(92 124)">
          <rect x={-30} y={-56} width={60} height={110} rx={12} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-22} y={-42} width={44} height={86} rx={6} fill="rgba(255,255,255,0.08)" />
          <rect x={-10} y={-51} width={20} height={3} rx={1.5} fill="rgba(255,255,255,0.15)" />
          <rect x={-18} y={-34} width={36} height={22} rx={5} fill={yellow} />
          <rect x={-12} y={-28} width={24} height={3} rx={1.5} fill={black} />
          <rect x={-12} y={-21} width={16} height={3} rx={1.5} fill={black} />
          <rect x={-16} y={-2} width={26} height={3} rx={1.5} fill="rgba(255,255,255,0.35)" />
          <rect x={-16} y={6} width={18} height={3} rx={1.5} fill="rgba(255,255,255,0.25)" />
          <rect x={-16} y={24} width={32} height={14} rx={4} fill={blue} />
        </g>

        {/* Prompt: phone → agent */}
        <path className="pd-task-link" d="M124 84 C 170 30, 220 40, 256 80" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={124} cy={84} r={4} fill={yellow} />
        <circle cx={256} cy={80} r={4} fill={yellow} />

        {/* Agent: a turning arc over its checklist */}
        <circle cx={340} cy={40} r={16} fill="none" stroke="rgba(245,245,220,0.25)" strokeWidth={5} />
        <path className="pd-task-spin" d="M340 24 a16 16 0 0 1 16 16" fill="none" stroke={red} strokeWidth={5} strokeLinecap="round" />
        <rect x={262} y={64} width={156} height={104} rx={10} fill={cream} />
        {STEPS.map((y, i) => (
          <g key={y} transform={`translate(0 ${y - 64})`}>
            <rect x={278} y={76} width={20} height={20} rx={4} fill="none" stroke={black} strokeWidth={3} />
            <path
              className="pd-task-check"
              style={{ animationDelay: `${i * 1.2}s` }}
              d="M282 86 l4 4 l8 -9"
              fill="none"
              stroke={blue}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x={310} y={83} width={[88, 70, 80][i]} height={6} rx={3} fill={black} />
          </g>
        ))}

        {/* Result: agent → diff card */}
        <path className="pd-task-link" d="M418 116 C 440 116, 450 104, 472 104" fill="none" stroke={yellow} strokeWidth={3.5} strokeLinecap="round" />

        {/* Diff card: additions in blue, removals in red */}
        <g transform="translate(530 116)">
          <rect x={-56} y={-50} width={112} height={100} rx={10} fill={black} stroke={GROUND} strokeWidth={2} />
          <rect x={-42} y={-34} width={10} height={4} rx={2} fill={red} />
          <rect x={-26} y={-34} width={58} height={4} rx={2} fill={red} opacity={0.6} />
          <path d="M-37 -14 V-4 M-42 -9 H-32" stroke={blue} strokeWidth={4} strokeLinecap="round" />
          <rect x={-26} y={-11} width={66} height={4} rx={2} fill={blue} />
          <path d="M-37 10 V20 M-42 15 H-32" stroke={blue} strokeWidth={4} strokeLinecap="round" />
          <rect x={-26} y={13} width={46} height={4} rx={2} fill={blue} />
          <rect x={-26} y={32} width={30} height={4} rx={2} fill="rgba(255,255,255,0.3)" />
        </g>

        {/* Diff travels back to the phone, under everything */}
        <path className="pd-task-back" d="M530 166 C 520 222, 200 226, 120 178" fill="none" stroke={blue} strokeWidth={3.5} strokeLinecap="round" />
        <circle cx={120} cy={178} r={4} fill={blue} />

        {/* Ground */}
        <line x1={24} y1={236} x2={616} y2={236} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        Write what you need, then let it run —
        <br />
        the diff comes home when the work is done.
      </figcaption>
    </figure>
  )
}
