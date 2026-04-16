import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  bulkUpsertConsoleEnvVars,
  createConsoleEnvVar,
  deleteConsoleEnvVar,
  fetchConsoleEnvVars,
  fetchConsoleProjects,
  fetchRepoSummary,
  updateConsoleEnvVar,
  type ConsoleProject,
  type EnvVar,
} from '#/lib/api'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

function parseDotEnv(text: string) {
  const items: { key: string; value: string | null }[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx < 1) continue
    const key = line.slice(0, eqIdx).trim().replace(/\s+/g, '_')
    if (!key) continue
    let value = line.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    items.push({ key, value: value || null })
  }
  return items
}

type EditingRow = {
  id: string | null  // null = new row
  key: string
  value: string
  comment: string
  isSecret: boolean
  isMultiline: boolean
}

export function EnvVarsPanel() {
  const [projects, setProjects] = useState<ConsoleProject[]>([])
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  // Inline editing state
  const [editing, setEditing] = useState<EditingRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsedImport = parseDotEnv(importText)

  const refresh = useCallback(async (path?: string) => {
    const target = path ?? projectPath
    if (!target) return
    setLoading(true)
    setError(null)
    try {
      const vars = await fetchConsoleEnvVars(target)
      setEnvVars(vars)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load env vars')
    } finally {
      setLoading(false)
    }
  }, [projectPath])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchConsoleProjects(), fetchRepoSummary().catch(() => null)])
      .then(([projs, summary]) => {
        setProjects(projs)
        const activePath = summary?.repoPath ?? projs[0]?.absolutePath ?? null
        setProjectPath(activePath)
        if (activePath) {
          return fetchConsoleEnvVars(activePath).then(setEnvVars)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  async function handleProjectChange(path: string) {
    setProjectPath(path)
    setEditing(null)
    setShowImport(false)
    setImportText('')
    setRevealedIds(new Set())
    await refresh(path)
  }

  function startAdd() {
    setEditing({ id: null, key: '', value: '', comment: '', isSecret: false, isMultiline: false })
    setSaveError(null)
  }

  function startEdit(item: EnvVar) {
    setEditing({
      id: item.id,
      key: item.key,
      value: item.value ?? '',
      comment: item.comment ?? '',
      isSecret: item.isSecret,
      isMultiline: item.isMultiline,
    })
    setSaveError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setSaveError(null)
  }

  async function handleSave() {
    if (!editing || !projectPath) return
    if (!editing.key.trim()) { setSaveError('Key is required'); return }
    setSaving(true)
    setSaveError(null)
    try {
      if (editing.id === null) {
        await createConsoleEnvVar({
          projectPath,
          key: editing.key.trim(),
          value: editing.value || null,
          comment: editing.comment.trim() || null,
          isSecret: editing.isSecret,
          isMultiline: editing.isMultiline,
        })
      } else {
        await updateConsoleEnvVar(editing.id, {
          key: editing.key.trim(),
          value: editing.value || null,
          comment: editing.comment.trim() || null,
          isSecret: editing.isSecret,
          isMultiline: editing.isMultiline,
        })
      }
      setEditing(null)
      await refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteConsoleEnvVar(id)
    setEnvVars((prev) => prev.filter((v) => v.id !== id))
  }

  async function handleImport() {
    if (!projectPath || parsedImport.length === 0) return
    setImporting(true)
    setImportError(null)
    try {
      const result = await bulkUpsertConsoleEnvVars(projectPath, parsedImport)
      setEnvVars(result)
      setImportText('')
      setShowImport(false)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setImportText(text)
        setShowImport(true)
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeProject = projects.find((p) => p.absolutePath === projectPath)

  return (
    <div className="overflow-hidden rounded-[1.1rem] border-2 border-border bg-card text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.45rem] border-2 border-black/75 bg-[#22c55e] text-black shadow-[3px_3px_0_0_rgba(0,0,0,0.28)]">
            <span className="text-sm font-bold">{'{ }'}</span>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-foreground/50">Project</p>
            <h2 className="text-base font-bold uppercase tracking-wide">Environment Variables</h2>
          </div>
          {envVars.length > 0 && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground/60">
              {envVars.length}
            </span>
          )}
        </div>

        {/* Project selector */}
        {projects.length > 0 && (
          <select
            value={projectPath ?? ''}
            onChange={(e) => { void handleProjectChange(e.target.value) }}
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.absolutePath}>{p.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          {!collapsed && (
            <>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".env,.txt,text/plain"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload .env
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => { setShowImport(!showImport); setImportError(null) }}
              >
                Paste .env
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={startAdd}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground/50 hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Active project path hint */}
      {!collapsed && activeProject && (
        <div className="border-t border-border px-5 py-1.5">
          <p className="font-mono text-[0.65rem] text-foreground/30">{activeProject.absolutePath}</p>
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-border">
          {/* Import panel (paste) */}
          {showImport && (
            <div className="border-b border-border bg-card p-4">
              <p className="mb-2 text-xs text-foreground/50">
                Paste the contents of a .env file. Lines starting with # are ignored.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'DATABASE_URL=postgres://...\nAPI_KEY=sk-...'}
                className="w-full rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground placeholder-foreground/25 focus:outline-none focus:ring-1 focus:ring-green-500"
                rows={5}
              />
              {parsedImport.length > 0 && (
                <p className="mt-1 text-xs text-foreground/50">
                  {parsedImport.length} variable{parsedImport.length !== 1 ? 's' : ''} detected
                </p>
              )}
              {importError && <p className="mt-1 text-xs text-red-400">{importError}</p>}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#22c55e] text-black hover:bg-[#16a34a]"
                  onClick={handleImport}
                  disabled={importing || parsedImport.length === 0}
                >
                  {importing ? 'Importing…' : `Import ${parsedImport.length > 0 ? parsedImport.length : ''}`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground/50"
                  onClick={() => { setShowImport(false); setImportText(''); setImportError(null) }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Add/Edit form */}
          {editing && (
            <div className="border-b border-border bg-muted p-4">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-widest text-foreground/50">Key</label>
                    <Input
                      value={editing.key}
                      onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                      placeholder="VARIABLE_NAME"
                      className="font-mono focus-visible:ring-green-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-widest text-foreground/50">Value</label>
                    <Input
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      placeholder="value"
                      type={editing.isSecret ? 'password' : 'text'}
                      className="font-mono focus-visible:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-widest text-foreground/50">Comment (optional)</label>
                  <Input
                    value={editing.comment}
                    onChange={(e) => setEditing({ ...editing, comment: e.target.value })}
                    placeholder="Describe this variable"
                    maxLength={256}
                    className="focus-visible:ring-green-500"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/70">
                    <input
                      type="checkbox"
                      checked={editing.isSecret}
                      onChange={(e) => setEditing({ ...editing, isSecret: e.target.checked })}
                      className="h-4 w-4 accent-[#22c55e]"
                    />
                    Secret
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/70">
                    <input
                      type="checkbox"
                      checked={editing.isMultiline}
                      onChange={(e) => setEditing({ ...editing, isMultiline: e.target.checked })}
                      className="h-4 w-4 accent-[#22c55e]"
                    />
                    Multiline
                  </label>
                </div>
                {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[#22c55e] text-black hover:bg-[#16a34a]"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : (editing.id === null ? 'Add Variable' : 'Save')}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-foreground/50" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {!projectPath ? (
            <div className="p-6 text-center text-sm text-foreground/40">No project selected.</div>
          ) : loading ? (
            <div className="p-6 text-center text-sm text-foreground/40">Loading…</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-400">{error}</div>
          ) : envVars.length === 0 ? (
            <div className="p-6 text-center text-sm text-foreground/40">
              No environment variables yet. Click Add to create one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[0.65rem] font-semibold uppercase tracking-widest text-foreground/40">
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">Value</th>
                  <th className="px-4 py-2 text-left">Comment</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((item) => {
                  const revealed = revealedIds.has(item.id)
                  return (
                    <tr key={item.id} className="border-b border-border/40 hover:bg-muted">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-foreground">{item.key}</code>
                          {item.isSecret && (
                            <span className="rounded-full border border-[#22c55e]/40 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-[#22c55e]">
                              secret
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-foreground/70">
                            {item.value === null
                              ? <span className="text-foreground/30">(empty)</span>
                              : item.isSecret && !revealed
                                ? '••••••••'
                                : item.value}
                          </code>
                          {item.isSecret && (
                            <button
                              onClick={() => toggleReveal(item.id)}
                              className="text-foreground/30 hover:text-foreground/60"
                            >
                              {revealed
                                ? <EyeOff className="h-3.5 w-3.5" />
                                : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-foreground/40 italic">
                        {item.comment ?? ''}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded p-1 text-foreground/30 hover:text-foreground/70"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { void handleDelete(item.id) }}
                            className="rounded p-1 text-foreground/30 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
