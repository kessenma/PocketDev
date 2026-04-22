# Beta Update Debugging Guide

This doc covers how to debug a failed beta (`nightly`) install on the server.

## What happens when you click "Install Beta"

1. Console POSTs to `/PocketDev/api/console/update` with `{ version: "nightly" }`
2. Agent calls `systemd-run` to download `https://pocketdev.run/agent/bundle/nightly` and extract it
3. `systemctl restart pocketdev-agent` runs inside the systemd transient unit
4. Console polls `/health` every 3s (up to 60s) watching for uptime reset

---

## Step 1 — Check if the nightly release exists on GitHub

```bash
curl -s https://pocketdev.run/agent/version | jq .
```

Expected: a `beta` field with a version and `publishedAt`. If missing, the `nightly-latest` pre-release either doesn't exist or the web server can't reach GitHub.

```bash
# Check directly via GitHub API (no auth needed for public repos)
curl -s "https://api.github.com/repos/kessenma/PocketDev/releases?per_page=10" \
  | jq '.[].tag_name'
```

Look for `"nightly-latest"` in the list.

---

## Step 2 — Test the bundle download URL

```bash
curl -I https://pocketdev.run/agent/bundle/nightly
```

Should return `200` with `Content-Type: application/gzip`. A `404` means no beta release exists. A `502` means the web server can't proxy the GitHub asset (check `GITHUB_TOKEN` on the web app).

---

## Step 3 — Manually trigger the update and watch logs

```bash
# Stream the agent logs in one terminal
journalctl -u pocketdev-agent -f

# In another terminal, trigger the update via the API
curl -s -X POST http://localhost:4387/PocketDev/api/console/update \
  -H "Content-Type: application/json" \
  -H "Cookie: <your session cookie>" \
  -d '{"version":"nightly"}'
```

Watch for:
- `systemd-run` invocation
- Any download errors (curl exit codes)
- `systemctl restart pocketdev-agent` running
- The agent coming back up

---

## Step 4 — Check the systemd transient unit

`systemd-run --no-block` creates a transient unit like `pocketdev-upgrade-<timestamp>.service`. After triggering an update:

```bash
# List recent transient units
systemctl list-units 'pocketdev-upgrade-*' --all

# Check the status of the most recent one
systemctl status 'pocketdev-upgrade-*'

# Full logs
journalctl -u 'pocketdev-upgrade-*' --no-pager
```

Look for:
- Download failure (curl non-zero exit)
- Tar extraction errors
- Permission errors writing to the install directory

---

## Step 5 — Find the install directory

```bash
# Where is pocketdev installed?
which pocketdev || systemctl cat pocketdev-agent | grep ExecStart
```

Typically `/usr/local/bin/pocketdev` or `~/.pocketdev/`. The install script extracts the bundle here.

```bash
# Check the version.json after a successful install
cat $(dirname $(which pocketdev))/version.json
# or
cat ~/.pocketdev/version.json
```

---

## Step 6 — Manually run the install script for nightly

The agent uses `systemd-run` to run something like:

```bash
# Download nightly bundle manually to test
curl -fsSL https://pocketdev.run/agent/bundle/nightly -o /tmp/nightly-bundle.tar.gz

# Check it's a valid tarball
tar -tzf /tmp/nightly-bundle.tar.gz | head -20

# Check version.json inside
tar -xzf /tmp/nightly-bundle.tar.gz -O version.json 2>/dev/null || \
  tar -xzf /tmp/nightly-bundle.tar.gz --wildcards '*/version.json' -O
```

---

## Step 7 — Check the update route source

The versioned update path in `apps/agent/src/routes/console.ts` around line 1131:

```
POST /api/console/update { version: "nightly" }
  → downloads https://pocketdev.run/agent/bundle/nightly
  → validates tarball
  → extracts to install dir via systemd-run
  → systemctl restart pocketdev-agent
```

If there's a validation failure (e.g. tarball too small, missing index.js), the route returns an error before spawning systemd-run. Check the response body of the update POST.

---

## Known issue (fixed in console UI)

**Symptom**: Update times out even though the agent actually restarted successfully.

**Root cause**: The polling code was comparing `health.version === 'nightly'` after restart, but the installed version is something like `0.2.0-beta.a1b2c3d` — they never match, so it always times out after 60s.

**Fix**: The console now uses uptime-based restart detection for nightly installs (checks if `uptime < baselineUptime` instead of comparing version strings). This fix is in `ConsoleDataContext.tsx`.

If you're still seeing timeouts after this fix, the agent isn't actually restarting — follow Steps 3–6 above to diagnose why.
