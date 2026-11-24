#!/bin/bash
# PocketDev agent installer for macOS (Apple Silicon or Intel).
#
#   curl -fsSL https://pocketdev.run/install.sh | bash          # install.sh hands off here on Darwin
#   curl -fsSL https://pocketdev.run/install-macos.sh | bash    # or run this directly
#
# Unlike the Linux installer this runs as YOUR user, not root:
#   - the agent is a per-user launchd LaunchAgent (~/Library/LaunchAgents),
#     so it can read your login Keychain (Claude Code stores its auth there)
#     and use your Homebrew, git config, SSH keys, etc.
#   - everything lives under ~/.pocketdev; nothing is written outside $HOME.
#   - no Caddy / iptables / swap. For remote access use Tailscale (see below).
#
# Flags:
#   --beta | --nightly    install the nightly-latest pre-release bundle
#   --admin-reset         clear the console admin account + passkeys
#   --tailscale-serve     serve the agent over HTTPS on your tailnet via
#                         `tailscale serve` and bind the agent to localhost only
#   --no-tailscale        don't offer to set up Tailscale (interactive runs
#                         offer it by default when Tailscale isn't connected)
#   --uninstall           remove the LaunchAgent and ~/.pocketdev
#
# Env overrides (mostly for development):
#   POCKETDEV_BUNDLE_FILE   install from a local agent-bundle.tar.gz instead of downloading
#   POCKETDEV_HOME          install root (default: ~/.pocketdev)
#   POCKETDEV_PORT          agent port (default: 4387)
#
# Compatible with the stock macOS /bin/bash (3.2) — no bash 4+ features.

set -e
set -o pipefail

POCKETDEV_VERSION="0.2.0"
POCKETDEV_HOME="${POCKETDEV_HOME:-$HOME/.pocketdev}"
INSTALL_DIR="$POCKETDEV_HOME/agent"
DATA_DIR="$POCKETDEV_HOME/data"
LOG_DIR="$HOME/Library/Logs/PocketDev"
BUNDLE_URL="https://pocketdev.run/agent/bundle"
LABEL="run.pocketdev.agent"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PORT="${POCKETDEV_PORT:-4387}"

# ─── Colors & helpers ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "  ${CYAN}→${NC} $1"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}!${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}$1${NC}"; }

# XML-escape a value for the plist.
xml_escape() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}

# Resolve the Tailscale CLI (Homebrew/standalone `tailscale`, or the CLI
# embedded in the Mac App Store / standalone Tailscale.app bundle).
# The GUI app binary picks GUI-vs-CLI mode from its environment; force CLI.
export TAILSCALE_BE_CLI=1
find_tailscale() {
  local c
  for c in /usr/local/bin/tailscale /opt/homebrew/bin/tailscale \
           /Applications/Tailscale.app/Contents/MacOS/Tailscale; do
    if [ -x "$c" ]; then echo "$c"; return 0; fi
  done
  if command -v tailscale >/dev/null 2>&1; then
    command -v tailscale
    return 0
  fi
  return 1
}

# Run a Tailscale CLI command that may block waiting for browser approval
# (`up` prints a login URL, `serve` prints an HTTPS-consent URL). Waits up to
# $1 seconds or until a login.tailscale.com URL appears. Sets TS_BG_OUTPUT,
# TS_BG_URL and TS_BG_PID (non-empty if still running). Returns 0 only if the
# command finished successfully.
run_ts_bg() {
  local wait_s="$1"; shift
  local out
  out="$(mktemp)"
  "$TS_BIN" "$@" >"$out" 2>&1 </dev/null &
  TS_BG_PID=$!
  TS_BG_URL=""
  for _ in $(seq 1 "$wait_s"); do
    if ! kill -0 "$TS_BG_PID" 2>/dev/null; then
      if wait "$TS_BG_PID"; then
        TS_BG_PID=""; TS_BG_OUTPUT="$(cat "$out")"; rm -f "$out"; return 0
      fi
      TS_BG_PID=""
      break
    fi
    TS_BG_URL="$(grep -oE 'https://login\.tailscale\.com/[^[:space:]]+' "$out" | head -1 || true)"
    [ -n "$TS_BG_URL" ] && break
    sleep 1
  done
  TS_BG_OUTPUT="$(cat "$out")"
  rm -f "$out"
  return 1
}

ts_bg_kill() {
  if [ -n "${TS_BG_PID:-}" ]; then
    kill "$TS_BG_PID" 2>/dev/null || true
    wait "$TS_BG_PID" 2>/dev/null || true   # reap quietly (no "Terminated" job notice)
    TS_BG_PID=""
  fi
}

# Re-read Tailscale state into TS_BIN / TS_IP / TS_DNS / TS_CERTS.
ts_refresh() {
  TS_BIN="$(find_tailscale || true)"
  TS_IP=""; TS_DNS=""; TS_CERTS=""
  [ -z "$TS_BIN" ] && return 0
  TS_IP="$("$TS_BIN" ip -4 2>/dev/null | head -1 || true)"
  local parsed
  parsed="$("$TS_BIN" status --json 2>/dev/null | bun -e "
let s = ''; process.stdin.on('data', d => s += d).on('end', () => {
  try {
    const j = JSON.parse(s)
    const dns = ((j.Self && j.Self.DNSName) || '').replace(/\.$/, '')
    const certs = Array.isArray(j.CertDomains) && j.CertDomains.length > 0 ? 'yes' : ''
    console.log(dns + ' ' + certs)
  } catch {}
})" 2>/dev/null || true)"
  TS_DNS="${parsed%% *}"
  case "$parsed" in *" yes") TS_CERTS=yes ;; esac
  return 0
}

# Can we ask the user questions? (curl | bash keeps /dev/tty; the agent's
# self-upgrade runs detached with no terminal.)
can_prompt() {
  [ "${POCKETDEV_NONINTERACTIVE:-}" = "1" ] && return 1
  ( : </dev/tty ) 2>/dev/null
}

ask_yes() {
  local reply
  printf '  %b ' "$1" >/dev/tty
  read -r reply </dev/tty || return 1
  case "$reply" in ""|y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

# Poll until a condition holds; press "s" to skip. $1 = installed|connected|certs.
wait_for_tailscale() {
  local what="$1" waited=0 key=""
  while [ "$waited" -lt 900 ]; do
    ts_refresh
    case "$what" in
      installed) [ -n "$TS_BIN" ] && return 0 ;;
      connected) [ -n "$TS_IP" ] && return 0 ;;
      certs) [ -n "$TS_CERTS" ] && return 0 ;;
    esac
    if read -r -s -n 1 -t 5 key </dev/tty 2>/dev/null; then
      case "$key" in s|S) return 1 ;; esac
    else
      waited=$((waited + 5))
    fi
  done
  return 1
}

launchd_stop() {
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null \
    || launchctl bootout "user/$(id -u)/${LABEL}" 2>/dev/null \
    || true
}

# ─── Parse flags ─────────────────────────────────────────────────
ADMIN_RESET=false
INSTALL_BETA=false
TAILSCALE_SERVE=false
NO_TAILSCALE=false
UNINSTALL=false
for arg in "$@"; do
  case "$arg" in
    --admin-reset) ADMIN_RESET=true ;;
    --beta|--nightly) INSTALL_BETA=true ;;
    --tailscale-serve) TAILSCALE_SERVE=true ;;
    --no-tailscale) NO_TAILSCALE=true ;;
    --uninstall) UNINSTALL=true ;;
  esac
done

# ─── Pre-flight checks ───────────────────────────────────────────
if [ "$(uname -s)" != "Darwin" ]; then
  fail "install-macos.sh is for macOS. On Linux use: curl -fsSL https://pocketdev.run/install.sh | sudo bash"
fi

if [ "$(id -u)" -eq 0 ]; then
  fail "Don't run the macOS installer as root/sudo — run it as the user who should own the agent:
      curl -fsSL https://pocketdev.run/install.sh | bash"
fi

if [ "$UNINSTALL" = true ]; then
  echo ""
  info "Stopping agent..."
  launchd_stop
  rm -f "$PLIST"
  if TS="$(find_tailscale)"; then
    # Only reset serve if it's pointing at us.
    if "$TS" serve status 2>/dev/null | grep -qE "(127\.0\.0\.1|localhost):${PORT}"; then
      "$TS" serve reset >/dev/null 2>&1 || true
      ok "Tailscale Serve config reset"
    fi
  fi
  rm -rf "$POCKETDEV_HOME"
  ok "PocketDev removed (LaunchAgent + $POCKETDEV_HOME). Logs kept in $LOG_DIR"
  exit 0
fi

if [ "$INSTALL_BETA" = true ]; then
  BUNDLE_URL="https://pocketdev.run/agent/bundle/nightly"
  INSTALLER_LABEL="v${POCKETDEV_VERSION} (beta track)"
else
  INSTALLER_LABEL="v${POCKETDEV_VERSION}"
fi

echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  PocketDev Installer ${INSTALLER_LABEL} — macOS${NC}"
echo -e "${BOLD}============================================${NC}"
if [ "$INSTALL_BETA" = true ]; then
  echo -e "  ${YELLOW}!${NC} Installing beta (nightly-latest). Not recommended for production."
fi

step "Step 0/5: Pre-flight checks"

ARCH="$(uname -m)"
if [ "$ARCH" != "arm64" ] && [ "$ARCH" != "x86_64" ]; then
  fail "Unsupported architecture: $ARCH (need arm64 or x86_64)"
fi
MACOS_VERSION="$(sw_vers -productVersion 2>/dev/null || echo unknown)"
ok "macOS $MACOS_VERSION ($ARCH)"

for bin in curl tar launchctl; do
  command -v "$bin" >/dev/null 2>&1 || fail "Required command not found: $bin"
done

# ─── Step 1: Homebrew (optional but recommended) ─────────────────
step "Step 1/5: Checking developer tooling"

BREW_BIN=""
for candidate in /opt/homebrew/bin/brew /usr/local/bin/brew; do
  if [ -x "$candidate" ]; then BREW_BIN="$candidate"; break; fi
done
if [ -n "$BREW_BIN" ]; then
  BREW_PREFIX="$("$BREW_BIN" --prefix)"
  ok "Homebrew found ($BREW_PREFIX)"
else
  BREW_PREFIX=""
  warn "Homebrew not found. The agent's tool installers (node, gh, tmux, go…) use brew on macOS."
  info "Install it with: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
fi

if xcode-select -p >/dev/null 2>&1; then
  ok "Xcode Command Line Tools installed (git, make, clang)"
else
  warn "Xcode Command Line Tools missing — run: xcode-select --install"
fi

# ─── Step 2: Bun runtime ─────────────────────────────────────────
step "Step 2/5: Setting up Bun runtime"

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  info "Installing Bun..."
  BUN_INSTALLER="$(mktemp)"
  curl -fsSL https://bun.sh/install -o "$BUN_INSTALLER"
  bash "$BUN_INSTALLER" </dev/null >/dev/null
  rm -f "$BUN_INSTALLER"
  command -v bun >/dev/null 2>&1 || fail "Bun installation failed. Install manually: https://bun.sh"
  ok "Bun installed ($(bun --version))"
else
  ok "Bun already installed ($(bun --version))"
fi
BUN_PATH="$(command -v bun)"

# ─── Step 3: Download and install agent ──────────────────────────
step "Step 3/5: Installing PocketDev agent"

if [ -f "$PLIST" ]; then
  info "Stopping existing agent..."
  launchd_stop
fi

mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$LOG_DIR" "$HOME/Library/LaunchAgents"

BUNDLE_TMP="$(mktemp)"
if [ -n "${POCKETDEV_BUNDLE_FILE:-}" ]; then
  info "Using local bundle: $POCKETDEV_BUNDLE_FILE"
  cp "$POCKETDEV_BUNDLE_FILE" "$BUNDLE_TMP" || fail "Could not read $POCKETDEV_BUNDLE_FILE"
else
  info "Downloading agent bundle..."
  if ! curl -fSL --progress-bar -o "$BUNDLE_TMP" "$BUNDLE_URL"; then
    rm -f "$BUNDLE_TMP"
    fail "Failed to download agent bundle from $BUNDLE_URL"
  fi
fi
if ! tar -tzf "$BUNDLE_TMP" >/dev/null 2>&1; then
  rm -f "$BUNDLE_TMP"
  fail "Agent bundle is not a valid tarball"
fi
tar -xzf "$BUNDLE_TMP" -C "$INSTALL_DIR" --strip-components=1
rm -f "$BUNDLE_TMP"
ok "Agent installed to $INSTALL_DIR"

DB_FILE="${DATA_DIR}/pocketdev.db"
if [ -f "$DB_FILE" ] && [ "$ADMIN_RESET" = true ]; then
  info "Resetting admin account..."
  DB_FILE="$DB_FILE" bun -e "const { Database } = require('bun:sqlite'); const db = new Database(process.env.DB_FILE); db.run('DELETE FROM admin_accounts'); try { db.run('DELETE FROM passkey_credentials') } catch {} db.close();" 2>/dev/null || warn "Admin reset failed"
  ok "Admin account reset — you can create a new one after setup"
fi

# The PATH the agent (and every task/terminal it spawns) will see. launchd
# starts jobs with a bare /usr/bin:/bin:/usr/sbin:/sbin, so Homebrew, Bun and
# ~/.local/bin (Claude Code's native installer) must be added explicitly.
AGENT_PATH="${BUN_PATH%/*}:$HOME/.local/bin"
if [ -n "$BREW_PREFIX" ]; then
  AGENT_PATH="$AGENT_PATH:$BREW_PREFIX/bin:$BREW_PREFIX/sbin"
fi
AGENT_PATH="$AGENT_PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Refresh tool paths in an existing DB (same as the Linux installer), using
# the agent's PATH so detection matches what the agent will see.
if [ -f "$DB_FILE" ]; then
  info "Refreshing tool paths in database..."
  TOOL_UPSERTS=""
  TOOL_DELETES=""
  _check_tool() {
    local tool_id="$1"; shift
    local found=""
    for candidate in "$@"; do
      found="$(PATH="$AGENT_PATH" command -v "$candidate" 2>/dev/null || true)"
      [ -n "$found" ] && break
      found=""
    done
    if [ -n "$found" ]; then
      local ver
      ver="$("$found" --version 2>/dev/null | head -1 | tr -d '\n' || echo '')"
      TOOL_UPSERTS="${TOOL_UPSERTS}${tool_id}|${found}|${ver}"$'\n'
    else
      TOOL_DELETES="${TOOL_DELETES}${tool_id}"$'\n'
    fi
  }
  _check_tool "git"          "git"
  _check_tool "github_cli"   "gh"
  _check_tool "node"         "node"
  _check_tool "npm"          "npm"
  _check_tool "pnpm"         "pnpm"
  _check_tool "claude_cli"   "claude"
  _check_tool "codex_cli"    "codex"
  _check_tool "opencode_cli" "opencode"
  _check_tool "docker"       "docker"
  _check_tool "python"       "python3" "python"
  _check_tool "rust"         "rustc"
  _check_tool "go"           "go"
  _check_tool "typescript"   "tsc"
  _check_tool "tmux"         "tmux"

  DB_FILE="$DB_FILE" TOOL_UPSERTS="$TOOL_UPSERTS" TOOL_DELETES="$TOOL_DELETES" bun -e "
const { Database } = require('bun:sqlite');
const db = new Database(process.env.DB_FILE);
const upsert = db.prepare(\"INSERT INTO tool_paths(tool_id,path,version,detected_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(tool_id) DO UPDATE SET path=excluded.path,version=excluded.version,detected_at=excluded.detected_at\");
const del = db.prepare('DELETE FROM tool_paths WHERE tool_id=?');
for (const row of (process.env.TOOL_UPSERTS||'').split('\n').filter(Boolean)) {
  const [id, path, version] = row.split('|');
  upsert.run(id, path, version || null);
}
for (const id of (process.env.TOOL_DELETES||'').split('\n').filter(Boolean)) del.run(id);
db.close();
" 2>/dev/null || true
  ok "Tool paths refreshed"
fi

# ─── Step 4: Network access (Tailscale) ──────────────────────────
step "Step 4/5: Network access"

AGENT_HOST="0.0.0.0"
SERVE_OK=false
TS_BIN=""; TS_IP=""; TS_DNS=""; TS_CERTS=""
ts_refresh

if [ -n "$TS_IP" ]; then
  ok "Tailscale connected (${TS_DNS:-no MagicDNS name} / $TS_IP)"
elif [ -n "$TS_BIN" ]; then
  warn "Tailscale is installed but not connected."
else
  info "Tailscale not found."
fi

# Offer guided setup on interactive runs when Tailscale isn't connected yet.
if [ -z "$TS_IP" ] && [ "$NO_TAILSCALE" != true ] && can_prompt; then
  echo ""
  info "This Mac is on a home network, so your phone can only reach it on the same Wi-Fi."
  info "Tailscale (free, private, no port forwarding) lets the PocketDev app reach it from anywhere."
  if ask_yes "Set up Tailscale now? [Y/n]"; then
    TAILSCALE_SERVE=true
  else
    info "Skipped — you can do it later from the console (Security → Remote Access)."
  fi
fi

if [ "$TAILSCALE_SERVE" = true ] && [ -z "$TS_BIN" ]; then
  if can_prompt; then
    info "Opening the Tailscale download. Install it, open Tailscale, and allow the system extension."
    info "Then in Tailscale → Settings, choose CLI integration → Install."
    open "https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg" 2>/dev/null || true
    info "Waiting for Tailscale to be installed… (press s to skip)"
    wait_for_tailscale installed || true
  fi
  [ -n "$TS_BIN" ] && ok "Tailscale installed" || warn "Tailscale still not installed — skipping remote access."
fi

if [ "$TAILSCALE_SERVE" = true ] && [ -n "$TS_BIN" ] && [ -z "$TS_IP" ]; then
  open -a Tailscale 2>/dev/null || true
  info "Logging this Mac into Tailscale (use the same account as on your phone)…"
  if run_ts_bg 15 up; then
    ts_refresh
  elif [ -n "$TS_BG_URL" ]; then
    info "Log in here: $TS_BG_URL"
    open "$TS_BG_URL" 2>/dev/null || true
  fi
  if [ -z "$TS_IP" ] && can_prompt; then
    info "Waiting for Tailscale to connect… (press s to skip)"
    wait_for_tailscale connected || true
  fi
  ts_bg_kill
  if [ -n "$TS_IP" ]; then
    ok "Tailscale connected (${TS_DNS:-no MagicDNS name} / $TS_IP)"
  else
    warn "Tailscale isn't connected — skipping remote access. Finish later in the console."
  fi
fi

# tailscale serve terminates HTTPS on https://<machine>.<tailnet>.ts.net and
# proxies to the agent on localhost. Done before the agent starts so we only
# bind to localhost when serve actually works.
if [ "$TAILSCALE_SERVE" = true ] && [ -n "$TS_IP" ]; then
  info "Enabling HTTPS via Tailscale Serve…"
  if ! run_ts_bg 20 serve --bg "http://127.0.0.1:${PORT}" && [ -n "$TS_BG_URL" ]; then
    ts_bg_kill
    warn "HTTPS certificates need to be enabled for your tailnet: $TS_BG_URL"
    if can_prompt; then
      open "$TS_BG_URL" 2>/dev/null || true
      info "Approve it in the browser… (press s to skip)"
      if wait_for_tailscale certs; then
        run_ts_bg 20 serve --bg "http://127.0.0.1:${PORT}" || true
      fi
    fi
  fi
  ts_bg_kill
  if "$TS_BIN" serve status --json 2>/dev/null | grep -qE "(127\.0\.0\.1|localhost):${PORT}"; then
    SERVE_OK=true
    AGENT_HOST="127.0.0.1"
    ok "Tailscale Serve: https://${TS_DNS} → 127.0.0.1:${PORT}"
  else
    warn "Tailscale Serve isn't set up yet (needs MagicDNS + HTTPS Certificates: https://login.tailscale.com/admin/dns)."
    warn "The agent will listen on your network for now; finish in the console → Security → Remote Access."
    if [ -n "$TS_BG_OUTPUT" ] && [ -z "$TS_BG_URL" ]; then
      printf '%s\n' "$TS_BG_OUTPUT" | tail -3 | sed 's/^/      /'
    fi
  fi
elif [ -z "$TS_BIN" ]; then
  info "Remote access: https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg (then Settings → CLI integration)"
fi

# ─── Step 5: LaunchAgent ─────────────────────────────────────────
step "Step 5/5: Starting PocketDev agent (launchd)"

# Prefer the GUI (Aqua) session domain: only jobs there can unlock/read the
# login Keychain. Over SSH with nobody logged in at the console, fall back to
# the background user domain.
UID_NUM="$(id -u)"
if launchctl print "gui/${UID_NUM}" >/dev/null 2>&1; then
  LAUNCHD_DOMAIN="gui/${UID_NUM}"
else
  LAUNCHD_DOMAIN="user/${UID_NUM}"
  warn "No GUI login session found — installing into ${LAUNCHD_DOMAIN}."
  warn "Keychain-backed CLI logins (e.g. Claude Code) may not work until you log in at the Mac."
fi

USER_SHELL="${SHELL:-/bin/zsh}"

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$BUN_PATH")</string>
    <string>run</string>
    <string>$(xml_escape "$INSTALL_DIR/index.js")</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$(xml_escape "$INSTALL_DIR")</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>POCKETDEV_DATA_DIR</key><string>$(xml_escape "$DATA_DIR")</string>
    <key>POCKETDEV_HOME</key><string>$(xml_escape "$POCKETDEV_HOME")</string>
    <key>POCKETDEV_PORT</key><string>${PORT}</string>
    <key>POCKETDEV_HOST</key><string>${AGENT_HOST}</string>
    <key>POCKETDEV_PROJECT_DIR</key><string>$(xml_escape "$HOME")</string>
    <key>POCKETDEV_WAKE_PORT</key><string>4388</string>
    <key>POCKETDEV_FIREWALL_LOCK_ENABLED</key><string>false</string>
    <key>POCKETDEV_SERVICE_MANAGER</key><string>launchd</string>
    <key>POCKETDEV_LAUNCHD_DOMAIN</key><string>${LAUNCHD_DOMAIN}</string>
    <key>PATH</key><string>$(xml_escape "$AGENT_PATH")</string>
    <key>SHELL</key><string>$(xml_escape "$USER_SHELL")</string>
    <key>LANG</key><string>en_US.UTF-8</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <!-- Upgrade/uninstall helpers are spawned by the agent and must outlive it. -->
  <key>AbandonProcessGroup</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>StandardOutPath</key>
  <string>$(xml_escape "$LOG_DIR/agent.log")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "$LOG_DIR/agent.log")</string>
</dict>
</plist>
PLISTEOF
plutil -lint "$PLIST" >/dev/null || fail "Generated plist is invalid: $PLIST"
ok "LaunchAgent written ($PLIST)"

launchctl bootstrap "$LAUNCHD_DOMAIN" "$PLIST" 2>/dev/null || {
  # Already loaded (e.g. bootout raced) — just restart it.
  launchctl kickstart -k "${LAUNCHD_DOMAIN}/${LABEL}" >/dev/null 2>&1 || fail "launchctl could not start ${LABEL}. See: launchctl print ${LAUNCHD_DOMAIN}/${LABEL}"
}
launchctl enable "${LAUNCHD_DOMAIN}/${LABEL}" 2>/dev/null || true

HEALTH=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  HEALTH="$(curl -fs --max-time 2 "http://127.0.0.1:${PORT}/PocketDev/health" 2>/dev/null || true)"
  [ -n "$HEALTH" ] && break
done
if [ -z "$HEALTH" ]; then
  warn "Agent did not answer health checks. Recent log:"
  tail -n 20 "$LOG_DIR/agent.log" 2>/dev/null || true
  fail "Check logs: tail -f \"$LOG_DIR/agent.log\""
fi
ok "Agent is running on port $PORT"

# ─── Always-on checks (Mac mini as a server) ─────────────────────
ADVICE=""
SLEEP_MIN="$(pmset -g 2>/dev/null | awk '$1 == "sleep" {print $2}')"
if [ -n "$SLEEP_MIN" ] && [ "$SLEEP_MIN" != "0" ]; then
  ADVICE="${ADVICE}    • System sleep is ${SLEEP_MIN} min — the agent is unreachable while asleep:\n        sudo pmset -a sleep 0 disksleep 0 autorestart 1\n"
fi
if fdesetup status 2>/dev/null | grep -q "FileVault is On"; then
  ADVICE="${ADVICE}    • FileVault is on: after a reboot/power cut the Mac waits at the unlock screen and the\n      agent won't start until someone logs in (no auto-login with FileVault).\n"
elif ! defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser >/dev/null 2>&1; then
  ADVICE="${ADVICE}    • Auto-login is off: after a reboot the agent starts only once you log in.\n      System Settings → Users & Groups → Automatically log in as…\n"
fi

# ─── Done ────────────────────────────────────────────────────────
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '')"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PocketDev installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Open one of these in a browser to complete setup:"
echo ""
echo -e "    ${CYAN}http://localhost:${PORT}/PocketDev/setup${NC}      (on this Mac)"
if [ "$SERVE_OK" = true ] && [ -n "$TS_DNS" ]; then
  echo -e "    ${CYAN}https://${TS_DNS}/PocketDev/setup${NC}   (any device on your tailnet)"
else
  if [ -n "$TS_IP" ]; then
    echo -e "    ${CYAN}http://${TS_IP}:${PORT}/PocketDev/setup${NC}   (any device on your tailnet)"
  fi
  if [ -n "$LAN_IP" ]; then
    echo -e "    ${CYAN}http://${LAN_IP}:${PORT}/PocketDev/setup${NC}   (same Wi-Fi/LAN only)"
  fi
fi
echo ""
echo "  Create your admin account, then pair your mobile device."
if [ -z "$TS_IP" ]; then
  echo ""
  echo -e "  ${BOLD}Remote access:${NC} to use the app away from home, set up Tailscale from the console"
  echo -e "  (Security → Remote Access) or re-run with ${CYAN}--tailscale-serve${NC}. Don't port-forward ${PORT}."
elif [ "$SERVE_OK" != true ]; then
  echo ""
  echo -e "  ${BOLD}HTTPS:${NC} enable Tailscale Serve (console → Security → Remote Access, or re-run with"
  echo -e "  ${CYAN}--tailscale-serve${NC}) to get https://${TS_DNS:-<machine>.<tailnet>.ts.net} — needed for passkeys."
fi
if [ -n "$TS_IP" ]; then
  echo ""
  echo -e "  ${BOLD}On your phone:${NC} install Tailscale, log in with the same account, keep it connected."
fi
if [ -n "$TS_IP" ]; then
  ADVICE="${ADVICE}    • Tailscale admin console → Machines → this Mac → Disable key expiry, so it doesn't\n      drop off your tailnet every 180 days.\n"
fi
if [ -n "$ADVICE" ]; then
  echo ""
  echo -e "  ${BOLD}Mac mini always-on tips:${NC}"
  echo -e "$ADVICE"
fi
echo ""
echo "  Useful commands:"
echo "    tail -f \"$LOG_DIR/agent.log\"                         # Stream agent logs"
echo "    launchctl kickstart -k ${LAUNCHD_DOMAIN}/${LABEL}   # Restart agent"
echo "    curl http://localhost:$PORT/PocketDev/health              # Health check"
echo "    curl -fsSL https://pocketdev.run/install-macos.sh | bash -s -- --uninstall"
echo ""
