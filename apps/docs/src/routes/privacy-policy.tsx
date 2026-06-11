import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy-policy')({
  staticData: { navLabel: 'Privacy Policy', navOrder: 8 },
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        Effective date: April 10, 2026
      </p>
      <p>
        This Privacy Policy explains what information PocketDev collects and how it is used.
        PocketDev is designed so that users run the agent-side app on their own servers and
        manage their own accounts and credentials there.
      </p>

      <h2>Information Collected</h2>
      <p>
        PocketDev currently collects limited installation data from the agent-side app. The
        primary data collected is the IP address used when the agent-side app is installed or
        connects to installation infrastructure.
      </p>

      <h2>Information Not Collected</h2>
      <p>
        PocketDev does not collect the account credentials users create on their own servers.
        PocketDev also does not manage or store the usernames, passwords, API keys, repository
        credentials, or other private credentials that users configure on their self-hosted
        PocketDev instances.
      </p>

      <h2>How Information Is Used</h2>
      <p>
        Installation IP address data may be used to operate, secure, monitor, and improve
        PocketDev, including detecting abuse, understanding installation activity, debugging
        installation issues, and maintaining service reliability.
      </p>

      <h2>Data Storage and Security</h2>
      <p>
        Reasonable steps may be taken to protect collected data, but no storage or transmission
        method is completely secure. Users are responsible for securing their own servers,
        accounts, credentials, and environments.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        Users may connect PocketDev to third-party tools or services, including AI providers,
        Git hosting platforms, and their own servers. The handling of data by those services is
        governed by their own terms and privacy policies, not this Privacy Policy.
      </p>

      <h2>Changes</h2>
      <p>
        This Privacy Policy may be updated from time to time. Continued use of PocketDev after an
        update means the revised Privacy Policy applies going forward.
      </p>

      <h2>Contact</h2>
      <p>
        If you have questions about this Privacy Policy, contact PocketDev through the official
        project channels listed on the PocketDev website or repository.
      </p>
    </>
  )
}
