import { useReducedMotion } from 'framer-motion'
import { Wrench } from 'lucide-react'
import { architectureTextStyles, architectureTokens } from '../../shared/theme'
import { ScrollTimeline } from './ScrollTimeline'
import { howItWorksScenes } from './scenes'
import { computeSceneRanges } from './timeline-utils'

export function HowPocketDevWorksSection({
  onLowerPageTakeoverChange,
}: {
  onLowerPageTakeoverChange?: (progress: number) => void
}) {
  const reduceMotion = useReducedMotion()

  // Find the remote-ai scene's range to compute the lower-page takeover from rail progress
  const ranges = computeSceneRanges(howItWorksScenes)
  const remoteAiIndex = howItWorksScenes.findIndex((s) => s.id === 'remote-ai')
  const remoteAiRange = ranges[remoteAiIndex]

  return (
    <ScrollTimeline
      scenes={howItWorksScenes}
      sectionHeight="1000vh"
      onRailProgress={(p) => {
        if (!remoteAiRange) return
        // Start the page color transition partway through the remote-ai scene
        const takeoverStart = remoteAiRange.start + (remoteAiRange.end - remoteAiRange.start) * 0.3
        const takeoverEnd = remoteAiRange.end
        onLowerPageTakeoverChange?.(
          Math.max(0, Math.min(1, (p - takeoverStart) / (takeoverEnd - takeoverStart))),
        )
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className={reduceMotion ? '' : 'py-8'}>
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `${architectureTokens.colors.blue}14` }}
            >
              <Wrench size={18} color={architectureTokens.colors.blue} strokeWidth={2.2} />
            </div>
            <div>
              <p style={architectureTextStyles.sectionEyebrow}>How PocketDev Works</p>
              <h2 className="mt-1 text-xl sm:text-2xl" style={architectureTextStyles.cardTitle}>
                Six guided moments from install to task-ready workspace
              </h2>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm sm:text-base" style={architectureTextStyles.bodyText}>
            These loops mirror the product story in the mobile setup and workspace flows: install the agent,
            connect the phone, prepare the server, pull code onto the box, then use remote AI through the agent
            to build with quick prompts and suggested file context.
          </p>

          {reduceMotion ? null : (
            <p className="mt-3 text-sm" style={architectureTextStyles.sectionEyebrow}>
              Scroll to move through each moment.
            </p>
          )}
        </div>
      </div>
    </ScrollTimeline>
  )
}
