import { borderRadius, palette, spacing } from '@pocketdev/shared/theme'
import { DiagramLayers } from './DiagramLayers'
import { FlowPaths } from './FlowPaths'
import { FlowPulse } from './FlowPulse'
import { DiagramLabels } from './DiagramLabels'
import { useViewportActivity } from '../useViewportActivity'

export function ArchitectureFlowDiagram({ className }: { className?: string }) {
  const { ref, isActive } = useViewportActivity<HTMLDivElement>(0.3)

  return (
    <div
      ref={ref}
      className={className}
      style={{
        borderRadius: `${borderRadius.xl}px`,
        padding: `${spacing[4]}px`,
        background: `linear-gradient(180deg, ${palette.bauhaus.yellow}0d 0%, rgba(255,255,255,0) 26%), radial-gradient(circle at 72% 32%, ${palette.bauhaus.blue}12 0%, rgba(255,255,255,0) 30%)`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="32 36 590 268"
        className="w-full h-auto"
      >
        <FlowPaths active={isActive} />
        <DiagramLayers active={isActive} />
        <FlowPulse active={isActive} />
        <DiagramLabels />
      </svg>
    </div>
  )
}
