import { palette } from '@pocketdev/shared/theme'

const { blue, red, yellow, black, cream } = palette.bauhaus
const ALUMINIUM = '#d9d9d6'
const GROUND = '#7d7468'

/** Terminal rows: vertical centre and the accent colour of the CLI running in it. */
const TERMINALS = [
  { cy: 64, accent: red, widths: [96, 64] },
  { cy: 132, accent: blue, widths: [72, 104] },
  { cy: 200, accent: yellow, widths: [110, 52] },
]

/**
 * Bauhaus-style illustration for the "Agent" page: one server with a single
 * port, running several coding-agent terminals whose output streams line by
 * line into a small local SQLite store.
 */
export function AgentIllustration() {
  return (
    <figure className="not-prose my-8">
      <svg
        viewBox="0 0 640 260"
        role="img"
        aria-labelledby="agent-illustration-title"
        className="mx-auto block h-auto w-full max-w-xl"
      >
        <title id="agent-illustration-title">
          A server with one port runs three coding-agent terminals, whose output is saved to a local database
        </title>
        <style>{`
          .pd-agent-link { stroke-dasharray: 2 10; animation: pd-agent-flow 1.6s linear infinite; }
          .pd-agent-led { animation: pd-agent-pulse 2.4s ease-in-out infinite; }
          .pd-agent-line { transform-box: fill-box; transform-origin: left center; animation: pd-agent-type 5s ease-out infinite; }
          .pd-agent-cursor { animation: pd-agent-blink 1.1s steps(1) infinite; }
          @keyframes pd-agent-flow { to { stroke-dashoffset: -24; } }
          @keyframes pd-agent-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          @keyframes pd-agent-type { 0% { transform: scaleX(0); } 30%, 85% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
          @keyframes pd-agent-blink { 0% { opacity: 1; } 50% { opacity: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .pd-agent-link, .pd-agent-led, .pd-agent-line, .pd-agent-cursor { animation: none; }
          }
        `}</style>

        {/* Server tower with a single port */}
        <rect x={60} y={40} width={92} height={192} rx={12} fill={ALUMINIUM} />
        <rect x={70} y={46} width={72} height={2.5} rx={1.25} fill="rgba(255,255,255,0.7)" />
        {[66, 78, 90, 102].map((y) => (
          <rect key={y} x={76} y={y} width={60} height={5} rx={2.5} fill="rgba(0,0,0,0.16)" />
        ))}
        <circle cx={106} cy={150} r={13} fill={blue} />
        <circle cx={106} cy={150} r={5} fill={black} />
        <circle className="pd-agent-led" cx={136} cy={212} r={3} fill={yellow} />

        {/* The agent fans out to each terminal */}
        {TERMINALS.map(({ cy }) => (
          <path
            key={cy}
            d={`M152 150 C 196 150, 192 ${cy}, 232 ${cy}`}
            fill="none"
            stroke={GROUND}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}

        {/* Terminals running coding agents, output typing in line by line */}
        {TERMINALS.map(({ cy, accent, widths }, i) => (
          <g key={cy}>
            <rect x={232} y={cy - 26} width={196} height={52} rx={8} fill={black} stroke={GROUND} strokeWidth={2} />
            <circle cx={248} cy={cy - 12} r={4} fill={accent} />
            <rect x={258} y={cy - 14} width={40} height={4} rx={2} fill="rgba(255,255,255,0.2)" />
            <path d={`M246 ${cy + 2} l6 4.5 l-6 4.5`} fill="none" stroke={yellow} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <rect className="pd-agent-line" x={260} y={cy + 4} width={widths[0]} height={5} rx={2.5} fill={cream} style={{ animationDelay: `${i * 0.8}s` }} />
            <rect className="pd-agent-line" x={260} y={cy + 14} width={widths[1]} height={4} rx={2} fill="rgba(255,255,255,0.35)" style={{ animationDelay: `${i * 0.8 + 0.6}s` }} />
            <rect className="pd-agent-cursor" x={404} y={cy + 2} width={7} height={12} rx={1} fill={yellow} style={{ animationDelay: `${i * 0.3}s` }} />
          </g>
        ))}

        {/* Output streams into local state */}
        {TERMINALS.map(({ cy }, i) => (
          <path
            key={cy}
            className="pd-agent-link"
            d={`M428 ${cy} C 464 ${cy}, 470 ${128 + i * 20}, 500 ${128 + i * 20}`}
            fill="none"
            stroke={yellow}
            strokeWidth={3.5}
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}

        {/* SQLite: a small cream cylinder */}
        <path d="M500 96 V196 a42 12 0 0 0 84 0 V96 Z" fill={cream} />
        <ellipse cx={542} cy={96} rx={42} ry={12} fill={ALUMINIUM} />
        <path d="M500 130 a42 12 0 0 0 84 0 M500 163 a42 12 0 0 0 84 0" fill="none" stroke={GROUND} strokeWidth={2.5} />

        {/* Ground */}
        <line x1={24} y1={232} x2={616} y2={232} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-center text-sm" style={{ color: '#998d79' }}>
        A single process minds each shell —
        <br />
        it runs the tasks and logs them well.
      </figcaption>
    </figure>
  )
}
