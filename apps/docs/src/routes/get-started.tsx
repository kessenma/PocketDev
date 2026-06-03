import { createFileRoute, Link } from '@tanstack/react-router'
import { InstallCommand } from '#/components/landing/InstallCommand'
import { ExternalLink } from '#/components/ui/ExternalLink'

export const Route = createFileRoute('/get-started')({
  component: GetStartedPage,
})

function GetStartedPage() {
  return (
    <>
      <h1>Get Started</h1>
      <p>
        PocketDev is a mobile-first interface for controlling AI coding agents on remote servers.
        Install it on a Linux machine running Ubuntu 24.04, pair your phone, and control Claude, Codex, or GitHub Copilot from anywhere.
        The source code is available at{' '}
        <ExternalLink href="https://github.com/kessenma/PocketDev">github.com/kessenma/PocketDev</ExternalLink>.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>A Linux server (<ExternalLink href="https://releases.ubuntu.com/24.04/">Ubuntu 24.04+</ExternalLink> has been tested but other distributions may work) with SSH access</li>
        <li>At least 1 GB of RAM and 2 GB of disk space</li>
        <li>A mobile device running iOS 16+ (Android coming soon)</li>
      </ul>

      <h2>Installation</h2>
      <p>
        Run this on your server to install the PocketDev agent:
      </p>
      <InstallCommand />
      <p>
        The installer will set up the PocketDev agent as a systemd service on port <code>4387</code>.
      </p>

      <h2>Logging into the PocketDev Agent web app</h2>
      <ol>
        <li>Open the PocketDev app on port <code>4387</code>/PocketDev/console of your server in a web browser</li>
        <li>Setup your admin account</li>
        <li>Login</li>
        <li>Navigate to the Pairing section</li>
        <li>Copy the setup code</li>
      </ol>
      <p>Example code:</p>
      <pre>pocketdev://123.123.12.123:4387/DCCU-6451</pre>

      <h2>Pairing Your Device</h2>
      <ol>
        <li>Open the PocketDev app on your phone</li>
        <li>Paste the <strong>setup code</strong></li>
        <li>Click pair workspace</li>
      </ol>
      <p>
        Pairing creates an Ed25519 keypair on your device. All future connections are
        authenticated with this key.
      </p>

      <h2>Setup Wizards</h2>
      <p>
        Once paired, the app opens the <strong>Workspace Tools</strong> screen — a guided setup flow
        that detects what's installed on your server and walks you through configuring everything
        PocketDev needs to run AI coding tasks. <strong>You must complete setup before you can
        start tasks.</strong>
      </p>
      <p>
        The setup checklist groups tools into categories:
      </p>
      <ul>
        <li><strong>Required Tools</strong> — Git (with SSH key + GitHub CLI auth) and a package manager (npm, pnpm, or yarn)</li>
        <li><strong>AI Assistants</strong> — At least one of Claude, Codex, or GitHub Copilot must be authenticated</li>
        <li><strong>Languages</strong> — Python, Rust, Go, TypeScript (detected automatically)</li>
        <li><strong>Infrastructure</strong> — Docker (optional)</li>
      </ul>
      <p>
        Your workspace is ready when the required tools, at least one AI assistant, and Python are all configured.
        If an install step fails, you can tap <strong>AI Inspect</strong> to have an AI agent diagnose
        the failure and suggest a fix command.
      </p>

      <h2>Git &amp; SSH Setup</h2>
      <p>
        The Git wizard is the most involved setup step. It walks you through the{' '}
        <ExternalLink href="https://docs.github.com/en/authentication/connecting-to-github-with-ssh">
          full SSH + GitHub authentication flow
        </ExternalLink>{' '}
        from your phone — no need to SSH into the server yourself.
      </p>
      <h3>1. Detect</h3>
      <p>
        The wizard starts by scanning your server for existing Git config: whether Git is installed,
        whether an SSH key exists, whether GitHub SSH works, GitHub CLI status, and your
        current Git identity. Steps that are already configured are automatically skipped.
      </p>
      <h3>2. Install Git</h3>
      <p>
        If Git isn't installed, PocketDev runs <code>sudo apt-get install -y git</code> on
        your server via a live terminal session. You'll see the output in real-time
        and may be prompted for your server's sudo password.
      </p>
      <h3>3. Generate SSH Key</h3>
      <p>
        PocketDev generates an Ed25519 SSH key pair on the server at <code>~/.ssh/id_ed25519</code>.
        The <strong>private key never leaves the server</strong> — only the public key is displayed
        for you to copy. If a key already exists, you can keep it or generate a new one.
      </p>
      <h3>4. Add Key to GitHub</h3>
      <p>
        The app displays your public key with a copy button, then opens
        GitHub's SSH key settings page in your browser. You paste the key, name
        it (e.g. "PocketDev"), and click "Add key" on GitHub. Then return to the app
        and confirm.
      </p>
      <h3>5. Test Connection</h3>
      <p>
        The server runs <code>ssh -T git@github.com</code> to verify the key is registered.
        On success, it shows your GitHub username. If it fails, you can go back and
        re-add the key.
      </p>
      <h3>6. Install GitHub CLI</h3>
      <p>
        PocketDev installs the <code>gh</code> CLI from GitHub's official APT repository.
        This enables private repository discovery in the project picker.
      </p>
      <h3>7. Authenticate GitHub CLI</h3>
      <p>
        Two methods are available:
      </p>
      <ul>
        <li>
          <strong>Browser sign-in (recommended)</strong> — The app starts a device code
          flow. You'll see a one-time code, then open GitHub in your browser to enter it.
          The app polls for completion and advances automatically once you approve.
        </li>
        <li>
          <strong>Access token</strong> — Paste a GitHub personal access token directly.
        </li>
      </ul>
      <h3>8. Configure Identity</h3>
      <p>
        Set your <code>git config --global user.name</code> and <code>user.email</code> for commits.
        These fields are pre-filled if already configured on the server.
      </p>

      <h2>Code Screen</h2>
      <p>
        Once setup is complete, the <strong>Code</strong> tab gives you full access to your
        workspace's files and Git state. It has three views you can switch between:
      </p>
      <ul>
        <li><strong>Files</strong> — Browse and edit your project's file tree, search files with ripgrep, and view code with syntax highlighting</li>
        <li><strong>Git</strong> — See branches, staged/unstaged changes, commit diffs, and manage commits and pushes</li>
        <li><strong>Scripts</strong> — Run and monitor package.json scripts on your server</li>
      </ul>
      <p>
        The Code screen also shows your active project context — tap the project banner to
        switch between repositories or clone a new one.
      </p>

      <h2>Your First Task</h2>
      <p>
        With setup complete, you can start an AI coding task from the <strong>Tasks</strong> screen:
      </p>
      <ol>
        <li>Tap the <strong>+</strong> button to create a new task</li>
        <li>Type a prompt describing what you want the AI to do</li>
        <li>Choose your agent (Claude, Codex, or a custom CLI)</li>
        <li>Watch the output stream in real-time as the agent works</li>
      </ol>
      <p>
        You can also open the built-in terminal for direct shell access
        and preview your dev server — all from your phone.
      </p>

      <h2>Next Steps</h2>
      <p>
        More documentation is coming soon. In the meantime, check out the{' '}
        <Link to="/architecture">architecture overview</Link> for a deeper look at how PocketDev works.
      </p>

      <h2>Support</h2>
      <p>
        PocketDev is free and open source. If you run into issues or have questions:
      </p>
      <ul>
        <li>
          <strong>GitHub Issues</strong> — open a bug report or ask a question at{' '}
          <a href="https://github.com/kessenma/PocketDev/issues" target="_blank" rel="noopener noreferrer">
            github.com/kessenma/PocketDev/issues
          </a>
        </li>
        <li>
          <strong>Email</strong> — reach out directly at{' '}
          <a href="mailto:kessenmacher7832@gmail.com">kessenmacher7832@gmail.com</a>
        </li>
      </ul>
    </>
  )
}
