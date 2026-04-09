# Memory Leak & Stability Analysis — 2026-04-09

Server: 178.104.93.199 (ubuntu-4gb-tracktrades, 2 cores, 3.7GB RAM, 0 swap)

## Already Fixed (commit 5507a79)

### 1. Completed processes never freed from `processes` Map
Every finished task stayed in memory forever — subprocess objects, stream readers, tool-use arrays, text buffers. After many tasks, RAM exhausted.

**Fix:** `onComplete` callback calls `processes.delete(taskId)` in both `ManagedProcess` and `ManagedTmuxProcess`.

### 2. Stale WebSocket connections never closed
Mobile app reload opens a new WS with the same `deviceId`. Old connection was overwritten in the `clients` Map but never `.close()`'d — stayed alive in Elysia's pool.

**Fix:** Before registering a new connection, check for existing one from same device, explicitly close it + clean up container log follower.

---

## Still Outstanding

### 3. `checkAllPrerequisites()` spawns ~50+ processes simultaneously (CRITICAL)

**File:** `apps/agent/src/services/prerequisites.ts:634`

`Promise.all()` runs 18 tool checks concurrently. Each check spawns 2-5 subprocesses (`which`, `--version`, auth status). That's 50+ processes at once, many extremely heavy:

| Process | RAM per instance |
|---------|-----------------|
| `opencode run --help` | ~180MB |
| `opencode --version` | ~140MB |
| `copilot --version` | ~180MB |
| `claude --version` | ~130MB |
| `claude auth status` | ~125MB |
| `node /usr/bin/pnpm --version` | ~65MB |

On a 2-core / 3.7GB / no-swap server, this instantly exhausts RAM. OOM killer fired at 16:20 today:

```
Out of memory: Killed process 5889 (MainThread) total-vm:1449384kB, anon-rss:133084kB
```

**Triggered from 3 places:**
- WebSocket command `setup.check_prerequisites` (`services/ws.ts:139`)
- `GET /debug/setup` (`routes/console.ts:405`)
- `GET /prerequisites` (`routes/console.ts:481`)

**Fix — serialize + cache:**

```ts
// 1. Run checks in small batches (3-4 at a time) instead of all 18 at once
async function checkAllPrerequisites(): Promise<PrerequisitesReport> {
  const osInfo = await getOsInfo()
  const databases = await detectRunningDatabases()

  // Batch 1: lightweight checks
  const [git, node, npm, bun, pnpm, tmux] = await Promise.all([
    checkGit(), checkNode(), checkNpm(), checkBun(), checkPnpm(), checkTmux(),
  ])

  // Batch 2: medium checks
  const [githubCli, docker, chromium, python, rust, go, typescript] = await Promise.all([
    checkGitHubCli(), checkDocker(), checkChromium(), checkPython(), checkRust(), checkGo(), checkTypeScript(),
  ])

  // Batch 3: heavy AI CLI checks (these are the big ones — run sequentially)
  const claudeCli = await checkClaudeCli()
  const codexCli = await checkCodexCli()
  const copilotCli = await checkCopilotCli()
  const opencodeCli = await checkOpenCodeCli()

  const tools = [git, githubCli, node, npm, claudeCli, codexCli, copilotCli, opencodeCli, docker, bun, pnpm, chromium, python, rust, go, typescript, tmux]
  // ... rest of ready logic
}

// 2. Cache results for 2 minutes — tool versions don't change between requests
let cachedReport: PrerequisitesReport | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 2 * 60 * 1000

export async function checkAllPrerequisites(): Promise<PrerequisitesReport> {
  if (cachedReport && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedReport
  }
  const report = await checkAllPrerequisitesUncached()
  cachedReport = report
  cacheTimestamp = Date.now()
  return report
}
```

### 4. No swap configured (HIGH)

With 0 swap, there is zero safety net when memory spikes. `kswapd0` was at 51% CPU thrashing with nowhere to page out to. A single large task + the prerequisite storm = OOM kill cascade.

**Fix — add 2GB swap:**

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Optional: reduce swappiness so swap is only used under pressure
echo 'vm.swappiness=10' >> /etc/sysctl.conf && sysctl -p
```

### 5. No process timeout on version checks (LOW)

If any `--version` or `auth status` command hangs (network call, interactive prompt), it blocks forever. The `exec()` helper in `prerequisites.ts` has no timeout.

**Fix — add a timeout to the exec helper:**

```ts
async function exec(cmd: string, timeoutMs = 15000): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(['bash', '-lc', wrapped], { stdout: 'pipe', stderr: 'pipe' })
  const timer = setTimeout(() => proc.kill(), timeoutMs)
  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  clearTimeout(timer)
  return { stdout: stdout.trim(), exitCode: proc.exitCode ?? 1 }
}
```

---

## Evidence Collected

```
# Memory at time of analysis (16:25, 15 min after boot)
Mem: 3.7Gi total, 2.6Gi used, 509Mi free
Swap: 0B total, 0B used

# Load average (2-core machine)
load average: 11.96, 50.70, 52.88

# OOM kills in dmesg
MainThread invoked oom-killer (16:20)
Killed process 2865 (systemd)
Killed process 5889 (MainThread) — 133MB RSS, PocketDev agent child

# Process tree under PocketDev agent (PID 12048) at time of analysis
13 concurrent version-check processes observed:
  - 7x opencode (--version / run --help)
  - 2x copilot (--version)
  - 2x claude (--version / auth status)
  - 1x pnpm (--version)
  - 1x gh (copilot -- --version)
```
