import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { PythonDebugInfo } from '#/lib/api'
import { cn } from '#/lib/utils'
import { Code, Copy, Check } from 'lucide-react'

interface Props {
  pythonInfo: PythonDebugInfo | null
}

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 break-all rounded-lg border border-white/8 bg-black/40 px-3 py-2 font-mono text-xs text-[#9df6cd]">
        $ {command}
      </code>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0 text-[#f4f0e8]/50 hover:text-[#f4f0e8]"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

export function LanguagesDiagnosticsTab({ pythonInfo }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      {/* Left sidebar: Python status summary */}
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-[#f0c419]" />
            <p className="text-sm font-medium">Python Runtime</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              pythonInfo?.installed ? 'bg-[#f0c419] text-black' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]',
                pythonInfo?.installed ? 'text-black/55' : 'text-[#f4f0e8]/45')}>
                Status
              </p>
              <p className={cn('mt-2 text-3xl font-semibold',
                pythonInfo?.installed ? '' : 'text-red-400')}>
                {pythonInfo?.installed ? `v${pythonInfo.version}` : 'Not Found'}
              </p>
              {pythonInfo?.binary && (
                <p className={cn('mt-1 font-mono text-xs', pythonInfo.installed ? 'text-black/60' : 'text-[#f4f0e8]/50')}>
                  {pythonInfo.binary}
                </p>
              )}
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">pip</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Installed: {pythonInfo?.pip_installed ? 'Yes' : 'No'}</p>
                <p>Version: {pythonInfo?.pip_version ?? 'Unknown'}</p>
                <p>Path: {pythonInfo?.pip_path ?? 'Not found'}</p>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Environment</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>venv module: {pythonInfo?.venv_available ? 'Available' : 'Not available'}</p>
                <p>Deadsnakes PPA: {pythonInfo?.ppa_added ? 'Added' : 'Not added'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right main: detailed tool rows */}
      <div className="min-h-0 overflow-y-auto rounded-[1.5rem] border border-white/8 bg-[#101010] p-3">
        <p className="text-sm font-medium">Python Installation Details</p>
        <div className="mt-3 space-y-2">
          {pythonInfo ? (
            <>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Python Binary</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{pythonInfo.path ?? 'Not found'}</p>
                  </div>
                  <Badge variant="outline" className={cn('border-white/10',
                    pythonInfo.installed ? 'text-green-400' : 'text-red-400')}>
                    {pythonInfo.installed ? 'installed' : 'missing'}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-[#f4f0e8]/60">
                  {pythonInfo.version && <span>v{pythonInfo.version}</span>}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">pip</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{pythonInfo.pip_path ?? 'Not found'}</p>
                  </div>
                  <Badge variant="outline" className={cn('border-white/10',
                    pythonInfo.pip_installed ? 'text-green-400' : 'text-red-400')}>
                    {pythonInfo.pip_installed ? 'installed' : 'missing'}
                  </Badge>
                </div>
                {pythonInfo.pip_version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{pythonInfo.pip_version}</span>
                  </div>
                )}
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-medium">venv module</p></div>
                  <Badge variant="outline" className={cn('border-white/10',
                    pythonInfo.venv_available ? 'text-green-400' : 'text-yellow-400')}>
                    {pythonInfo.venv_available ? 'available' : 'unavailable'}
                  </Badge>
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-medium">Deadsnakes PPA</p></div>
                  <Badge variant="outline" className={cn('border-white/10',
                    pythonInfo.ppa_added ? 'text-green-400' : 'text-[#f4f0e8]/40')}>
                    {pythonInfo.ppa_added ? 'added' : 'not added'}
                  </Badge>
                </div>
              </div>

              {/* Install commands for missing components */}
              {(!pythonInfo.installed || !pythonInfo.pip_installed || !pythonInfo.venv_available) && (
                <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Install Commands</p>
                  <div className="mt-3 space-y-2">
                    {!pythonInfo.installed && (
                      <>
                        <p className="text-xs text-[#f4f0e8]/60">Install Python:</p>
                        <CopyableCommand command="sudo apt update && sudo apt install -y python3" />
                      </>
                    )}
                    {pythonInfo.installed && !pythonInfo.pip_installed && (
                      <>
                        <p className="text-xs text-[#f4f0e8]/60">Install pip:</p>
                        <CopyableCommand command={`${pythonInfo.binary ?? 'python3'} -m ensurepip --upgrade || curl -sS https://bootstrap.pypa.io/get-pip.py | ${pythonInfo.binary ?? 'python3'} - --break-system-packages`} />
                      </>
                    )}
                    {pythonInfo.installed && !pythonInfo.venv_available && (
                      <>
                        <p className="text-xs text-[#f4f0e8]/60">Install venv:</p>
                        <CopyableCommand command={`sudo apt install -y ${pythonInfo.binary ?? 'python3'}-venv`} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No Python data. Refresh to load.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
