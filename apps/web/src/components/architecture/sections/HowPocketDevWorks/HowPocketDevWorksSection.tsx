import { ScrollTimeline } from './ScrollTimeline'
import { howItWorksScenes } from './scenes'
import { computeSceneRanges } from './timeline-utils'

export function HowPocketDevWorksSection({
  onLowerPageTakeoverChange,
  onRailProgress: onRailProgressRaw,
  sectionRef: externalSectionRef,
}: {
  onLowerPageTakeoverChange?: (progress: number) => void
  onRailProgress?: (progress: number) => void
  sectionRef?: React.RefObject<HTMLElement | null>
}) {
  const ranges = computeSceneRanges(howItWorksScenes)
  const remoteAiIndex = howItWorksScenes.findIndex((s) => s.id === 'remote-ai')
  const remoteAiRange = ranges[remoteAiIndex]

  return (
    <ScrollTimeline
      scenes={howItWorksScenes}
      sectionHeight="1275vh"
      externalSectionRef={externalSectionRef}
      onRailProgress={(p) => {
        onRailProgressRaw?.(p)
        if (!remoteAiRange) return
        const takeoverStart = remoteAiRange.start + (remoteAiRange.end - remoteAiRange.start) * 0.3
        const takeoverEnd = remoteAiRange.end
        onLowerPageTakeoverChange?.(
          Math.max(0, Math.min(1, (p - takeoverStart) / (takeoverEnd - takeoverStart))),
        )
      }}
    />
  )
}
