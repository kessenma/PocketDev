import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user-agreement')({
  component: UserAgreementPage,
})

function UserAgreementPage() {
  return (
    <>
      <h1>User Agreement</h1>
      <p>
        Effective date: April 10, 2026
      </p>
      <p>
        This User Agreement governs the use of PocketDev. By installing, accessing, or using
        PocketDev, you agree to these terms.
      </p>

      <h2>Beta Software</h2>
      <p>
        PocketDev is currently provided as free beta software. Features may change, break, be
        incomplete, or be removed at any time without notice.
      </p>

      <h2>No Fee</h2>
      <p>
        PocketDev is currently offered at no charge. Nothing in this agreement creates an ongoing
        obligation to continue offering the software for free in the future.
      </p>

      <h2>User Responsibility</h2>
      <p>
        You are responsible for your own server, infrastructure, data, accounts, credentials,
        repositories, backups, and security practices. You are also responsible for reviewing and
        approving any actions taken through PocketDev before using them in your environment.
      </p>

      <h2>Self-Hosted Accounts and Credentials</h2>
      <p>
        Users create and manage their own accounts on their own servers. PocketDev does not take
        custody of those credentials and is not responsible for how users configure or protect
        them.
      </p>

      <h2>No Warranty</h2>
      <p>
        PocketDev is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind,
        whether express or implied, to the fullest extent permitted by law. This includes, without
        limitation, implied warranties of merchantability, fitness for a particular purpose, and
        non-infringement.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, PocketDev and its developers will not be liable
        for any direct, indirect, incidental, special, consequential, exemplary, or punitive
        damages, or for any loss of data, profits, revenue, business, goodwill, or system access,
        arising from or related to the use of, inability to use, or performance of PocketDev.
      </p>
      <p>
        This limitation applies even if PocketDev or its developers were advised that such damages
        might occur. If you use PocketDev, you do so at your own risk.
      </p>

      <h2>Acceptable Use</h2>
      <p>
        You agree not to use PocketDev for unlawful activity, unauthorized access, abuse of third-
        party systems, or any activity that violates applicable law or the rights of others.
      </p>

      <h2>Changes to the Agreement</h2>
      <p>
        This User Agreement may be updated from time to time. Continued use of PocketDev after an
        update means you accept the revised terms.
      </p>
    </>
  )
}
