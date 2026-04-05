import { Card, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { architectureTextStyles } from './theme'

const principles = [
  {
    title: 'Ed25519 Keypair Auth',
    description:
      'Each paired device generates its own Ed25519 keypair. The agent stores only the public key, while signed requests prove device identity without sharing long-lived secrets.',
  },
  {
    title: 'One-Time Pairing Passcodes',
    description:
      'Mobile pairing flows through short-lived passcodes and explicit approval state. That gives the server owner a clear enrollment step before any device gains API access.',
  },
  {
    title: 'Separate Admin and Device Trust',
    description:
      'The browser console uses its own admin account and cookie session, while mobile devices authenticate with public-key cryptography. Those two trust paths stay distinct.',
  },
  {
    title: 'Scoped Host Access',
    description:
      'File, repo, terminal, and preview actions are mediated by the agent. Path validation, active project selection, and explicit endpoint boundaries keep host access centralized in one process.',
  },
  {
    title: 'Local-First Server State',
    description:
      'Operational data lives on the box that you control: SQLite for the agent runtime and OS keychain or MMKV on clients. The hosted website is separate from your server session data.',
  },
]

export function SecurityModel() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          <span style={architectureTextStyles.sectionEyebrow}>
            Security Model
          </span>
        </h2>
        <p className="mb-10 text-lg text-muted-foreground" style={architectureTextStyles.sectionLead}>
          The security model is now split across three boundaries: the public
          website, the self-hosted agent, and the paired clients that talk to
          that agent. Each layer has a narrower role than before.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {principles.map((p) => (
            <Card key={p.title} className="border bg-transparent shadow-none before:hidden after:hidden" style={architectureTextStyles.surface}>
              <CardHeader>
                <CardTitle className="text-base" style={architectureTextStyles.cardTitle}>{p.title}</CardTitle>
                <CardDescription style={architectureTextStyles.bodyText}>{p.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
