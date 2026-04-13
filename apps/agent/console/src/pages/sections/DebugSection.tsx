import { DiagnosticsPanel } from '#/components/DiagnosticsPanel'

export function DebugSection({ onOpenTerminal }: { onOpenTerminal: () => void }) {
  return <DiagnosticsPanel onOpenTerminal={onOpenTerminal} />
}
