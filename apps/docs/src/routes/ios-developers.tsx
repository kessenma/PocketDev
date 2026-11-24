import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink } from '#/components/ui/ExternalLink'
import { ShipIosIllustration } from '#/components/illustrations/ShipIosIllustration'

export const Route = createFileRoute('/ios-developers')({
  staticData: { navLabel: 'iOS & the App Store', navOrder: 1.6 },
  component: IosDevelopersPage,
})

const ASC_REPO = 'https://github.com/rorkai/App-Store-Connect-CLI'
const ASC_INTEGRATIONS = 'https://appstoreconnect.apple.com/access/integrations/api'

function IosDevelopersPage() {
  return (
    <>
      <h1>Shipping iOS Apps</h1>
      <p>
        If you build iOS apps, the step that usually needs your laptop is the last one: signing the build
        and uploading it. With a Mac at home running PocketDev, an agent can do that step too. You can fix a
        bug from your phone and have a TestFlight build waiting by the time you're back at your desk.
      </p>
      <ShipIosIllustration />
      <p>
        This is an <strong>optional</strong> part of the setup. It only appears when PocketDev runs on a Mac,
        and it doesn't affect anything else in the app if you skip it.
      </p>

      <h2>What a task looks like</h2>
      <p>Once the Mac is set up, you write tasks the same way as any other:</p>
      <pre>Fix the crash in the review screen and upload a TestFlight build.</pre>
      <p>
        The agent fixes the code, builds and signs the app with Xcode on the Mac, and uploads it to App Store
        Connect. If your project already has a release script (for example <code>scripts/deploy.py</code> or
        a fastlane lane), the agent is told to use it. It's also told to <strong>ask you before</strong>{' '}
        submitting anything for App Review or releasing it to the App Store. Uploading a TestFlight build is
        fine when the task asks for it.
      </p>

      <h2>What you need</h2>
      <ul>
        <li>
          A Mac running the PocketDev agent. See <Link to="/home-servers">Running on a Home Server</Link> for
          installing it and reaching it from your phone with Tailscale. Building and signing iOS apps needs
          macOS, so this doesn't work on a Linux server.
        </li>
        <li>
          A paid <ExternalLink href="https://developer.apple.com/programs/">Apple Developer Program</ExternalLink>{' '}
          membership.
        </li>
        <li>
          An App Store Connect API key, or an account with the <strong>Account Holder</strong> or{' '}
          <strong>Admin</strong> role so PocketDev can create one for you.
        </li>
        <li>
          Room on the Mac's disk for Xcode and the iOS platform. They're large, so check the free space
          first, and expect the download to take a while.
        </li>
      </ul>

      <h2>Setting it up</h2>
      <p>
        In the PocketDev app, open <strong>Settings → Workspace Tools</strong> and find the{' '}
        <strong>App Store</strong> section. It checks what's already on the Mac and skips the steps you
        don't need. Anything that needs a password runs in the app's terminal on the Mac, and you type the
        password into a secure prompt on your phone.
      </p>

      <h3>1. Xcode</h3>
      <p>
        PocketDev looks for Xcode in <code>/Applications</code> and checks that it's the selected version, that
        its license is accepted, and that the iOS platform is installed. If Xcode isn't there yet, you can
        install it in one of two ways:
      </p>
      <ul>
        <li>
          <strong>From the Mac App Store.</strong> The Mac needs to be signed in to the App Store, and Apple may
          ask you to confirm on the Mac itself.
        </li>
        <li>
          <strong>Directly from developer.apple.com</strong>, using the open-source{' '}
          <ExternalLink href="https://github.com/XcodesOrg/xcodes">xcodes</ExternalLink> tool. You enter your
          Apple Account password and a two-factor code in the terminal. The saved password is removed
          again when the install finishes.
        </li>
      </ul>
      <p>
        A final step selects Xcode and accepts its license (this needs your Mac's password). A beta Xcode
        can't be used here: App Store Connect rejects builds made with one. Install the release version next
        to the beta if you need both.
      </p>

      <h3>2. The asc command-line tool</h3>
      <p>
        Uploads and App Store Connect tasks go through{' '}
        <ExternalLink href={ASC_REPO}>asc</ExternalLink>, an open-source, MIT-licensed command-line tool for
        the App Store Connect API. It's a community project, not an Apple product. PocketDev installs it
        into <code>~/.local/bin</code> with its official install script.
      </p>
      <p>
        asc sends pseudonymous usage statistics by default (which commands ran, not your apps, keys or
        files). The setup has a switch to turn that off.
      </p>

      <h3>3. Connect your Apple account</h3>
      <p>
        Agents never use your Apple Account directly. They use an <strong>App Store Connect API key</strong>{' '}
        that belongs to this Mac. You have two options:
      </p>
      <ul>
        <li>
          <strong>Create a key for me.</strong> Enter your Apple Account email. asc signs in on the Mac and
          asks for your password and a two-factor code, which you type into the secure prompt on your phone.
          It then creates a key called <em>PocketDev &lt;your Mac's name&gt;</em> and signs out again.
          Your password isn't saved by PocketDev or by asc. This needs the Account Holder or Admin role on
          your team.
        </li>
        <li>
          <strong>Use an existing key.</strong> If you already have an <code>AuthKey_XXXXXXXXXX.p8</code> file,
          pick it on your phone and enter the Issuer ID from{' '}
          <ExternalLink href={ASC_INTEGRATIONS}>App Store Connect → Users and Access → Integrations</ExternalLink>.
          PocketDev checks the key with Apple before saving it.
        </li>
      </ul>
      <p>
        You can choose the key's role. <strong>Admin</strong> is the default because Xcode's automatic
        signing with an API key needs it. <strong>App Manager</strong> is more limited and works for
        uploads, but automatic signing may fail with it.
      </p>
      <p>
        A few things worth knowing about keys:
      </p>
      <ul>
        <li>Apple lets you download a key file only once. If you create one by hand, keep a copy.</li>
        <li>Give each Mac its own key, so you can revoke one without breaking the others.</li>
        <li>
          Apple limits how many distribution certificates a team can have. PocketDev relies on Xcode's
          automatic signing instead of creating new certificates for each Mac.
        </li>
      </ul>

      <h3>4. Verify</h3>
      <p>
        The last step checks the key with App Store Connect and lists your apps. If you see them, you're done.
        PocketDev also adds a short <em>App Store Connect</em> section to the instructions it gives agents
        (<code>~/.claude/CLAUDE.md</code>), so they know asc is available and when to check with you first.
      </p>

      <h2>What's stored where</h2>
      <ul>
        <li>
          <strong>The API key file:</strong> <code>~/.asc/keys/AuthKey_&lt;KEY_ID&gt;.p8</code>, readable only by
          your user.
        </li>
        <li>
          <strong>asc's sign-in:</strong> your Mac's login Keychain, under the profile name{' '}
          <code>pocketdev</code>.
        </li>
        <li>
          <strong>Your Apple Account password:</strong> not stored. The sign-in used to create the key is
          ended as soon as the key exists.
        </li>
      </ul>
      <p>
        Every agent task on that Mac can use the key, the same way a CI machine can. Pick the role with that
        in mind.
      </p>

      <h2>Undoing it</h2>
      <ol>
        <li>
          Revoke the key in{' '}
          <ExternalLink href={ASC_INTEGRATIONS}>App Store Connect → Users and Access → Integrations</ExternalLink>.
          This is what actually stops it from working.
        </li>
        <li>
          On the Mac, remove it from asc: <code>asc auth logout --name pocketdev --confirm</code>
        </li>
        <li>
          Delete the key file: <code>rm ~/.asc/keys/AuthKey_&lt;KEY_ID&gt;.p8</code>
        </li>
      </ol>
      <p>
        Xcode and asc can stay installed. They do nothing on their own.
      </p>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          <strong>"Account Holder or Admin access is required":</strong> your Apple Account doesn't have that
          role on the team. Ask the Account Holder to create a key and use <em>Use an existing key</em>.
        </li>
        <li>
          <strong>Xcode isn't selected:</strong> the Mac is still using the Command Line Tools. Run the
          finish step again, or <code>sudo xcode-select -s /Applications/Xcode.app/Contents/Developer</code>.
        </li>
        <li>
          <strong>The two-factor code doesn't arrive:</strong> without a trusted Apple device nearby, run the
          key step in the terminal with <code>--two-factor-method sms</code> to get the code by text message.
        </li>
        <li>
          <strong>It stopped working after a reboot:</strong> the agent and the Keychain only become available
          once someone logs in to the Mac. Turn on automatic login. If FileVault is on, automatic login is
          not possible, so someone has to log in after each restart. See{' '}
          <Link to="/home-servers" hash="always-on">keeping a Mac mini always on</Link>.
        </li>
        <li>
          <strong>The key is rejected:</strong> it may have been revoked or its role changed. Create or
          import a new one.
        </li>
      </ul>
    </>
  )
}
