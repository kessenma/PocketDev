import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, Circle, ExternalLink, Globe, Loader2, RefreshCw, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { StatusBadge } from '#/components/ui/status-badge'
import { useConsoleData } from '#/context/ConsoleDataContext'
import {
  enableTailscaleServe,
  fetchTailscaleStatus,
  startTailscaleLogin,
  type TailscaleActionResult,
  type TailscaleSetupStatus,
} from '#/lib/api'

const CHOICE_KEY = 'pocketdev.remoteAccessChoice'
const DOWNLOAD_URL = 'https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg'
const LINUX_DOWNLOAD_URL = 'https://tailscale.com/download/linux'
const ADMIN_DNS_URL = 'https://login.tailscale.com/admin/dns'
const ADMIN_MACHINES_URL = 'https://login.tailscale.com/admin/machines'
const IOS_APP_URL = 'https://apps.apple.com/app/tailscale/id1470499037'
const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=com.tailscale.ipn'

type Choice = 'anywhere' | 'wifi' | null

interface Step {
  id: string
  label: string
  done: boolean
  /** Only the first not-done step is "active". */
  body?: ReactNode
  optional?: boolean
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--bauhaus-yellow)] underline-offset-2 hover:underline">
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

/**
 * "How will your phone reach this machine?" — shown before pairing on home /
 * private networks (always on macOS). Walks through Tailscale with a live
 * checklist, or lets the user pick same-Wi-Fi-only pairing.
 */
export function RemoteAccessCard() {
  const { status: consoleStatus, refreshStatus } = useConsoleData()
  const [choice, setChoice] = useState<Choice>(() => (localStorage.getItem(CHOICE_KEY) as Choice) ?? null)
  const [ts, setTs] = useState<TailscaleSetupStatus | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionUrl, setActionUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async (refresh = false) => {
    try {
      setTs(await fetchTailscaleStatus(refresh))
    } catch {
      setTs(null)
    }
  }, [])

  useEffect(() => { void load(true) }, [load])

  // While a step is waiting on the user (install, login, admin console), poll.
  const ready = ts?.serveActive === true
  useEffect(() => {
    if (choice !== 'anywhere' || ready) return
    const id = setInterval(() => { void load(true) }, 5000)
    return () => clearInterval(id)
  }, [choice, ready, load])

  // Once Serve is up, the pairing QR changes to the ts.net address.
  useEffect(() => {
    if (ready) void refreshStatus()
  }, [ready, refreshStatus])

  function pick(next: Choice) {
    setChoice(next)
    if (next) localStorage.setItem(CHOICE_KEY, next)
    else localStorage.removeItem(CHOICE_KEY)
  }

  async function run(name: string, action: () => Promise<TailscaleActionResult>) {
    setBusy(name)
    setMessage(null)
    try {
      const result = await action()
      setTs(result.status)
      setActionUrl(result.actionUrl)
      setMessage(result.message)
      if (result.actionUrl) window.open(result.actionUrl, '_blank', 'noopener')
      if (result.ok && !result.actionUrl) toast.success(result.message)
      await refreshStatus()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  if (!consoleStatus) return null
  const isMac = (ts?.platform ?? consoleStatus.platform) === 'darwin'
  const lanIp = ts?.network.lanIpv4 ?? consoleStatus.network?.lanIpv4 ?? null
  const canManage = consoleStatus.permissions.canManageUsers

  const steps: Step[] = ts ? [
    {
      id: 'install',
      label: 'Install Tailscale on this machine',
      done: ts.installed,
      body: isMac ? (
        <p>
          Download the <ExtLink href={DOWNLOAD_URL}>Tailscale app for Mac</ExtLink>, open it, allow the system
          extension when macOS asks, then in Tailscale → Settings choose <b>CLI integration → Install</b>.
        </p>
      ) : (
        <p>Install Tailscale: <ExtLink href={LINUX_DOWNLOAD_URL}>tailscale.com/download/linux</ExtLink></p>
      ),
    },
    {
      id: 'login',
      label: 'Log this machine into Tailscale',
      done: ts.running,
      body: (
        <div className="space-y-2">
          <p>Sign in with the account you'll use on your phone.{ts.backendState ? ` (state: ${ts.backendState})` : ''}</p>
          {canManage && (
            <Button size="sm" onClick={() => run('login', startTailscaleLogin)} disabled={busy !== null}>
              {busy === 'login' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {ts.authUrl ? 'Open login link' : 'Log in'}
            </Button>
          )}
        </div>
      ),
    },
    {
      id: 'https',
      label: 'Enable MagicDNS + HTTPS certificates for your tailnet',
      done: ts.magicDnsEnabled && ts.httpsCertsEnabled,
      body: (
        <p>
          In the <ExtLink href={ADMIN_DNS_URL}>Tailscale admin console → DNS</ExtLink>, turn on <b>MagicDNS</b> and
          <b> HTTPS Certificates</b>. (Enabling Serve below also gives you a direct link.)
        </p>
      ),
    },
    {
      id: 'serve',
      label: `Serve PocketDev at https://${ts.dnsName ?? '<machine>.<tailnet>.ts.net'}`,
      done: ts.serveActive,
      body: (
        <div className="space-y-2">
          {ts.serveConflict ? (
            <p className="text-amber-500">
              Tailscale Serve already serves <code>{ts.serveConflict}</code> on HTTPS — PocketDev won't overwrite it.
              Remove it with <code>tailscale serve --https=443 off</code>.
            </p>
          ) : (
            <p>Gives your phone an HTTPS address that works from anywhere on your tailnet (and enables passkeys).</p>
          )}
          {canManage && !ts.serveConflict && (
            <Button size="sm" onClick={() => run('serve', enableTailscaleServe)} disabled={busy !== null}>
              {busy === 'serve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Enable HTTPS via Tailscale Serve
            </Button>
          )}
        </div>
      ),
    },
    {
      id: 'phone',
      label: 'Install Tailscale on your phone (same account)',
      // We can't see the phone's Tailscale; a device paired after Serve is up proves it works.
      done: ts.serveActive && consoleStatus.paired,
      optional: true,
      body: (
        <p>
          <ExtLink href={IOS_APP_URL}>iPhone</ExtLink> · <ExtLink href={ANDROID_APP_URL}>Android</ExtLink>. Keep it
          connected — the PocketDev app reaches this machine through it.
        </p>
      ),
    },
    {
      id: 'expiry',
      label: 'Disable key expiry for this machine',
      done: ts.keyExpiryDisabled,
      optional: true,
      body: (
        <p>
          <ExtLink href={ADMIN_MACHINES_URL}>Admin console → Machines</ExtLink> → this machine → <b>Disable key
          expiry</b>, so it doesn't drop off the tailnet every 180 days.
        </p>
      ),
    },
  ] : []

  const required = steps.filter((s) => !s.optional)
  const activeId = required.find((s) => !s.done)?.id ?? null

  return (
    <div className="rounded-[1.1rem] border-2 border-border bg-card p-5 text-foreground shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black/75 bg-secondary text-[var(--bauhaus-yellow)] shadow-[4px_4px_0_0_rgba(0,0,0,0.28)]">
            <Globe className="h-4 w-4" />
          </div>
          <span className="font-heading text-sm font-semibold uppercase tracking-[0.32em]">Remote Access</span>
          {ready && <StatusBadge color="green">Anywhere</StatusBadge>}
          {!ready && choice === 'wifi' && <StatusBadge color="neutral">Same Wi-Fi</StatusBadge>}
        </div>
        {choice === 'anywhere' && (
          <Button size="icon-sm" variant="ghost" onClick={() => load(true)} aria-label="Refresh Tailscale status">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!choice && !ready && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-foreground/70">
            This machine looks like it's on a home or private network, so your phone can only reach it on the same
            Wi-Fi. How do you want to connect <b>before you pair</b>?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => pick('anywhere')} className="rounded-[1rem] border-2 border-[var(--bauhaus-yellow)]/60 bg-background p-3 text-left hover:bg-secondary">
              <p className="flex items-center gap-2 text-sm font-semibold"><Globe className="h-4 w-4" /> From anywhere <span className="text-[0.65rem] uppercase text-[var(--bauhaus-yellow)]">recommended</span></p>
              <p className="mt-1 text-xs text-foreground/60">Set up Tailscale (free, private, no port forwarding). Pair once, works on cellular too.</p>
            </button>
            <button type="button" onClick={() => pick('wifi')} className="rounded-[1rem] border-2 border-border bg-background p-3 text-left hover:bg-secondary">
              <p className="flex items-center gap-2 text-sm font-semibold"><Wifi className="h-4 w-4" /> Same Wi-Fi only</p>
              <p className="mt-1 text-xs text-foreground/60">Pair now over {lanIp ?? 'your local network'}. You can add Tailscale later — you'll need to re-pair.</p>
            </button>
          </div>
        </div>
      )}

      {choice === 'wifi' && !ready && (
        <div className="mt-3 space-y-2 text-xs text-foreground/60">
          <p>
            Pair below while your phone is on the same Wi-Fi{lanIp ? <> (this machine is <code>{lanIp}</code>)</> : null}.
            Android release builds of the app may refuse plain HTTP — use Tailscale if pairing fails there.
          </p>
          <Button size="xs" variant="outline" onClick={() => pick('anywhere')}>Set up Tailscale instead</Button>
        </div>
      )}

      {(choice === 'anywhere' || ready) && (
        <div className="mt-4 space-y-2">
          {!ts && <p className="text-xs text-foreground/50">Checking Tailscale…</p>}
          {steps.map((step) => {
            const active = step.id === activeId || (step.optional && activeId === null && !step.done)
            return (
              <div key={step.id} className={`rounded-[1rem] border p-3 ${active ? 'border-[var(--bauhaus-yellow)]/50 bg-background' : 'border-border bg-background/40'}`}>
                <p className="flex items-center gap-2 text-sm">
                  {step.done
                    ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                    : <Circle className="h-4 w-4 text-foreground/30" />}
                  <span className={step.done ? 'text-foreground/60' : 'font-medium'}>{step.label}</span>
                  {step.optional && <span className="text-[0.65rem] uppercase text-foreground/40">{step.id === 'phone' ? 'on your phone' : 'recommended'}</span>}
                </p>
                {active && step.body && <div className="mt-2 pl-6 text-xs text-foreground/70">{step.body}</div>}
              </div>
            )
          })}
          {message && (
            <p className="text-xs text-foreground/70">
              {message}{' '}
              {actionUrl && <ExtLink href={actionUrl}>Open link</ExtLink>}
            </p>
          )}
          {ready && (
            <p className="text-xs text-green-400">
              Ready — the pairing QR below now uses https://{ts?.dnsName}. Make sure Tailscale is on on your phone, then scan it.
              For passkeys, open this console at <ExtLink href={`https://${ts?.dnsName}/PocketDev/console`}>https://{ts?.dnsName}</ExtLink>.
            </p>
          )}
          {!ready && choice === 'anywhere' && (
            <Button size="xs" variant="ghost" onClick={() => pick('wifi')}>Skip — use same Wi-Fi only for now</Button>
          )}
        </div>
      )}
    </div>
  )
}
