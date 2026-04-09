import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  disableManagedSwap,
  enableManagedSwap,
  fetchSwapMetrics,
  type SetupDebugInfo,
  type SwapDebugInfo,
  type SwapMetricsInfo,
  type ToolCheck,
} from '#/lib/api'
import { cn } from '#/lib/utils'
import {
  getAiAssistantTools,
  getLanguageTools,
  getRequiredSetupTools,
  getSetupStatus,
  getSupportingTools,
  statusColor,
  statusDotColor,
  statusLabel,
  toolIntentDetail,
} from './setup-tool-utils'
import { AlertTriangle, Check, HardDrive, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  setupInfo: SetupDebugInfo | null
  onRefresh: () => Promise<void> | void
}

function StatusPill({ ok, label }: { ok: boolean, label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-white/10',
        ok ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-200',
      )}
    >
      {label}
    </Badge>
  )
}

function GitDetails({ tool }: { tool: ToolCheck }) {
  const sshExists = tool.details.ssh_key_exists === 'true'
  const githubConnected = tool.details.github_connected === 'true'
  const privateRepoAccess = tool.details.private_repo_access === 'true'
  const privateRepoSource = tool.details.private_repo_access_source

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#f4f0e8]/58">
      {tool.details.user_name && (
        <span>{tool.details.user_name} &lt;{tool.details.user_email}&gt;</span>
      )}
      <span className="flex items-center gap-1">
        {sshExists ? <Check className="h-3 w-3 text-green-400" /> : <X className="h-3 w-3 text-red-400" />}
        SSH Key
      </span>
      <span className="flex items-center gap-1">
        {githubConnected ? <Check className="h-3 w-3 text-green-400" /> : <X className="h-3 w-3 text-red-400" />}
        GitHub SSH
      </span>
      <span className="flex items-center gap-1">
        {privateRepoAccess ? <Check className="h-3 w-3 text-green-400" /> : <X className="h-3 w-3 text-red-400" />}
        {privateRepoSource === 'github_cli' ? 'Private Repos via GitHub CLI' : 'Private Repos'}
      </span>
    </div>
  )
}

function GitHubCliDetails({ tool }: { tool: ToolCheck }) {
  const privateRepoAccess = tool.details.private_repo_access === 'true'

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#f4f0e8]/58">
      {tool.details.github_username ? <span>@{tool.details.github_username}</span> : null}
      <span className="flex items-center gap-1">
        {privateRepoAccess ? <Check className="h-3 w-3 text-green-400" /> : <X className="h-3 w-3 text-red-400" />}
        Private Repo Access
      </span>
    </div>
  )
}

function ToolCard({ tool }: { tool: ToolCheck }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{tool.name}</p>
            {tool.required ? (
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#f0c419]">Required</span>
            ) : null}
          </div>
          <p className={cn('mt-1 text-sm', statusColor(tool))}>{statusLabel(tool)}</p>
          {tool.version && tool.status !== 'missing' ? (
            <p className="mt-1 font-mono text-xs text-[#f4f0e8]/45">v{tool.version}</p>
          ) : null}
          {toolIntentDetail(tool) ? (
            <p className="mt-2 text-xs text-[#f4f0e8]/58">{toolIntentDetail(tool)}</p>
          ) : null}
        </div>
        <div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', statusDotColor(tool))} />
      </div>
      {tool.id === 'git' && tool.status !== 'missing' ? <GitDetails tool={tool} /> : null}
      {tool.id === 'github_cli' && tool.status !== 'missing' ? <GitHubCliDetails tool={tool} /> : null}
    </div>
  )
}

function ToolSection({
  title,
  hint,
  tools,
}: {
  title: string
  hint: string
  tools: ToolCheck[]
}) {
  if (tools.length === 0) return null

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">{title}</p>
        <p className="mt-1 text-sm text-[#f4f0e8]/60">{hint}</p>
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={`${title}-${tool.id}`} tool={tool} />
        ))}
      </div>
    </section>
  )
}

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const precision = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2
  return `${size.toFixed(precision)} ${units[unitIndex]}`
}

type DonutSegment = {
  label: string
  value: number
  color: string
  detail: string
}

function DonutChart({
  segments,
  valueLabel,
  value,
}: {
  segments: DonutSegment[]
  valueLabel: string
  value: string
}) {
  const radius = 58
  const strokeWidth = 22
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  let offset = 0

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] lg:items-center">
      <div className="relative mx-auto aspect-square w-full max-w-[220px]">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="rgba(244,240,232,0.08)"
            strokeWidth={strokeWidth}
          />
          {segments
            .filter((segment) => segment.value > 0 && total > 0)
            .map((segment) => {
              const segmentLength = circumference * (segment.value / total)
              const element = (
                <circle
                  key={segment.label}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeLinecap="round"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${Math.max(segmentLength - 2, 0)} ${circumference}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${segment.label}: ${segment.detail}`}</title>
                </circle>
              )
              offset += segmentLength
              return element
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-[#f4f0e8]/45">
            {valueLabel}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#f4f0e8]">{value}</p>
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-black/20 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span title={segment.label} className="truncate text-sm text-[#f4f0e8]/76">
                {segment.label}
              </span>
            </div>
            <span title={segment.detail} className="shrink-0 text-xs text-[#f4f0e8]/52">
              {segment.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildStorageSegments(swap: SwapDebugInfo | undefined, metrics: SwapMetricsInfo | null): DonutSegment[] {
  const storage = metrics?.storage
  if (!storage) return []

  const appFootprint = Math.min(metrics?.app?.footprintBytes ?? 0, storage.totalBytes)
  const reservedSwap = Math.min(swap?.managed.sizeBytes ?? 0, Math.max(storage.totalBytes - appFootprint, 0))
  const freeStorage = Math.min(storage.availableBytes, storage.totalBytes)
  const otherUsage = Math.max(storage.totalBytes - appFootprint - reservedSwap - freeStorage, 0)

  return [
    {
      label: 'PocketDev',
      value: appFootprint,
      color: '#f0c419',
      detail: formatBytes(appFootprint),
    },
    {
      label: 'Swap File',
      value: reservedSwap,
      color: '#7dd3fc',
      detail: formatBytes(reservedSwap),
    },
    {
      label: 'Free Disk',
      value: freeStorage,
      color: '#34d399',
      detail: formatBytes(freeStorage),
    },
    {
      label: 'Other Used',
      value: otherUsage,
      color: '#b45309',
      detail: formatBytes(otherUsage),
    },
  ].filter((segment) => segment.value > 0)
}

function SwapCard({
  swap,
  onRefresh,
}: {
  swap: SwapDebugInfo | undefined
  onRefresh: () => Promise<void> | void
}) {
  type SwapAction = { type: 'disable' } | { type: 'enable', sizeGb: number }
  const [metrics, setMetrics] = useState<SwapMetricsInfo | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState<SwapAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [customSizeGb, setCustomSizeGb] = useState('')

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      setMetrics(await fetchSwapMetrics())
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : 'Failed to load swap metrics')
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  const storageSegments = useMemo(() => buildStorageSegments(swap, metrics), [metrics, swap])
  const storageAvailableBytes = metrics?.storage?.availableBytes ?? null
  const recommendations = metrics?.recommendations
  const swapUsedPercent = swap && swap.totalBytes > 0
    ? Math.round((swap.usedBytes / swap.totalBytes) * 100)
    : 0
  const customParsedGb = Number(customSizeGb)
  const customHasValue = customSizeGb.trim().length > 0
  const customIsValidInteger = Number.isInteger(customParsedGb) && customParsedGb >= 1
  const customExceedsMax = recommendations?.maxCustomGb !== null && recommendations?.maxCustomGb !== undefined
    ? customParsedGb > recommendations.maxCustomGb
    : false
  const customNeedsWarning = customIsValidInteger && !!recommendations?.maxRecommendedGb && customParsedGb > recommendations.maxRecommendedGb
  const customCanSubmit =
    !!swap?.actions.canEnable &&
    actionPending === null &&
    customHasValue &&
    customIsValidInteger &&
    !customExceedsMax
  async function runAction(action: SwapAction) {
    setActionPending(action)
    setActionError(null)

    try {
      if (action.type === 'disable') {
        await disableManagedSwap()
        toast.success('PocketDev-managed swap removed')
      } else {
        await enableManagedSwap(action.sizeGb)
        toast.success(`Enabled ${action.sizeGb}GB PocketDev-managed swap`)
      }

      await Promise.all([
        Promise.resolve(onRefresh()),
        loadMetrics(),
      ])
      setCustomSizeGb('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Swap action failed'
      setActionError(message)
      toast.error(message)
    } finally {
      setActionPending(null)
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Swap Safety Net</p>
          </div>
          <p className="mt-1 text-sm text-[#f4f0e8]/58">
            Optional PocketDev-managed swap file for small servers. PocketDev only tracks and reverses swap it created.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
          onClick={() => void loadMetrics()}
          disabled={metricsLoading}
        >
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', metricsLoading && 'animate-spin')} />
          Refresh Storage
        </Button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-[1.2rem] border border-white/8 bg-black/25 p-4">
          <div className="grid gap-3 text-sm text-[#f4f0e8]/78 md:grid-cols-2">
            <div className="space-y-1">
              <p>Swap active: {swap?.totalBytes ? 'Yes' : 'No'}</p>
              <p>Swap used: {formatBytes(swap?.usedBytes)} / {formatBytes(swap?.totalBytes)}</p>
              <p>Swappiness: {swap?.swappiness ?? 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p>PocketDev-managed: {swap?.managed.tracked ? 'Yes' : 'No'}</p>
              <p>Tracked size: {formatBytes(swap?.managed.sizeBytes)}</p>
              <p>Tracked path: {swap?.managed.filePath ?? 'None'}</p>
            </div>
          </div>
          {swap?.entries.length ? (
            <div className="mt-3 space-y-2">
              {swap.entries.map((entry) => (
                <div key={entry.path} className="rounded-[0.95rem] border border-white/8 bg-black/20 px-3 py-2 text-xs text-[#f4f0e8]/62">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[#9df6cd]">{entry.path}</span>
                    <span>{formatBytes(entry.usedBytes)} used / {formatBytes(entry.sizeBytes)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.2rem] border border-white/8 bg-black/25 p-4">
          {storageSegments.length > 0 ? (
            <>
              <DonutChart
                segments={storageSegments}
                valueLabel="Swap Load"
                value={`${swapUsedPercent}%`}
              />
              <div className="mt-4 grid gap-2 text-xs text-[#f4f0e8]/58 sm:grid-cols-2">
                <div className="rounded-[0.95rem] border border-white/8 bg-black/20 p-3">
                  <p className="font-semibold uppercase tracking-[0.2em] text-[#f4f0e8]/38">Storage Free</p>
                  <p className="mt-2 text-sm text-[#f4f0e8]/82">{formatBytes(metrics?.storage?.availableBytes)}</p>
                  <p className="mt-1">{metrics?.storage?.path ?? '/'}</p>
                </div>
                <div className="rounded-[0.95rem] border border-white/8 bg-black/20 p-3">
                  <p className="font-semibold uppercase tracking-[0.2em] text-[#f4f0e8]/38">App Footprint</p>
                  <p className="mt-2 text-sm text-[#f4f0e8]/82">{formatBytes(metrics?.app?.footprintBytes)}</p>
                  <p className="mt-1 break-all">{metrics?.app?.path ?? 'Current PocketDev install'}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#f4f0e8]/35">
                Manual storage snapshot{metrics?.generatedAt ? ` · ${new Date(metrics.generatedAt).toLocaleTimeString()}` : ''}
              </p>
            </>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              {metricsError ?? 'Storage metrics are not available yet. Use refresh to inspect disk capacity and PocketDev footprint.'}
            </div>
          )}
        </div>

        <div className="rounded-[1.2rem] border border-white/8 bg-black/25 p-4">
          <div className="flex flex-wrap gap-2">
            {(recommendations?.suggestedGb ?? []).map((sizeGb) => {
              const requiredBytes = sizeGb * 1024 * 1024 * 1024
              const lacksSpace = storageAvailableBytes !== null && storageAvailableBytes < requiredBytes
              const disabled = !swap?.actions.canEnable || actionPending !== null || lacksSpace

              return (
                <Button
                  key={sizeGb}
                  size="sm"
                  variant="secondary"
                  className="bg-[#f0c419] text-black hover:bg-[#f0c419]/90 disabled:bg-[#5e4f15] disabled:text-black/60"
                  disabled={disabled}
                  onClick={() => void runAction({ type: 'enable', sizeGb })}
                >
                  {actionPending && actionPending.type === 'enable' && actionPending.sizeGb === sizeGb ? 'Working…' : `Enable ${sizeGb}GB`}
                </Button>
              )
            })}
            <Button
              size="sm"
              variant="outline"
              className="bg-[#2a241d] text-[#f5eedf] hover:bg-[#342d25]"
              disabled={!swap?.actions.canDisable || actionPending !== null}
              onClick={() => void runAction({ type: 'disable' })}
            >
              {actionPending?.type === 'disable' ? 'Reverting…' : 'Disable & Remove'}
            </Button>
          </div>

          {recommendations?.suggestedGb.length ? (
            <p className="mt-3 text-sm text-[#f4f0e8]/58">
              Suggested sizes based on current free storage: {recommendations.suggestedGb.map((size) => `${size} GB`).join(', ')}
              {recommendations.recommendedGb ? ` · Recommended: ${recommendations.recommendedGb} GB` : ''}
            </p>
          ) : null}

          <div className="mt-4 rounded-[1rem] border border-white/8 bg-black/20 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <Label htmlFor="swap-custom-size" className="text-xs uppercase tracking-[0.2em] text-[#f4f0e8]/45">
                  Custom Swap Size (GB)
                </Label>
                <Input
                  id="swap-custom-size"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={customSizeGb}
                  onChange={(event) => setCustomSizeGb(event.target.value)}
                  className="mt-2 bg-[#17130f] text-[#f5eedf]"
                  placeholder={recommendations?.recommendedGb ? `${recommendations.recommendedGb}` : 'Enter GB'}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="bg-[#f0c419] text-black hover:bg-[#f0c419]/90 disabled:bg-[#5e4f15] disabled:text-black/60"
                disabled={!customCanSubmit}
                onClick={() => void runAction({ type: 'enable', sizeGb: customParsedGb })}
              >
                {actionPending?.type === 'enable' && actionPending.sizeGb === customParsedGb ? 'Working…' : 'Enable Custom Size'}
              </Button>
            </div>

            {!customHasValue ? null : !customIsValidInteger ? (
              <p className="mt-3 text-sm text-red-300">Enter a whole number of gigabytes.</p>
            ) : customExceedsMax ? (
              <p className="mt-3 text-sm text-red-300">
                Custom size exceeds the current maximum allowed size of {recommendations?.maxCustomGb ?? 0} GB.
              </p>
            ) : customNeedsWarning ? (
              <div className="mt-3 flex items-start gap-2 rounded-[0.9rem] border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{recommendations?.customWarning}</p>
              </div>
            ) : recommendations?.customWarning ? (
              <p className="mt-3 text-sm text-[#f4f0e8]/52">{recommendations.customWarning}</p>
            ) : null}
          </div>

          {swap?.actions.enableBlockedReason ? (
            <p className="mt-3 text-sm text-[#f4f0e8]/58">{swap.actions.enableBlockedReason}</p>
          ) : null}
          {storageAvailableBytes !== null ? (
            <p className="mt-2 text-sm text-[#f4f0e8]/58">
              Free space available for a swap file: {formatBytes(storageAvailableBytes)}
            </p>
          ) : null}
          {actionError ? (
            <p className="mt-3 text-sm text-red-300">{actionError}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function SetupDiagnosticsTab({ setupInfo, onRefresh }: Props) {
  const claude = setupInfo?.providers.claude
  const codex = setupInfo?.providers.codex
  const opencode = setupInfo?.providers.opencode
  const prerequisites = setupInfo?.prerequisites ?? null
  const swap = setupInfo?.swap
  const setupStatus = getSetupStatus(prerequisites)
  const requiredTools = getRequiredSetupTools(prerequisites)
  const aiTools = getAiAssistantTools(prerequisites)
  const languageTools = getLanguageTools(prerequisites)
  const supportingTools = getSupportingTools(prerequisites)

  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Provider Readiness</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              claude?.authenticated ? 'bg-[#f0c419] text-black' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]', claude?.authenticated ? 'text-black/55' : 'text-[#f4f0e8]/45')}>Claude CLI</p>
              <div className={cn('mt-2 space-y-1 text-sm', claude?.authenticated ? 'text-black/80' : 'text-[#f4f0e8]/80')}>
                <p>Installed: {claude?.installed ? 'Yes' : 'No'}</p>
                <p>Authenticated: {claude?.authenticated ? 'Yes' : 'No'}</p>
                <p>Version: {claude?.version ?? 'Unknown'}</p>
                <p>Path: {claude?.path ?? 'Not found'}</p>
              </div>
            </div>
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              codex?.authenticated ? 'bg-[#f0c419] text-black' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]', codex?.authenticated ? 'text-black/55' : 'text-[#f4f0e8]/45')}>Codex CLI</p>
              <div className={cn('mt-2 space-y-1 text-sm', codex?.authenticated ? 'text-black/80' : 'text-[#f4f0e8]/80')}>
                <p>Installed: {codex?.installed ? 'Yes' : 'No'}</p>
                <p>Authenticated: {codex?.authenticated ? 'Yes' : 'No'}</p>
                <p>Version: {codex?.version ?? 'Unknown'}</p>
                <p>Path: {codex?.path ?? 'Not found'}</p>
              </div>
            </div>
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              opencode?.verified ? 'bg-[#f0c419] text-black' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]', opencode?.verified ? 'text-black/55' : 'text-[#f4f0e8]/45')}>OpenCode CLI</p>
              <div className={cn('mt-2 space-y-1 text-sm', opencode?.verified ? 'text-black/80' : 'text-[#f4f0e8]/80')}>
                <p>Installed: {opencode?.installed ? 'Yes' : 'No'}</p>
                <p>Verified: {opencode?.verified ? 'Yes' : 'No'}</p>
                <p>Version: {opencode?.version ?? 'Unknown'}</p>
                <p>Path: {opencode?.path ?? 'Not found'}</p>
                <p>Verify output: {opencode?.verifyOutput ?? 'None'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-4">
          <p className="text-sm font-medium">System Info</p>
          <div className="mt-3 rounded-[1.2rem] border border-white/8 bg-black/30 p-3 text-sm text-[#f4f0e8]/78">
            <p>OS: {prerequisites?.os ?? 'Unknown'}</p>
            <p>Arch: {prerequisites?.arch ?? 'Unknown'}</p>
            <p>Overall ready: {setupStatus.ready ? 'Yes' : 'No'}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill ok={setupStatus.requiredReady} label="Required setup" />
            <StatusPill ok={setupStatus.aiReady} label="AI provider" />
            <StatusPill ok={setupStatus.languageReady} label="Languages" />
          </div>
        </div>

        <SwapCard swap={swap} onRefresh={onRefresh} />
      </div>

      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
        <p className="text-sm font-medium">Prerequisites</p>
        <div className="mt-3 space-y-5">
          {prerequisites?.tools.length ? (
            <>
              <ToolSection
                title="Required Setup"
                hint="Complete Git and package managers first."
                tools={requiredTools}
              />
              <ToolSection
                title="AI Assistant"
                hint="Choose at least one CLI with working auth."
                tools={aiTools}
              />
              <ToolSection
                title="Language"
                hint="Language runtimes and compilers available to workspace tasks."
                tools={languageTools}
              />
              <ToolSection
                title="Supporting Tools"
                hint="Additional detected tools outside the core setup path."
                tools={supportingTools}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No prerequisites data. Refresh to load.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
