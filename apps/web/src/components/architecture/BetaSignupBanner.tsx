'use client'

import { useState } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '@pocketdev/db'
import { betaSignups } from '@pocketdev/db/schema'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { architectureTokens } from '#/components/architecture/shared/theme'

const submitBetaInterest = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const existing = await db.query.betaSignups.findFirst({
      where: (t, { eq }) => eq(t.email, data.email),
    })
    if (existing) return { success: true, alreadyRegistered: true }
    await db.insert(betaSignups).values({ email: data.email })
    return { success: true, alreadyRegistered: false }
  })

export function BetaSignupBanner() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await submitBetaInterest({ data: { email } })
      setStatus(result.alreadyRegistered ? 'already' : 'success')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="flex justify-center px-6 py-10"
    >
      <div
        className="w-full max-w-lg rounded-2xl border px-8 py-8 text-center"
        style={{
          backgroundColor: architectureTokens.colors.panelAlt,
          borderColor: architectureTokens.colors.border,
        }}
      >
        <p
          className="mb-2 text-xs uppercase tracking-widest"
          style={{ color: architectureTokens.colors.textSecondary, fontFamily: 'var(--font-mono), monospace' }}
        >
          Private Beta
        </p>
        <h2
          className="mb-2 text-2xl font-bold tracking-tight"
          style={{
            color: architectureTokens.colors.text,
            fontFamily: 'var(--font-display), var(--font-heading), sans-serif',
            letterSpacing: '-0.03em',
          }}
        >
          Join the waitlist
        </h2>
        <p className="mb-6 text-sm" style={{ color: architectureTokens.colors.textSecondary }}>
          Be first to know when PocketDev opens up. No spam — just an invite when it's ready.
        </p>

        {status === 'success' && (
          <div
            className="rounded-lg px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: `${architectureTokens.colors.border}44`, color: architectureTokens.colors.text }}
          >
            You're on the list. We'll reach out when beta opens.
          </div>
        )}

        {status === 'already' && (
          <div
            className="rounded-lg px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: `${architectureTokens.colors.border}44`, color: architectureTokens.colors.text }}
          >
            You're already on the list — we'll be in touch.
          </div>
        )}

        {(status === 'idle' || status === 'loading' || status === 'error') && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === 'loading'}
              className="flex-1"
              style={{
                backgroundColor: 'rgba(255,255,255,0.6)',
                borderColor: architectureTokens.colors.border,
                color: architectureTokens.colors.text,
              }}
            />
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Notify me'}
            </Button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-2 text-xs" style={{ color: '#c0392b' }}>{errorMsg}</p>
        )}
      </div>
    </div>
  )
}
