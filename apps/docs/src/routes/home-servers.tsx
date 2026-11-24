import { createFileRoute, Link } from '@tanstack/react-router'
import { InstallCommand } from '#/components/landing/InstallCommand'
import { ExternalLink } from '#/components/ui/ExternalLink'
import { HomeServerIllustration } from '#/components/illustrations/HomeServerIllustration'
import { Screenshot, ScreenshotRow } from '#/components/docs/Screenshot'

export const Route = createFileRoute('/home-servers')({
  staticData: { navLabel: 'Running on a Home Server', navOrder: 1.5 },
  component: HomeServersPage,
})

const TAILSCALE_MAC_PKG = 'https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg'

function HomeServersPage() {
  return (
    <>
      <h1>Running on a Home Server</h1>
      <p>
        PocketDev doesn't need a cloud VPS. You can run the agent on a computer at home, such as a Mac mini
        on your desk or a Linux box in a closet, and control it from your phone anywhere. This page explains
        how that works and how to set it up.
      </p>
      <HomeServerIllustration />

      <h2>Why a home server needs one extra step</h2>
      <p>
        A VPS has a public IP address, so your phone can connect to it from anywhere. A computer at home sits
        behind your router, which only lets devices on the <strong>same Wi-Fi</strong> reach it. Once you
        leave the house, your phone can no longer find it.
      </p>
      <p>
        <strong>Don't fix this by port-forwarding</strong> <code>4387</code> on your router. That exposes the
        agent, and the shell access it provides, to the whole internet. Use{' '}
        <ExternalLink href="https://tailscale.com">Tailscale</ExternalLink> instead. It's a free private
        network (a "tailnet") that links your computer and your phone directly with WireGuard encryption.
        Nothing is opened on your router, and only your own devices can connect.
      </p>
      <p>
        PocketDev sets up Tailscale <strong>before you pair</strong>, so the pairing code already contains an
        address that works from anywhere. You pair once, and it keeps working on Wi-Fi, cellular, or someone
        else's network.
      </p>

      <h2>What you need</h2>
      <ul>
        <li>
          A Mac (Apple Silicon or Intel) or a Linux machine that stays on. See{' '}
          <a href="#always-on">keeping it always on</a> below.
        </li>
        <li>
          A free <ExternalLink href="https://login.tailscale.com/start">Tailscale account</ExternalLink>. You can
          sign in with Google, GitHub, Microsoft or Apple.
        </li>
        <li>
          The Tailscale app on your phone (
          <ExternalLink href="https://apps.apple.com/app/tailscale/id1470499037">iPhone</ExternalLink>,{' '}
          <ExternalLink href="https://play.google.com/store/apps/details?id=com.tailscale.ipn">Android</ExternalLink>),
          signed in with the <strong>same account</strong>.
        </li>
      </ul>

      <h2>Install on a Mac</h2>
      <p>
        Open Terminal on the Mac and run the same install command as on Linux, as your normal user and{' '}
        <strong>without sudo</strong>:
      </p>
      <InstallCommand />
      <p>
        On macOS the installer runs the agent as a background service under your user account (a launchd
        LaunchAgent), not as root. That's deliberate: Claude Code and the GitHub CLI keep their logins in
        your macOS Keychain, which only processes running as you can read. Everything is installed under{' '}
        <code>~/.pocketdev</code>, and logs go to <code>~/Library/Logs/PocketDev/agent.log</code>.
      </p>
      <p>
        Install <ExternalLink href="https://brew.sh">Homebrew</ExternalLink> and the Xcode Command Line Tools
        (<code>xcode-select --install</code>) first. PocketDev's setup wizards use Homebrew to install tools
        like Node, the GitHub CLI and tmux on a Mac.
      </p>
      <p>
        If you build iOS apps, a Mac at home can also sign and upload them to TestFlight for you. See{' '}
        <Link to="/ios-developers">Shipping iOS Apps</Link>.
      </p>

      <h2>Set up Tailscale</h2>
      <p>You can do this from the installer or from the web console. Both run the same steps.</p>

      <h3>Installing the Tailscale app on a Mac</h3>
      <p>
        Both options start by installing the Tailscale app. This is what it looks like (red boxes mark what
        to click):
      </p>
      <ScreenshotRow>
        <Screenshot
          src="/screenshots/tailscale/01-installer.webp"
          width={1000}
          height={723}
          alt="The Tailscale installer on the Install step"
          caption="1. Run the installer: Continue, then Install, and enter your Mac's password."
        />
        <Screenshot
          src="/screenshots/tailscale/02-grant-permissions.webp"
          width={1100}
          height={310}
          alt="Tailscale's Required permissions screen with a Grant permissions button for the system extension"
          caption="2. Open Tailscale. Under Required permissions, click Grant permissions."
        />
      </ScreenshotRow>
      <ScreenshotRow>
        <Screenshot
          src="/screenshots/tailscale/03-approve-extension.webp"
          width={520}
          height={754}
          variant="dialog"
          alt="macOS dialog: System Extension Approval Required, with an Open Settings button"
          caption={
            <>
              3. Click Open Settings, then turn on Tailscale under General → Login Items &amp; Extensions →
              Network Extensions.
            </>
          }
        />
        <Screenshot
          src="/screenshots/tailscale/04-start-at-login.webp"
          width={1100}
          height={378}
          alt="Tailscale's Quality of life settings with the Start at login switch"
          caption="4. Turn on Start at login, so Tailscale comes back after a restart. Then click Next and Log In."
        />
      </ScreenshotRow>

      <h3>Option A: let the installer walk you through it</h3>
      <p>
        If Tailscale isn't connected, the installer asks <code>Set up Tailscale now? [Y/n]</code>. Press
        Enter, and it will:
      </p>
      <ol>
        <li>
          Open the <ExternalLink href={TAILSCALE_MAC_PKG}>Tailscale download for Mac</ExternalLink>. Install
          it, open Tailscale, and click <strong>Allow</strong> when macOS asks about the system extension.
          Then, in Tailscale → Settings, choose <strong>CLI integration → Install</strong>.
        </li>
        <li>Open the Tailscale login page in your browser. Sign in, and the installer continues automatically.</li>
        <li>
          Turn on <strong>Tailscale Serve</strong>, which gives the agent a private HTTPS address like{' '}
          <code>https://mac-mini.tail1234.ts.net</code>. If HTTPS isn't enabled for your tailnet yet, it opens
          Tailscale's approval page first.
        </li>
      </ol>
      <p>
        You can press <code>s</code> at any waiting step to skip it and finish later in the console. To
        do the whole thing without being asked, run:
      </p>
      <InstallCommand command="curl -fsSL https://pocketdev.run/install.sh | bash -s -- --tailscale-serve" />

      <h3>Option B: from the web console</h3>
      <p>
        Open <code>http://localhost:4387/PocketDev/setup</code> on the computer and create your admin account.
        On home networks, the <strong>Security</strong> page starts with a <strong>Remote Access</strong> card
        that asks how your phone will reach this machine:
      </p>
      <Screenshot
        src="/screenshots/tailscale/console-remote-access.webp"
        width={1200}
        height={562}
        alt="The Remote Access card in the PocketDev console, showing the Tailscale checklist"
        caption="The Remote Access card after choosing From anywhere."
      />
      <ul>
        <li>
          <strong>From anywhere (recommended):</strong> a live checklist that updates as you go:
          <ol>
            <li>Tailscale installed on this machine</li>
            <li>This machine logged into Tailscale (<strong>Log in</strong> opens the sign-in link)</li>
            <li>
              MagicDNS and HTTPS Certificates enabled in the{' '}
              <ExternalLink href="https://login.tailscale.com/admin/dns">Tailscale admin console</ExternalLink>
            </li>
            <li>PocketDev served over HTTPS (<strong>Enable HTTPS via Tailscale Serve</strong>)</li>
            <li>Tailscale installed on your phone</li>
            <li>
              Key expiry disabled for this machine (recommended, under{' '}
              <ExternalLink href="https://login.tailscale.com/admin/machines">Machines</ExternalLink>), so it
              doesn't drop off your tailnet every 180 days
            </li>
          </ol>
        </li>
        <li>
          <strong>Same Wi-Fi only:</strong> pair right away using the computer's local address (for example{' '}
          <code>192.168.1.81</code>). The app only connects while your phone is on that Wi-Fi. You can switch
          to Tailscale later, but you'll need to pair again.
        </li>
      </ul>

      <h2>Pair your phone</h2>
      <ol>
        <li>Make sure Tailscale is installed and <strong>connected</strong> on your phone.</li>
        <li>
          In the console, go to the Pairing section. Once Tailscale Serve is on, the pairing code points at
          your machine's <code>https://….ts.net</code> address.
        </li>
        <li>Scan the QR code or paste the setup code in the PocketDev app. See <Link to="/get-started">Get Started</Link> for details.</li>
      </ol>
      <p>
        If the app can't reach the computer, it tells you why. For a Tailscale address it asks whether
        Tailscale is on, with buttons to get the app and retry. For a local address it reminds you to join
        the same Wi-Fi.
      </p>
      <p>
        <strong>Passkeys</strong> for the web console only work over HTTPS on a real domain name. Open the
        console at <code>https://&lt;your-machine&gt;.&lt;tailnet&gt;.ts.net/PocketDev/console</code> to
        register one. Passkeys are tied to that exact name, so renaming the machine or your tailnet means
        registering them again. Keep your password as a fallback.
      </p>

      <h2 id="always-on">Keeping a Mac mini always on</h2>
      <p>
        A home server is only useful if it's awake. The installer checks the following and warns about
        anything that's off:
      </p>
      <ul>
        <li>
          <strong>Never sleep</strong> (display sleep is fine):{' '}
          <code>sudo pmset -a sleep 0 disksleep 0 autorestart 1</code>. <code>autorestart</code> powers the
          Mac back on after a power cut.
        </li>
        <li>
          <strong>Automatic login:</strong> System Settings → Users &amp; Groups → <em>Automatically log in
          as…</em>. The agent runs as your user, so it starts once you're logged in.
        </li>
        <li>
          <strong>FileVault</strong> turns off automatic login. After a reboot the Mac waits at the unlock
          screen, and PocketDev stays offline until someone logs in. Turning FileVault off on a machine that
          never leaves the house is a security trade-off you'll have to weigh yourself.
        </li>
        <li>
          <strong>Tailscale:</strong> turn on <em>Start at login</em> in the Tailscale app, and disable key
          expiry for the machine.
        </li>
        <li>
          <strong>Folder permissions:</strong> macOS asks before any app reads Desktop, Documents, Downloads
          or iCloud Drive. Keep your projects somewhere like <code>~/code</code> to avoid those prompts on a
          headless machine.
        </li>
      </ul>

      <h2>Linux home servers</h2>
      <p>
        A Linux machine at home works the same way. The agent detects when it has no public IP address and
        shows the Remote Access card in the console. Install Tailscale with{' '}
        <ExternalLink href="https://tailscale.com/download/linux">Tailscale's Linux instructions</ExternalLink>,
        then follow the checklist in the console. The guided prompt inside the installer is currently
        macOS-only.
      </p>

      <h2>Useful commands (macOS)</h2>
      <ul>
        <li>Logs: <code>tail -f ~/Library/Logs/PocketDev/agent.log</code></li>
        <li>Restart: <code>launchctl kickstart -k gui/$(id -u)/run.pocketdev.agent</code></li>
        <li>Health check: <code>curl http://localhost:4387/PocketDev/health</code></li>
        <li>Tailscale Serve status: <code>tailscale serve status</code></li>
        <li>Turn Serve off: <code>tailscale serve --https=443 off</code></li>
        <li>
          Uninstall:{' '}
          <code>curl -fsSL https://pocketdev.run/install-macos.sh | bash -s -- --uninstall</code>
        </li>
      </ul>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          <strong>"Is Tailscale on?" in the app:</strong> open Tailscale on your phone, check that it's
          connected and signed into the same account as the computer, then tap Retry.
        </li>
        <li>
          <strong>Serve won't turn on:</strong> enable <em>MagicDNS</em> and <em>HTTPS Certificates</em> on
          the <ExternalLink href="https://login.tailscale.com/admin/dns">DNS page</ExternalLink> of the admin
          console. The console shows a direct approval link when this is the problem.
        </li>
        <li>
          <strong>"Already serves … on https :443":</strong> another app already uses Tailscale Serve on this
          machine, and PocketDev won't overwrite it. Remove it with{' '}
          <code>tailscale serve --https=443 off</code> if you don't need it.
        </li>
        <li>
          <strong>The QR code says localhost:</strong> the phone can't use that. Set up Tailscale, or choose
          "Same Wi-Fi only" so the code uses the computer's local address.
        </li>
        <li>
          <strong>Android won't pair over Wi-Fi:</strong> release builds of the Android app block plain HTTP.
          Use Tailscale Serve, which provides HTTPS.
        </li>
      </ul>
    </>
  )
}
