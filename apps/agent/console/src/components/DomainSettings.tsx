import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import { fetchDomainSettings, updateDomain, type DomainSettings as DomainSettingsType } from '#/lib/api'
import { Globe, Shield, ShieldCheck, Loader2 } from 'lucide-react'

export function DomainSettings({ onSettingsChanged }: { onSettingsChanged?: (settings: DomainSettingsType) => void } = {}) {
  const [settings, setSettings] = useState<DomainSettingsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [domainInput, setDomainInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDomainSettings()
      setSettings(data)
      setDomainInput(data.domain ?? '')
      onSettingsChanged?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domain settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleApply() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await updateDomain(domainInput.trim())
      if (result.ok) {
        setSuccess(domainInput.trim()
          ? `Domain updated. Your console is now at ${result.url}`
          : 'Switched to IP-only mode with self-signed certificate.')
        await load()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update domain')
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    setDomainInput('')
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await updateDomain('')
      if (result.ok) {
        setSuccess('Switched to IP-only mode with self-signed certificate.')
        await load()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear domain')
    } finally {
      setSaving(false)
    }
  }

  const hasChanged = (domainInput.trim() || '') !== (settings?.domain || '')

  return (
    <Card className="rounded-[1.1rem] border-2 border-[var(--border)] bg-[#1a1713] text-[#f5eedf] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black/75 bg-[#2d5fe5] text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.28)]">
            <Globe className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-heading text-sm font-semibold uppercase tracking-[0.32em]">Domain & HTTPS</span>
            {settings && (
              <Badge className={settings.httpsEnabled ? 'bg-[#f0c419] text-black' : 'bg-[#2a241d] text-[#f5eedf]'}>
                {settings.httpsEnabled ? (
                  <><ShieldCheck className="mr-1 h-3 w-3" /> HTTPS Active</>
                ) : (
                  <><Shield className="mr-1 h-3 w-3" /> No HTTPS</>
                )}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-[#f5eedf]/60">Loading...</p>
        ) : error && !settings ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs text-[#f5eedf]/60">
                {settings?.domain
                  ? `Currently using domain: ${settings.domain} (Let's Encrypt certificate)`
                  : `Currently using IP-only mode: ${settings?.serverIp} (self-signed certificate)`}
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                placeholder="agent.example.com"
                className="border-[var(--border)] bg-[#12100d] text-[#f5eedf] placeholder:text-[#f5eedf]/30"
              />
              <Button
                onClick={handleApply}
                disabled={saving || !hasChanged}
                className="bg-[#f0c419] text-black hover:bg-[#d4ab14] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </Button>
              {settings?.domain && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={saving}
                  className="border-[var(--border)] bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
                >
                  Clear
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}

            <p className="text-xs text-[#f5eedf]/40">
              Point your domain's DNS A record to this server's IP ({settings?.serverIp}), then enter it above.
              Caddy will automatically obtain a free Let's Encrypt certificate. Leave blank for a self-signed certificate.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
