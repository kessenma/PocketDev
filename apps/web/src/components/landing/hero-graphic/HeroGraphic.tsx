import { BlueCircle } from './BlueCircle'
import { PhoneShape } from './PhoneShape'
import { RoutingLines } from './RoutingLines'
import { SignalPulse } from './SignalPulse'

const VIEWBOX_SIZE = 560
const VIEWBOX_OFFSET = -30

export function HeroGraphic({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${VIEWBOX_OFFSET} -40 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="w-full h-auto"
      >
        <BlueCircle />
        <RoutingLines />
        <SignalPulse />
        <PhoneShape />
      </svg>
    </div>
  )
}
