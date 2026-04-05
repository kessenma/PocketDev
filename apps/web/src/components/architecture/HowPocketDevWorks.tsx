import {
  SiAndroid,
  SiAndroidHex,
  SiApple,
  SiAppleHex,
  SiClaude,
  SiClaudeHex,
  SiDocker,
  SiDockerHex,
  SiGit,
  SiGitHex,
  SiGithub,
  SiGithubHex,
  SiGithubcopilot,
  SiGithubcopilotHex,
  SiNodedotjs,
  SiNodedotjsHex,
} from '@icons-pack/react-simple-icons'
import { Wrench } from 'lucide-react'
import { brandAssets } from './brand-assets'
import { BrandAssetIcon } from './BrandAssetIcon'
import { architectureTextStyles, architectureTokens } from './theme'
import { AiBuildExplainer } from './explainers/AiBuildExplainer'
import { ConnectExplainer } from './explainers/ConnectExplainer'
import { ExplainerCard } from './explainers/ExplainerCard'
import { RepoExplainer } from './explainers/RepoExplainer'
import { SetupExplainer } from './explainers/SetupExplainer'

export function HowPocketDevWorks() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
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

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ExplainerCard
            title="Connect Your Server"
            caption="PocketDev pairs your phone with a self-hosted agent through an explicit handshake, then keeps the server as the stable execution point."
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
            cardClassName="md:col-span-2"
            stageMinHeight={292}
            legend={[
              { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
              { label: 'Docker', icon: <SiDocker size={14} color={`#${SiDockerHex}`} /> },
              { label: 'Node', icon: <SiNodedotjs size={14} color={`#${SiNodedotjsHex}`} /> },
              { label: 'Claude', icon: <SiClaude size={14} color={`#${SiClaudeHex}`} /> },
              { label: 'Codex', icon: <BrandAssetIcon src={brandAssets.codexBlack} alt="Codex" /> },
              { label: 'Copilot', icon: <SiGithubcopilot size={14} color={`#${SiGithubcopilotHex}`} /> },
            ]}
          >
            {({ active, progress }) => <SetupExplainer active={active} progress={progress} />}
          </ExplainerCard>

          <ExplainerCard
            title="Clone Repos Remotely"
            caption="The repository source stays remote, the agent brokers the operation, and the checked-out files land on the server where tasks and previews run."
            legend={[
              { label: 'GitHub', icon: <SiGithub size={14} color={`#${SiGithubHex}`} /> },
              { label: 'Git', icon: <SiGit size={14} color={`#${SiGitHex}`} /> },
            ]}
          >
            {({ active }) => <RepoExplainer active={active} />}
          </ExplainerCard>

          <ExplainerCard
            title="Build With Remote AI"
            caption="Your phone controls the session, the agent mediates prompts and approvals, the filesystem stays on the VPS, and named AI providers help assemble the app."
            legend={[
              { label: 'Claude', icon: <SiClaude size={14} color={`#${SiClaudeHex}`} /> },
              { label: 'Codex', icon: <BrandAssetIcon src={brandAssets.codexBlack} alt="Codex" /> },
              { label: 'Copilot', icon: <SiGithubcopilot size={14} color={`#${SiGithubcopilotHex}`} /> },
            ]}
          >
            {({ active }) => <AiBuildExplainer active={active} />}
          </ExplainerCard>
        </div>
      </div>
    </section>
  )
}
