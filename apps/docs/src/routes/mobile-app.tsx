import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mobile-app')({
  staticData: { navLabel: 'Mobile App', navOrder: 4 },
  component: MobileAppPage,
})

function MobileAppPage() {
  return (
    <>
      <h1>Mobile App</h1>
      <p>
        PocketDev includes a mobile app for connecting to your self-hosted PocketDev agent and
        managing coding tasks remotely.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Launch and monitor AI coding tasks (Claude, Codex) from your phone</li>
        <li>Browse and edit files on the remote server</li>
        <li>Review git diffs and manage branches</li>
        <li>Monitor Docker containers and follow live logs</li>
        <li>Interactive server terminal with AI-assisted debugging</li>
        <li>Manage running services and inspect listening ports</li>
      </ul>

      <h2>Server Debug</h2>
      <p>
        The Server Debug screen gives you a live terminal connected to your server alongside a
        real-time snapshot of containers, ports, and system metrics — all in one place. Describe
        the problem you're investigating, run quick-action commands, and use the built-in AI Assist
        button to invoke <code>claude --print</code> directly in the terminal with your problem
        description and recent output as context.
      </p>
      <p>
        Accessible from <strong>Settings → Server Debug</strong> when connected to a paired server.
      </p>

      <h2>iOS</h2>
      <p>
        The iOS app is available on the App Store.
      </p>
      <p>
        <a href="https://apps.apple.com/us/app/pocket-dev/id6762034037" target="_blank" rel="noopener noreferrer">
          Download PocketDev on the App Store →
        </a>
      </p>

      <h2>Android</h2>
      <p>
        Android is coming soon.
      </p>
    </>
  )
}
