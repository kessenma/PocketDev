import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/license')({
  staticData: { navLabel: 'License', navOrder: 7 },
  component: LicensePage,
})

function LicensePage() {
  return (
    <>
      <h1>License</h1>
      <p>
        PocketDev is licensed under the{' '}
        <strong>Functional Source License, Version 1.1, Apache 2.0 Future License</strong>{' '}
        (FSL-1.1-Apache-2.0).
      </p>

      <h2>What you can do</h2>
      <p>
        Everything, with one narrow exception. You can read, fork, run, self-host, contribute
        to, and build on top of PocketDev freely — for personal projects, internal tooling,
        research, or education. The only thing you cannot do is publish a derivative of the
        PocketDev mobile app to any app store or software distribution platform (Apple App
        Store, Google Play, etc.).
      </p>

      <h2>Why FSL and not MIT?</h2>
      <p>
        PocketDev is source-available today because of one specific risk: at launch, before a
        community exists to defend the project, someone could fork the mobile app and publish
        it to the App Store or Google Play under a different name. The FSL closes that gap with
        a single, narrow restriction.
      </p>
      <p>
        This is a launch-time precaution, not a permanent philosophy. A well-known project with
        an active community is naturally protected — app store pirates thrive on obscurity. The
        plan is to relicense to Apache 2.0 once PocketDev has a community large enough that the
        community itself is the best defense.
      </p>

      <h2>Automatic transition to open source</h2>
      <p>
        The FSL has a built-in conversion clause: every version automatically becomes available
        under Apache 2.0 two years after its first public release. If community momentum
        warrants it, the relicense can happen sooner.
      </p>

      <h2>Contributing</h2>
      <p>
        Contributors agree to the{' '}
        <a href="https://github.com/kessenma/pocketdev/blob/main/CLA.md">
          Contributor License Agreement
        </a>{' '}
        by submitting a pull request. The CLA is what makes the future Apache 2.0 transition
        possible — it ensures the project can relicense without needing sign-off from every
        contributor individually.
      </p>

      <h2>Full license text</h2>
      <p>
        The complete license is available in the{' '}
        <a href="https://github.com/kessenma/pocketdev/blob/main/LICENSE">
          LICENSE file
        </a>{' '}
        in the repository.
      </p>
    </>
  )
}
