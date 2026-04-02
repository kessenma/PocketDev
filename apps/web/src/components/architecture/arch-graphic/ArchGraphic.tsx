import { LayerShapes } from './LayerShapes'
import { FlowPaths } from './FlowPaths'
import { DataPulse } from './DataPulse'
import { Labels } from './Labels'

export function ArchGraphic({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="30 55 450 175"
        className="w-full h-auto"
      >
        <FlowPaths />
        <LayerShapes />
        <DataPulse />
        <Labels />
      </svg>
    </div>
  )
}
