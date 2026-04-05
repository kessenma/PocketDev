import {
  SiClaude,
  SiClaudeHex,
  SiGithub,
  SiGithubHex,
  SiGithubcopilot,
  SiGithubcopilotHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiPython,
  SiPythonHex,
} from '@icons-pack/react-simple-icons'
import { Wrench } from 'lucide-react'
import { brandAssets } from './brand-assets'
import { BrandAssetIcon } from './BrandAssetIcon'
import { architectureTextStyles, architectureTokens } from './theme'

const groups = [
  {
    title: 'Required setup',
    hint: 'Complete Git and package-manager setup before heavier workspace flows begin.',
    items: [
      { label: 'Git + GitHub CLI', icon: <SiGithub size={16} color={`#${SiGithubHex}`} /> },
      { label: 'Node and package tools', icon: <SiNodedotjs size={16} color={`#${SiNodedotjsHex}`} /> },
    ],
  },
  {
    title: 'AI assistant',
    hint: 'Choose at least one assistant path depending on how you want the server to work.',
    items: [
      { label: 'Claude', icon: <SiClaude size={16} color={`#${SiClaudeHex}`} /> },
      { label: 'Codex', icon: <BrandAssetIcon src={brandAssets.codexBlack} alt="Codex" size={16} /> },
      { label: 'GitHub Copilot', icon: <SiGithubcopilot size={16} color={`#${SiGithubcopilotHex}`} /> },
    ],
  },
  {
    title: 'Language support',
    hint: 'Python and related language tooling unlock setup inspection and more capable workspace automation.',
    items: [
      { label: 'Python runtime', icon: <SiPython size={16} color={`#${SiPythonHex}`} /> },
    ],
  },
] as const

export function SetupReadiness() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div
          className="rounded-[1.5rem] border px-5 py-5 sm:px-6"
          style={{
            ...architectureTextStyles.surface,
            borderColor: architectureTokens.colors.border,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${architectureTokens.colors.red}18` }}
            >
              <Wrench size={18} color={architectureTokens.colors.red} strokeWidth={2.2} />
            </div>
            <div>
              <p style={architectureTextStyles.sectionEyebrow}>Workspace Readiness</p>
              <h2 className="mt-2 text-xl sm:text-2xl" style={architectureTextStyles.cardTitle}>
                PocketDev treats setup as guided capability enablement
              </h2>
              <p className="mt-3 max-w-3xl text-sm sm:text-base" style={architectureTextStyles.bodyText}>
                The mobile setup flow does not just check whether binaries exist. It groups tools by role,
                opens dedicated wizards for Git and AI tools, and blocks dependent paths until the
                server has what that workflow actually needs.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.title}
                className="rounded-[1.25rem] border p-4"
                style={architectureTextStyles.surface}
              >
                <h3 className="text-sm" style={architectureTextStyles.cardTitle}>
                  {group.title}
                </h3>
                <p className="mt-2 text-sm" style={architectureTextStyles.bodyText}>
                  {group.hint}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-full border px-3 py-2"
                      style={architectureTextStyles.surface}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                      <span className="text-sm" style={architectureTextStyles.strongText}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
