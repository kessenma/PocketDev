import { motion } from 'framer-motion'

/**
 * Three Bauhaus primitives representing each system layer:
 *   - Blue circle: the agent server (central hub)
 *   - Black rounded rect: the mobile device
 *   - Red square: AI tools / CLI
 *
 * The agent + AI shapes sit inside a dashed VPS boundary
 * to communicate they run on the same remote machine.
 * The agent circle breathes slowly to suggest an always-on process.
 */
export function LayerShapes() {
  return (
    <g>
      {/* VPS boundary — dashed rect enclosing agent + AI */}
      <rect
        x="185"
        y="72"
        width="280"
        height="130"
        rx="12"
        fill="none"
        stroke="#71717a"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity={0.5}
      />

      {/* Mobile device — left */}
      <rect x="60" y="100" width="50" height="80" rx="10" fill="#1a1a1a" />

      {/* Agent server — center, breathing */}
      <motion.circle
        cx="270"
        cy="135"
        r="50"
        fill="#2D5FE5"
        animate={{ r: [50, 54, 50] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* AI / CLI tools — right */}
      <rect x="375" y="108" width="54" height="54" rx="4" fill="#D93025" />
    </g>
  )
}
