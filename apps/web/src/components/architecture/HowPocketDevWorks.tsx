import { useEffect, useId, useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import {
  SiAndroid,
  SiAndroidHex,
  SiApple,
  SiAppleHex,
  SiDocker,
  SiDockerHex,
  SiGit,
  SiGitHex,
  SiGithub,
  SiGithubHex,
  SiNodedotjs,
  SiNodedotjsHex,
} from '@icons-pack/react-simple-icons'
import { Wrench } from 'lucide-react'
import { architectureTextStyles, architectureTokens } from './theme'
import { ConnectExplainer } from './explainers/ConnectExplainer'
import { ExplainerCard } from './explainers/ExplainerCard'
import { RepoExplainer } from './explainers/RepoExplainer'
import { SetupExplainer } from './explainers/SetupExplainer'

export function HowPocketDevWorks({
  onRemoteAiTakeoverChange,
}: {
  onRemoteAiTakeoverChange?: (progress: number) => void
}) {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [railProgress, setRailProgress] = useState(0)
  const [isDesktopLayout, setIsDesktopLayout] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const syncLayout = () => setIsDesktopLayout(mediaQuery.matches)

    syncLayout()
    mediaQuery.addEventListener('change', syncLayout)
    return () => mediaQuery.removeEventListener('change', syncLayout)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setRailProgress(latest)
  })
  const trackX = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    ['0%', '0%', '-75%', '-75%'],
  )
  const setupTimelineProgress = Math.max(0, Math.min(1, (railProgress - 0.3) / 0.2))
  const repoTimelineProgress = Math.max(0, Math.min(1, (railProgress - 0.52) / 0.2))
  const aiTakeoverProgress = Math.max(0, Math.min(1, (railProgress - 0.82) / 0.18))

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    onRemoteAiTakeoverChange?.(Math.max(0, Math.min(1, (latest - 0.82) / 0.18)))
  })

  return (
    <section
      ref={sectionRef}
      className="relative px-6 pt-16 pb-0"
      style={{ height: reduceMotion ? 'auto' : '400vh' }}
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
                Four guided moments from phone to remote workspace
              </h2>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-sm sm:text-base" style={architectureTextStyles.bodyText}>
            These loops mirror the product story in the mobile setup and workspace flows: connect the phone,
            prepare the server, pull code onto the box, then use remote AI through the agent to build.
          </p>

          {reduceMotion ? null : (
            <p className="mt-3 text-sm" style={architectureTextStyles.sectionEyebrow}>
              Scroll to move through each moment.
            </p>
          )}
        </div>
      </div>

      {reduceMotion ? (
        <div className="mx-auto mt-8 flex max-w-6xl flex-col px-6">
          <ExplainerCard
            title="Connect Your Server"
            caption="PocketDev pairs your phone with a self-hosted agent through an explicit handshake, then keeps the server as the stable execution point."
            cardClassName="mb-4"
            legend={[
              { label: 'iOS', icon: <SiApple size={14} color={`#${SiAppleHex}`} /> },
              { label: 'Android', icon: <SiAndroid size={14} color={`#${SiAndroidHex}`} /> },
            ]}
          >
            {({ active, progress }) => (
              <ConnectExplainer active={active} progress={progress} />
            )}
          </ExplainerCard>

          <ExplainerCard
            title="Prepare The Workspace"
            caption="As the card assembles, PocketDev shifts from pairing into guided server prep: helper scripts wire up git SSH, package tooling, AI CLIs, and Docker on the box itself."
            cardClassName="mb-4"
            stageMinHeight={420}
            stageHeight={420}
            stageBorderless
            legend={[
              { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
              { label: 'Docker', icon: <SiDocker size={14} color={`#${SiDockerHex}`} /> },
              { label: 'Node', icon: <SiNodedotjs size={14} color={`#${SiNodedotjsHex}`} /> },
            ]}
          >
            {({ active, progress }) => <SetupExplainer active={active} progress={progress} />}
          </ExplainerCard>

          <ExplainerCard
            title="Clone Repos Remotely"
            caption="The repository source stays remote, the agent brokers the operation, and the checked-out files land on the server where tasks and previews run."
            cardClassName="mb-4"
            stageMinHeight={560}
            stageHeight="72vh"
            stageBorderless
            legend={[
              { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
              { label: 'Git', icon: <SiGit size={14} color={`#${SiGitHex}`} /> },
            ]}
          >
            {({ active, progress }) => (
              <RepoExplainer active={active} progress={progress} timelineProgress={repoTimelineProgress} />
            )}
          </ExplainerCard>

          <div
            className="mt-0 min-h-screen overflow-hidden"
            style={{
              width: '100vw',
              marginLeft: 'calc(50% - 50vw)',
              marginRight: 'calc(50% - 50vw)',
              marginBottom: '-1px',
            }}
          >
            <RemoteAiTakeoverScene
              takeoverProgress={1}
              isDesktopLayout={isDesktopLayout}
            />
          </div>
        </div>
      ) : (
        <div className="sticky top-0 h-screen overflow-hidden -mx-6">
          <div className="flex h-screen w-screen items-center overflow-hidden">
            <motion.div
              className="flex h-full w-[400vw] flex-row flex-nowrap items-center"
              style={{ x: trackX, willChange: 'transform' }}
            >
              <div className="flex h-full w-screen shrink-0 items-center justify-center px-6">
                <ExplainerCard
                  title="Connect Your Server"
                  caption="PocketDev pairs your phone with a self-hosted agent through an explicit handshake, then keeps the server as the stable execution point."
                  cardClassName="w-full max-w-4xl"
                  legend={[
                    { label: 'iOS', icon: <SiApple size={14} color={`#${SiAppleHex}`} /> },
                    { label: 'Android', icon: <SiAndroid size={14} color={`#${SiAndroidHex}`} /> },
                  ]}
                >
                  {({ active, progress }) => (
                    <ConnectExplainer active={active} progress={progress} />
                  )}
                </ExplainerCard>
              </div>

              <div className="flex h-full w-screen shrink-0 items-center justify-center px-6">
                <ExplainerCard
                  title="Prepare The Workspace"
                  caption="After pairing the mobile app to the agent on the server, PocketDev relies on server-side-helper scripts to setup git SSH, package tooling, AI CLIs, and Docker on the box itself."
                  cardClassName="w-full max-w-5xl"
                  stageMinHeight={420}
                  stageHeight={420}
                  stageBorderless
                  legend={[
                    { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
                    { label: 'Docker', icon: <SiDocker size={14} color={`#${SiDockerHex}`} /> },
                    { label: 'Node', icon: <SiNodedotjs size={14} color={`#${SiNodedotjsHex}`} /> },
                  ]}
                >
                  {({ active, progress }) => (
                    <SetupExplainer
                      active={active}
                      progress={progress}
                      timelineProgress={setupTimelineProgress}
                    />
                  )}
                </ExplainerCard>
              </div>

              <div className="flex h-full w-screen shrink-0 items-center justify-center px-6">
                <ExplainerCard
                  title="Then the PocketDev chooses which repos to clone"
                  caption="With the files staying on the server and file names cached locally on the phone for a snappy UX."
                  cardClassName="w-full max-w-[92rem]"
                  stageMinHeight={620}
                  stageHeight="78vh"
                  stageBorderless
                  legend={[
                    { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
                    { label: 'Git', icon: <SiGit size={14} color={`#${SiGitHex}`} /> },
                  ]}
                >
                  {({ active, progress }) => (
                    <RepoExplainer active={active} progress={progress} timelineProgress={repoTimelineProgress} />
                  )}
                </ExplainerCard>
              </div>

              <div
                className="relative flex h-full w-screen shrink-0 items-center justify-center overflow-hidden"
              >
                <div
                  className="relative z-10 h-full"
                  style={{
                    width: '100vw',
                    marginLeft: 'calc(50% - 50vw)',
                    marginRight: 'calc(50% - 50vw)',
                  }}
                >
                  <RemoteAiTakeoverScene
                    takeoverProgress={aiTakeoverProgress}
                    isDesktopLayout={isDesktopLayout}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </section>
  )
}

function RemoteAiTakeoverScene({
  takeoverProgress,
  isDesktopLayout,
}: {
  takeoverProgress: number
  isDesktopLayout: boolean
}) {
  const clipId = useId()
  const viewBox = isDesktopLayout ? '0 0 1000 700' : '0 0 700 1240'
  const circleRadius = (isDesktopLayout ? 95 : 120) + takeoverProgress * (isDesktopLayout ? 620 : 820)
  const circleCx = isDesktopLayout ? 770 : 520
  const circleCy = isDesktopLayout ? 415 : 930
  const phoneX = isDesktopLayout ? 265 : 120
  const phoneY = isDesktopLayout ? 470 : 870
  const connectorPath = isDesktopLayout
    ? `M ${phoneX + 88} ${phoneY + 66} C 470 528, 590 474, 665 430`
    : `M ${phoneX + 88} ${phoneY + 66} C 294 982, 372 968, 454 934`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className="block h-full w-full"
      preserveAspectRatio={isDesktopLayout ? 'xMidYMid slice' : 'xMidYMid meet'}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={circleCx} cy={circleCy} r={circleRadius} />
        </clipPath>
      </defs>

      <circle cx={circleCx} cy={circleCy} r={circleRadius} fill={architectureTokens.colors.blue} />

      <TextGroup color={architectureTokens.colors.text} isDesktopLayout={isDesktopLayout} />
      <g clipPath={`url(#${clipId})`}>
        <TextGroup color="#ffffff" isDesktopLayout={isDesktopLayout} />
      </g>

      <PhoneShape x={phoneX} y={phoneY} />
      <path
        d={connectorPath}
        fill="none"
        stroke={architectureTokens.colors.black}
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TextGroup({
  color,
  isDesktopLayout,
}: {
  color: string
  isDesktopLayout: boolean
}) {
  const eyebrowX = isDesktopLayout ? 36 : 36
  const eyebrowY = isDesktopLayout ? 82 : 86
  const line1Y = isDesktopLayout ? 182 : 186
  const line2Y = isDesktopLayout ? 238 : 246
  const headerY = isDesktopLayout ? 344 : 388

  return (
    <g fill={color}>
      <text
        x={eyebrowX}
        y={eyebrowY}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktopLayout ? 20 : 18}
        letterSpacing="0.22em"
        opacity="0.68"
      >
        Once the server is setup,
      </text>
      <text
        x={isDesktopLayout ? 84 : 76}
        y={line1Y}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktopLayout ? 22 : 19}
        opacity="0.76"
      >
        the repos are cloned,
      </text>
      <text
        x={isDesktopLayout ? 132 : 116}
        y={line2Y}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktopLayout ? 24 : 21}
        opacity="0.84"
      >
        then
      </text>
      <text
        x={36}
        y={headerY}
        fontFamily="var(--font-sans), sans-serif"
        fontSize={isDesktopLayout ? 58 : 42}
        fontWeight="700"
        letterSpacing="-0.03em"
      >
        {isDesktopLayout ? (
          <>
            <tspan x={36} dy="0">PocketDev&apos;s can expand</tspan>
            <tspan x={36} dy="70">their capabilities beyond</tspan>
            <tspan x={36} dy="70">the laptop.</tspan>
          </>
        ) : (
          <>
            <tspan x={36} dy="0">PocketDev&apos;s can expand</tspan>
            <tspan x={36} dy="52">their capabilities</tspan>
            <tspan x={36} dy="52">beyond the laptop.</tspan>
          </>
        )}
      </text>
    </g>
  )
}

function PhoneShape({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="88" height="132" rx="22" fill={architectureTokens.colors.black} />
      <rect x="8" y="8" width="72" height="116" rx="16" fill="rgba(255,255,255,0.08)" />
      <rect x="24" y="22" width="40" height="6" rx="3" fill="rgba(255,255,255,0.82)" />
      <rect x="20" y="44" width="48" height="56" rx="14" fill="rgba(255,255,255,0.96)" />
      <rect x="28" y="108" width="32" height="10" rx="5" fill={architectureTokens.colors.blue} />
      <circle cx="44" cy="122" r="5" fill="rgba(255,255,255,0.55)" />
    </g>
  )
}
