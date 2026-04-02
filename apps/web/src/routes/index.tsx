import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '#/components/landing/Hero'
import { InstallCommand } from '#/components/landing/InstallCommand'
import { HowItWorks } from '#/components/landing/HowItWorks'
import { Features } from '#/components/landing/Features'
import { Architecture } from '#/components/landing/Architecture'
import { Footer } from '#/components/landing/Footer'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <InstallCommand />
      <HowItWorks />
      <Features />
      <Architecture />
      <Footer />
    </div>
  )
}
