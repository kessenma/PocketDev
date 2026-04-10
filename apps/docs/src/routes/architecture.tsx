import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/architecture')({
  component: ArchitecturePage,
})

function ArchitecturePage() {
  return (
    <>
      <h1>Architecture</h1>
      <p>
        PocketDev is split into a hosted website, a self-hosted agent runtime, a browser-based
        console, and a mobile app. The public website and the self-hosted runtime are separate
        products. Your live server state, paired devices, terminal sessions, and workspace actions
        stay with the agent running on your own machine.
      </p>

      <h2>System Overview</h2>
      <p>
        The core runtime is the PocketDev agent, a Bun and Elysia process running on your Linux
        server. It handles pairing, task orchestration, terminal sessions, file access, preview
        proxying, and local SQLite-backed runtime state.
      </p>
      <p>
        The console is a browser-based control plane served by that agent. It is used for admin
        setup, diagnostics, pairing, repository inspection, and direct terminal access.
      </p>
      <p>
        The mobile app is the remote workspace interface. It is designed for tasks, plans, files,
        git actions, project switching, container operations, and guided setup flows from a phone
        or tablet.
      </p>
      <p>
        Shared contracts live in `@pocketdev/shared`, which keeps the wire protocol, schema
        definitions, theme tokens, and cryptographic primitives aligned across the monorepo.
      </p>

      <h2>Workspace Readiness Model</h2>
      <p>
        PocketDev treats setup as capability enablement instead of a flat checklist. The app groups
        tooling by role and blocks workflows until the server has what that workflow actually
        requires.
      </p>
      <p>
        The first readiness group is required setup: Git, GitHub CLI, and a Node-compatible package
        manager path. Without those pieces, repository and script workflows remain incomplete.
      </p>
      <p>
        The second group is AI assistant support. PocketDev is built to work with at least one
        assistant path such as Claude, Codex, or GitHub Copilot, depending on how the server is
        configured.
      </p>
      <p>
        The third group is language support. Python is especially important because it unlocks more
        capable setup inspection and automation paths.
      </p>

      <h2>Agent API Surface</h2>
      <p>
        The self-hosted agent exposes a single-port interface under the `PocketDev` namespace, but
        that surface includes several distinct product areas.
      </p>
      <h3>Console and Setup Endpoints</h3>
      <ul>
        <li><code>GET /PocketDev/health</code> for health checks and first-boot status</li>
        <li><code>/PocketDev/api/console/*</code> for admin auth, passcode flows, pairing status, diagnostics, and repository inspection</li>
        <li><code>/PocketDev/api/pair</code> for mobile pairing handshakes</li>
        <li><code>/PocketDev/*</code> as the static catch-all that serves the console SPA</li>
      </ul>
      <h3>Realtime Transport</h3>
      <ul>
        <li><code>/PocketDev/ws</code> for task commands, plan events, file approvals, and streamed server state</li>
        <li><code>/PocketDev/ws/terminal</code> for interactive PTY-backed terminal sessions</li>
      </ul>
      <h3>Device REST Endpoints</h3>
      <ul>
        <li><code>/PocketDev/api/files/*</code> for tree browsing, reads, search, and file approval workflows</li>
        <li><code>/PocketDev/api/git/*</code> for change inspection, commits, branch actions, and pushes</li>
        <li><code>/PocketDev/api/projects/*</code> for repository selection, cloning, and active project switching</li>
        <li><code>/PocketDev/api/containers/*</code> for listing containers, lifecycle actions, and logs</li>
      </ul>
      <h3>Preview Proxy</h3>
      <ul>
        <li><code>/PocketDev/preview/*</code> for reverse proxying the active development server running on the host</li>
      </ul>

      <h2>Security Model</h2>
      <p>
        PocketDev separates trust boundaries between the public website, the self-hosted agent, and
        the paired clients that talk to that agent.
      </p>
      <ul>
        <li>Each paired device generates its own Ed25519 keypair. The agent stores the public key, and signed requests prove device identity.</li>
        <li>Mobile pairing uses short-lived passcodes and explicit approval so the server owner controls enrollment.</li>
        <li>The browser console has its own admin account and cookie session, separate from device key-based authentication.</li>
        <li>File, git, terminal, and preview actions are mediated by the agent instead of exposing direct host access from clients.</li>
        <li>Operational runtime data stays local to the machine you control, primarily in SQLite on the agent and secure local client storage on devices.</li>
      </ul>

      <h2>Wire Protocol</h2>
      <p>
        The typed protocol shared by PocketDev covers more than task output. It also supports plans,
        setup diagnostics, terminal sessions, container logs, and connection-health events through a
        common message envelope.
      </p>
      <h3>Example Commands</h3>
      <ul>
        <li><code>task.start</code></li>
        <li><code>task.kill</code></li>
        <li><code>task.input</code></li>
        <li><code>container.logs.follow</code></li>
        <li><code>terminal.input</code></li>
        <li><code>setup.check_prerequisites</code></li>
        <li><code>plan.answer</code></li>
        <li><code>plan.accept</code></li>
      </ul>
      <h3>Example Events</h3>
      <ul>
        <li><code>task.output</code></li>
        <li><code>task.status_changed</code></li>
        <li><code>task.completed</code></li>
        <li><code>terminal.output</code></li>
        <li><code>setup.prerequisites_result</code></li>
        <li><code>plan.proposed</code></li>
        <li><code>plan.step_updated</code></li>
        <li><code>plan.resolved</code></li>
      </ul>
      <pre>{`{
  type: "plan.step_updated",
  id: "msg_01",
  payload: { step_id: "step_repo", status: "completed" },
  timestamp: 1712000000
}`}</pre>

      <h2>Tech Stack</h2>
      <p>
        PocketDev uses different runtimes for the hosted web layer, the self-hosted agent, and the
        user-facing clients, but keeps them aligned with shared TypeScript contracts.
      </p>
      <ul>
        <li><strong>Hosted web:</strong> TanStack Start, Vite, Postgres, and <code>@pocketdev/db</code></li>
        <li><strong>Agent:</strong> Bun, Elysia, SQLite with Drizzle, and PTY/process orchestration</li>
        <li><strong>Console:</strong> React 19, Vite, <code>react-router-dom</code>, xterm.js, shadcn/ui, and Tailwind 4</li>
        <li><strong>Mobile:</strong> React Native 0.83, Rock CLI with Re.Pack, Zustand, MMKV, and Keychain-backed storage</li>
        <li><strong>Shared:</strong> typed WebSocket protocol, Zod schemas, theme tokens, and <code>@noble/ed25519</code></li>
        <li><strong>Tooling:</strong> Claude, Codex, and Copilot CLIs plus git, ripgrep, and local dev servers</li>
      </ul>

      <h2>Separation Between Marketing and Docs</h2>
      <p>
        The public architecture page on the main site can stay focused on product positioning and
        high-level explanation. This documentation page is intended to hold the more concrete
        implementation details, protocol surface, and system model over time.
      </p>
    </>
  )
}
