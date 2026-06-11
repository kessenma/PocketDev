import { createFileRoute, Link } from '@tanstack/react-router'
import { InstallCommand } from '#/components/landing/InstallCommand'
import { ExternalLink } from '#/components/ui/ExternalLink'
import { docsTokens } from '#/components/docs/theme'

export const Route = createFileRoute('/agent')({
  staticData: { navLabel: 'Agent', navOrder: 3 },
  component: AgentPage,
})

const DEMO_URL = 'https://pocketdev.run/console-demo/index.html#/console'

function DemoButton() {
  return (
    <p>
      <a
        href={DEMO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium no-underline transition-opacity hover:opacity-90"
        style={{
          backgroundColor: docsTokens.colors.primary,
          borderColor: docsTokens.colors.primary,
          color: docsTokens.colors.background,
        }}
      >
        Try the live console demo →
      </a>
    </p>
  )
}

function AgentPage() {
  return (
    <>
      <h1>Agent</h1>
      <p>
        The PocketDev agent is the self-hosted runtime at the center of the system — a single{' '}
        <ExternalLink href="https://bun.sh">Bun</ExternalLink> +{' '}
        <ExternalLink href="https://elysiajs.com">Elysia</ExternalLink> process you install on your
        own Linux server. It pairs with your phone, spawns and streams AI coding tasks, exposes an
        interactive terminal, brokers file and git operations, proxies your dev server for preview,
        and serves a browser-based admin console — all over one port.
      </p>

      <h2>Try the console</h2>
      <p>
        Every agent serves a browser-based control plane called the <strong>console</strong>. The
        demo below is the exact console UI running entirely in your browser against sample data —
        no install, no server, nothing to pair. Click around: inspect tool readiness, browse the
        sample repository, review tasks and diagnostics, and open the terminal.
      </p>
      <DemoButton />

      <h2>Install</h2>
      <p>Run this on your server to install the agent as a systemd service on port <code>4387</code>:</p>
      <InstallCommand />
      <p>
        On first boot the agent generates an Ed25519 keypair and a short-lived setup code, then
        opens the console for admin account creation. See{' '}
        <Link to="/get-started">Get Started</Link> for the full pairing walkthrough.
      </p>

      <h2>Single-port architecture</h2>
      <p>
        Everything the agent does is reachable through one Elysia process under the{' '}
        <code>/PocketDev/</code> namespace. There are no extra daemons or ports to manage (aside
        from the optional wake server — see <Link to="/architecture">Architecture</Link>).
      </p>
      <ul>
        <li><code>GET /PocketDev/health</code> — health check and first-boot pairing status</li>
        <li><code>/PocketDev/api/console/*</code> — console admin auth, pairing, diagnostics, repo inspection</li>
        <li><code>/PocketDev/api/pair</code> — one-time mobile device pairing</li>
        <li><code>/PocketDev/api/files/*</code>, <code>/api/git/*</code>, <code>/api/projects/*</code> — authenticated device REST API</li>
        <li><code>/PocketDev/ws</code> — task command and event WebSocket</li>
        <li><code>/PocketDev/ws/terminal</code> — interactive PTY shell session</li>
        <li><code>/PocketDev/preview/*</code> — reverse proxy to your local dev server</li>
        <li><code>/PocketDev/*</code> — static catch-all that serves the console SPA</li>
      </ul>

      <h2>Key services</h2>
      <ul>
        <li>
          <strong>Task manager</strong> — spawns Claude, Codex, Copilot, or shell processes, streams
          stdout/stderr line-by-line to paired devices, and auto-detects the dev server port from
          task output.
        </li>
        <li>
          <strong>Terminal</strong> — allocates a real PTY via the <code>script</code> command and
          streams it over a WebSocket. One session per connection, torn down on disconnect.
        </li>
        <li>
          <strong>File API</strong> — tree listing, read/write, search (ripgrep with a grep
          fallback), all path-validated against the project directory to prevent traversal.
        </li>
        <li>
          <strong>Dev preview proxy</strong> — forwards <code>/preview/*</code> to your running dev
          server so you can view it from the mobile app.
        </li>
        <li>
          <strong>Setup &amp; pairing</strong> — a one-time 15-minute setup code and Ed25519 device
          enrollment, disabled the moment a device is paired.
        </li>
      </ul>

      <h2>Local state</h2>
      <p>
        The agent is stateless apart from a self-contained <strong>SQLite</strong> database (via{' '}
        <code>bun:sqlite</code> + Drizzle) living under <code>$POCKETDEV_DATA_DIR</code>. It tracks
        paired devices, task history and streaming logs, agent plans, detected CLI tool paths, and
        the console admin account. Migrations apply automatically on startup, so updates never
        require a manual database step.
      </p>

      <h2>The web console</h2>
      <p>
        The console is a React 19 + Vite SPA (with <ExternalLink href="https://xtermjs.org">xterm.js</ExternalLink>{' '}
        and <ExternalLink href="https://ui.shadcn.com">shadcn/ui</ExternalLink>) that the agent
        serves directly. It is where the server owner creates the admin account, pairs and manages
        devices via a QR code and passcode, monitors toolchain readiness, inspects the active
        repository, reviews task history, and opens a full server terminal — all from a browser.
      </p>
      <DemoButton />

      <h2>Security</h2>
      <ul>
        <li>Setup mode is temporary — a 15-minute, one-time setup code that disables after pairing.</li>
        <li>Each device authenticates with its own Ed25519 keypair; there are no long-term shared secrets.</li>
        <li>The browser console has a separate admin account with a cookie session.</li>
        <li>File, git, terminal, and preview actions are mediated by the agent rather than exposing direct host access.</li>
        <li>Operational data stays local to the machine you control.</li>
      </ul>
      <p>
        For the full trust model, port-locking, and wire protocol, see the{' '}
        <Link to="/architecture">Architecture</Link> page.
      </p>
    </>
  )
}
