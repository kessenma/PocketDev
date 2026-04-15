import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { PythonDebugInfo, RustDebugInfo, GoDebugInfo, TypeScriptDebugInfo } from '#/lib/api'
import { cn } from '#/lib/utils'
import { Copy, Check } from 'lucide-react'
import { BrandIcon } from '#/components/ui/brand-icon'

interface Props {
  pythonInfo: PythonDebugInfo | null
  rustInfo: RustDebugInfo | null
  goInfo: GoDebugInfo | null
  tsInfo: TypeScriptDebugInfo | null
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

export function LanguagesDiagnosticsTab({ pythonInfo, rustInfo, goInfo, tsInfo }: Props) {
  return (
    <div className="grid h-full gap-3 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      {/* Left sidebar: status summaries */}
      <div className="space-y-3">
        {/* Python status */}
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="python" size={18} />
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

        {/* Rust status */}
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="rust" size={18} />
            <p className="text-sm font-medium">Rust Toolchain</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              rustInfo?.installed ? 'bg-[#CE422B] text-white' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]',
                rustInfo?.installed ? 'text-white/65' : 'text-[#f4f0e8]/45')}>
                Status
              </p>
              <p className={cn('mt-2 text-3xl font-semibold',
                rustInfo?.installed ? '' : 'text-red-400')}>
                {rustInfo?.installed ? `v${rustInfo.version}` : 'Not Found'}
              </p>
              {rustInfo?.path && (
                <p className={cn('mt-1 font-mono text-xs', rustInfo.installed ? 'text-white/60' : 'text-[#f4f0e8]/50')}>
                  {rustInfo.path}
                </p>
              )}
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Cargo</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Installed: {rustInfo?.cargo_installed ? 'Yes' : 'No'}</p>
                <p>Version: {rustInfo?.cargo_version ?? 'Unknown'}</p>
                <p>Path: {rustInfo?.cargo_path ?? 'Not found'}</p>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Rustup</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Installed: {rustInfo?.rustup_installed ? 'Yes' : 'No'}</p>
                <p>Version: {rustInfo?.rustup_version ?? 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Go status */}
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="go" size={18} />
            <p className="text-sm font-medium">Go Runtime</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              goInfo?.installed ? 'bg-[#00ADD8] text-white' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]',
                goInfo?.installed ? 'text-white/65' : 'text-[#f4f0e8]/45')}>
                Status
              </p>
              <p className={cn('mt-2 text-3xl font-semibold',
                goInfo?.installed ? '' : 'text-red-400')}>
                {goInfo?.installed ? `v${goInfo.version}` : 'Not Found'}
              </p>
              {goInfo?.path && (
                <p className={cn('mt-1 font-mono text-xs', goInfo.installed ? 'text-white/70' : 'text-[#f4f0e8]/50')}>
                  {goInfo.path}
                </p>
              )}
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Environment</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>GOPATH: {goInfo?.gopath ?? 'Not set'}</p>
                <p>GOROOT: {goInfo?.goroot ?? 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TypeScript status */}
        <div className="rounded-[1.5rem] border border-white/8 bg-black/35 p-4">
          <div className="flex items-center gap-2">
            <BrandIcon brand="typescript" size={18} />
            <p className="text-sm font-medium">TypeScript Compiler</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className={cn(
              'rounded-[1.2rem] border border-white/8 p-4',
              tsInfo?.installed ? 'bg-[#3178C6] text-white' : 'bg-white/6',
            )}>
              <p className={cn('text-[0.68rem] font-semibold uppercase tracking-[0.26em]',
                tsInfo?.installed ? 'text-white/65' : 'text-[#f4f0e8]/45')}>
                Status
              </p>
              <p className={cn('mt-2 text-3xl font-semibold',
                tsInfo?.installed ? '' : 'text-red-400')}>
                {tsInfo?.installed ? `v${tsInfo.version}` : 'Not Found'}
              </p>
              {tsInfo?.path && (
                <p className={cn('mt-1 font-mono text-xs', tsInfo.installed ? 'text-white/70' : 'text-[#f4f0e8]/50')}>
                  {tsInfo.path}
                </p>
              )}
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/6 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">ts-node</p>
              <div className="mt-2 space-y-1 text-sm text-[#f4f0e8]/80">
                <p>Installed: {tsInfo?.ts_node_installed ? 'Yes' : 'No'}</p>
                <p>Version: {tsInfo?.ts_node_version ?? 'Unknown'}</p>
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
                        <CopyableCommand command={`${pythonInfo.binary ?? 'python3'} -m ensurepip --upgrade || (curl -sS -o /tmp/get-pip.py https://bootstrap.pypa.io/get-pip.py && ${pythonInfo.binary ?? 'python3'} /tmp/get-pip.py --break-system-packages)`} />
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

        {/* Rust details */}
        <p className="mt-5 text-sm font-medium">Rust Installation Details</p>
        <div className="mt-3 space-y-2">
          {rustInfo ? (
            <>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">rustc</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{rustInfo.path ?? 'Not found'}</p>
                  </div>
                  <Badge variant="outline" className={cn('border-white/10',
                    rustInfo.installed ? 'text-green-400' : 'text-red-400')}>
                    {rustInfo.installed ? 'installed' : 'missing'}
                  </Badge>
                </div>
                {rustInfo.version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{rustInfo.version}</span>
                  </div>
                )}
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">cargo</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{rustInfo.cargo_path ?? 'Not found'}</p>
                  </div>
                  <Badge variant="outline" className={cn('border-white/10',
                    rustInfo.cargo_installed ? 'text-green-400' : 'text-red-400')}>
                    {rustInfo.cargo_installed ? 'installed' : 'missing'}
                  </Badge>
                </div>
                {rustInfo.cargo_version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{rustInfo.cargo_version}</span>
                  </div>
                )}
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-medium">rustup</p></div>
                  <Badge variant="outline" className={cn('border-white/10',
                    rustInfo.rustup_installed ? 'text-green-400' : 'text-[#f4f0e8]/40')}>
                    {rustInfo.rustup_installed ? 'installed' : 'not found'}
                  </Badge>
                </div>
                {rustInfo.rustup_version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{rustInfo.rustup_version}</span>
                  </div>
                )}
              </div>

              {!rustInfo.installed && (
                <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Install Commands</p>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[#f4f0e8]/60">Install Rust via rustup:</p>
                    <CopyableCommand command="curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No Rust data. Refresh to load.
            </div>
          )}
        </div>

        {/* Go details */}
        <p className="mt-5 text-sm font-medium">Go Installation Details</p>
        <div className="mt-3 space-y-2">
          {goInfo ? (
            <>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Go Binary</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{goInfo.path ?? 'Not found'}</p>
                  </div>
                  <Badge variant="outline" className={cn('border-white/10',
                    goInfo.installed ? 'text-green-400' : 'text-red-400')}>
                    {goInfo.installed ? 'installed' : 'missing'}
                  </Badge>
                </div>
                {goInfo.version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{goInfo.version}</span>
                  </div>
                )}
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">GOPATH</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{goInfo.gopath ?? 'Not set'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">GOROOT</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{goInfo.goroot ?? 'Not set'}</p>
                  </div>
                </div>
              </div>

              {!goInfo.installed && (
                <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Install Commands</p>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[#f4f0e8]/60">Install Go:</p>
                    <CopyableCommand command="sudo apt install -y golang-go" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No Go data. Refresh to load.
            </div>
          )}
        </div>

        {/* TypeScript details */}
        <p className="mt-5 text-sm font-medium">TypeScript Installation Details</p>
        <div className="mt-3 space-y-2">
          {tsInfo ? (
            <>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">tsc</p>
                    <p className="mt-1 font-mono text-xs text-[#f4f0e8]/50">{tsInfo.path ?? 'Not found'}</p>
                  </div>
                  <Badge variant="outline" className={cn('border-white/10',
                    tsInfo.installed ? 'text-green-400' : 'text-red-400')}>
                    {tsInfo.installed ? 'installed' : 'missing'}
                  </Badge>
                </div>
                {tsInfo.version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{tsInfo.version}</span>
                  </div>
                )}
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-medium">ts-node</p></div>
                  <Badge variant="outline" className={cn('border-white/10',
                    tsInfo.ts_node_installed ? 'text-green-400' : 'text-[#f4f0e8]/40')}>
                    {tsInfo.ts_node_installed ? 'installed' : 'not found'}
                  </Badge>
                </div>
                {tsInfo.ts_node_version && (
                  <div className="mt-2 text-xs text-[#f4f0e8]/60">
                    <span>v{tsInfo.ts_node_version}</span>
                  </div>
                )}
              </div>

              {!tsInfo.installed && (
                <div className="rounded-[1.2rem] border border-white/8 bg-black/30 p-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[#f4f0e8]/45">Install Commands</p>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[#f4f0e8]/60">Install TypeScript:</p>
                    <CopyableCommand command="npm install -g typescript" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-[#f4f0e8]/52">
              No TypeScript data. Refresh to load.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
