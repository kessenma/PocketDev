import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mobile-app')({
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

      <h2>iOS</h2>
      <p>
        The iOS app will be available on the App Store.
      </p>
      <p>
        App Store link coming soon.
      </p>

      <h2>Android</h2>
      <p>
        Android is coming soon.
      </p>
    </>
  )
}
