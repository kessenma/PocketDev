import { createFileRoute } from '@tanstack/react-router'
import { InstallCommand } from '#/components/landing/InstallCommand'

export const Route = createFileRoute('/docs/get-started')({
  component: GetStartedPage,
})

function GetStartedPage() {
  return (
    <>
      <h1>Get Started</h1>
      <p>
        PocketDev is a mobile-first interface for controlling AI coding agents on remote servers.
        Install it on any Linux VPS, pair your phone, and control Claude or Codex from anywhere.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>A Linux server (Ubuntu 20.04+, Debian 11+, or similar) with SSH access</li>
        <li>At least 1 GB of RAM and 2 GB of disk space</li>
        <li>An AI CLI tool installed on the server (Claude Code, Codex, etc.)</li>
        <li>A mobile device running iOS 16+ or Android 13+</li>
      </ul>

      <h2>Installation</h2>
      <p>
        Run this one-liner on your server to install the PocketDev agent:
      </p>
      <InstallCommand />
      <p>
        The installer will set up the PocketDev agent as a systemd service on port <code>4387</code>.
        Once complete, it prints a <strong>setup code</strong> you'll use to pair your device.
      </p>

      <h2>Pairing Your Device</h2>
      <ol>
        <li>Open the PocketDev app on your phone</li>
        <li>Tap <strong>Add Server</strong></li>
        <li>Enter your server's IP address or hostname</li>
        <li>Enter the setup code displayed during installation</li>
        <li>Your device is now paired — the setup code expires after first use</li>
      </ol>
      <p>
        Pairing creates an Ed25519 keypair on your device. All future connections are
        authenticated with this key — no passwords or tokens to manage.
      </p>

      <h2>Your First Task</h2>
      <p>
        Once paired, you can start an AI coding task from the Tasks screen:
      </p>
      <ol>
        <li>Tap the <strong>+</strong> button to create a new task</li>
        <li>Type a prompt describing what you want the AI to do</li>
        <li>Choose your agent (Claude, Codex, or a custom CLI)</li>
        <li>Watch the output stream in real-time as the agent works</li>
      </ol>
      <p>
        You can also open the built-in terminal for direct shell access, browse and edit files,
        and preview your dev server — all from your phone.
      </p>

      <h2>Next Steps</h2>
      <p>
        More documentation is coming soon. In the meantime, check out the{' '}
        <a href="/architecture">architecture overview</a> for a deeper look at how PocketDev works.
      </p>
    </>
  )
}
