import { Card, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'

const principles = [
  {
    title: 'Ed25519 Keypair Auth',
    description:
      'Device identity is a cryptographic keypair generated on first pairing. Every WebSocket frame is signed — no passwords, no tokens to leak.',
  },
  {
    title: 'One-Time Setup Code',
    description:
      'Pairing uses a short-lived code (15 min expiry, single use). After pairing, the setup endpoint is disabled entirely.',
  },
  {
    title: 'Path Traversal Protection',
    description:
      'All file operations are sandboxed to POCKETDEV_PROJECT_DIR. Paths are validated server-side before any read or write.',
  },
  {
    title: 'No Shared Secrets',
    description:
      'The server stores only your device\'s public key. The private key never leaves your phone.',
  },
]

export function SecurityModel() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Security Model
        </h2>
        <p className="text-lg text-muted-foreground mb-10">
          Zero-trust by default. The agent exposes nothing until you explicitly
          pair a device, and every request after that is cryptographically verified.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {principles.map((p) => (
            <Card key={p.title} className="border-border bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
