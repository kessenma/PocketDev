import { ScrollTimeline } from './ScrollTimeline'
import { howItWorksScenes } from './scenes'
import { computeSceneRanges } from './timeline-utils'

export function HowPocketDevWorksSection({
  onLowerPageTakeoverChange,
  sectionRef: externalSectionRef,
}: {
  onLowerPageTakeoverChange?: (progress: number) => void
  sectionRef?: React.RefObject<HTMLElement | null>
}) {
  // Find the remote-ai scene's range to compute the lower-page takeover from rail progress
  const ranges = computeSceneRanges(howItWorksScenes)
  const remoteAiIndex = howItWorksScenes.findIndex((s) => s.id === 'remote-ai')
  const remoteAiRange = ranges[remoteAiIndex]

  return (
    <ScrollTimeline
      scenes={howItWorksScenes}
      sectionHeight="1000vh"
      externalSectionRef={externalSectionRef}
      onRailProgress={(p) => {
        if (!remoteAiRange) return
        // Start the page color transition partway through the remote-ai scene
        const takeoverStart = remoteAiRange.start + (remoteAiRange.end - remoteAiRange.start) * 0.3
        const takeoverEnd = remoteAiRange.end
        onLowerPageTakeoverChange?.(
          Math.max(0, Math.min(1, (p - takeoverStart) / (takeoverEnd - takeoverStart))),
        )
      }}
    />
  )
}
