# Running the PocketDev agent on macOS (Mac mini)

The agent runs on macOS (Apple Silicon or Intel) as a **per-user launchd
LaunchAgent**, not a root systemd service. Same bundle, same port, same
mobile app — only the supervisor and installer differ.

```bash
curl -fsSL https://pocketdev.run/install.sh | bash          # hands off to install-macos.sh on Darwin
# or directly:
curl -fsSL https://pocketdev.run/install-macos.sh | bash
# HTTPS on your tailnet (recommended — see tailscale.md):
curl -fsSL https://pocketdev.run/install-macos.sh | bash -s -- --tailscale-serve
```

Run it **as your normal user, without sudo**.

## Why a user LaunchAgent (and not root)

- **Keychain.** Claude Code (and `gh`) store credentials in the login
  Keychain on macOS. Only processes in the user's GUI (Aqua) launchd session
  can reach it — a root LaunchDaemon would see every CLI as logged out.
- **Homebrew refuses to run as root**, and the agent's tool installers use brew.
- Your git config, SSH keys, `~/.claude`, `~/.codex` etc. are just *there*.

Trade-off: a LaunchAgent only runs while the user is logged in. For an
always-on Mac mini, turn on auto-login (see below).

## What gets installed

| Path | What |
|---|---|
| `~/.pocketdev/agent/` | agent bundle (`index.js`, console SPA, migrations) |
| `~/.pocketdev/data/pocketdev.db` | SQLite DB (devices, tasks, config) |
| `~/Library/LaunchAgents/run.pocketdev.agent.plist` | launchd job (`KeepAlive`, `RunAtLoad`, `AbandonProcessGroup`) |
| `~/Library/Logs/PocketDev/agent.log` | stdout/stderr |

Not installed on macOS: Caddy, iptables port-locking, the swap manager, the
`/tmp` cleanup timer. HTTPS + remote access come from Tailscale instead.

## Day-to-day

```bash
tail -f ~/Library/Logs/PocketDev/agent.log                    # logs
launchctl kickstart -k gui/$(id -u)/run.pocketdev.agent       # restart
launchctl print gui/$(id -u)/run.pocketdev.agent | head -30   # status / pid / env
curl http://localhost:4387/PocketDev/health                   # health
curl -fsSL https://pocketdev.run/install-macos.sh | bash -s -- --uninstall
```

Console **Upgrade / rollback** and mobile **Uninstall** work as on Linux: the
agent writes a helper script and starts it in a new session
(`spawnDetachedScript` in `apps/agent/src/services/system/platform.ts`). The
plist's `AbandonProcessGroup` keeps launchd from reaping it, so it survives the
agent being restarted by `launchctl kickstart -k`.

## Making a Mac mini behave like a server

The installer checks these and prints what's missing:

```bash
sudo pmset -a sleep 0 disksleep 0     # never sleep (display sleep is fine)
sudo pmset -a autorestart 1           # power back on after a power cut
sudo pmset -a womp 1                  # wake for network access
```

- **Auto-login:** System Settings → Users & Groups → *Automatically log in as…*
  so the LaunchAgent starts after a reboot without anyone at the keyboard.
- **FileVault** disables auto-login: after a reboot the Mac waits at the
  unlock screen and the agent stays down until someone logs in. Either plan
  for that, or turn FileVault off on a machine that never leaves the house
  (a security trade-off — your call).
- **Privacy (TCC):** the agent can't silently read `~/Desktop`, `~/Documents`,
  `~/Downloads` or iCloud folders — macOS shows a permission prompt on the
  Mac's screen and the read blocks until someone answers it. Keep projects in
  e.g. `~/ws` or `~/code`. If you really need those folders, grant **Full Disk
  Access** to `~/.bun/bin/bun` in System Settings → Privacy & Security.

## Tooling

The prerequisites screen suggests Homebrew installs on macOS
(`brew install node gh tmux go …`, OrbStack for Docker). Install
[Homebrew](https://brew.sh) and the Xcode Command Line Tools
(`xcode-select --install`) first. The agent's `PATH` (set in the plist)
includes `~/.bun/bin`, `~/.local/bin` (Claude Code's native installer),
and the Homebrew prefix — re-run the installer after installing Homebrew so
the plist picks it up.

## Platform differences in the code

Everything platform-specific goes through
`apps/agent/src/services/system/platform.ts`:

- `getServiceManager()` → `systemd | launchd | none` (from
  `POCKETDEV_SERVICE_MANAGER`, which both installers set).
- `restartAgentShell()` → `systemctl restart …` / `launchctl kickstart -k …`.
- `spawnDetachedScript()` → `systemd-run` transient unit / new session.
- `platformCommand({ linux, macos })` → install hints and executed installs.

Other macOS-specific behaviour:

- **Terminal sessions** (`services/terminal/terminal.ts`) use Bun's native
  PTY on macOS. BSD `script` refuses to run with a piped stdin
  (`tcgetattr/ioctl: Operation not supported on socket`), which broke the
  interactive terminal and the CLI login flows built on it.
- **OpenCode discovery** never walks the home directory on macOS (it would
  hang on TCC prompts); it relies on `which` + known install paths.
- **Caddy settings / port lock** return a clear "Linux-only" error.

## Developing on a Mac

Use the repo's pinned pnpm (`packageManager: pnpm@8.15.4`), e.g.
`corepack enable` or `npx pnpm@8.15.4 install`. Newer pnpm majors skipped the
`@tailwindcss/oxide-darwin-arm64` optional native binary with this lockfile,
which breaks the console build with "Cannot find native binding".

To test the installer against a locally built bundle:

```bash
pnpm build:agent-bundle
POCKETDEV_BUNDLE_FILE=$PWD/apps/web/public/agent-bundle.tar.gz bash apps/web/install-macos.sh
```
