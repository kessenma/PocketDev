#!/bin/bash
set -e
set -o pipefail

POCKETDEV_VERSION="0.2.0"
INSTALL_DIR="/opt/pocketdev"
DATA_DIR="/opt/pocketdev/data"
BUNDLE_URL="https://pocketdev.run/agent/bundle"
SERVICE_NAME="pocketdev-agent"
PORT=4387
CADDY_FILE="/etc/caddy/Caddyfile"

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

echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  PocketDev Installer v${POCKETDEV_VERSION}${NC}"
echo -e "${BOLD}============================================${NC}"

# ─── Pre-flight checks ───────────────────────────────────────────
step "Step 0/5: Pre-flight checks"

if [ "$(uname -s)" != "Linux" ]; then
  fail "PocketDev agent requires Linux. Detected: $(uname -s)"
fi

if [ "$(id -u)" -ne 0 ]; then
  fail "Please run as root: curl -fsSL https://pocketdev.run/install.sh | sudo bash"
fi

ARCH="$(uname -m)"
if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ]; then
  fail "Unsupported architecture: $ARCH (need x86_64 or aarch64)"
fi

# Detect OS for package installation
if [ -f /etc/os-release ]; then
  OS_TYPE=$(grep -w "ID" /etc/os-release | cut -d "=" -f 2 | tr -d '"')
else
  OS_TYPE="unknown"
fi

ok "Linux $ARCH ($OS_TYPE)"

# ─── Step 1: Install required packages ───────────────────────────
step "Step 1/5: Installing required packages"

APT_UPDATED=false

install_pkg() {
  case "$OS_TYPE" in
    ubuntu|debian|pop|linuxmint|zorin)
      if [ "$APT_UPDATED" = false ]; then
        info "Updating package lists (this may take a moment)..."
        apt-get update -qq 2>&1 | tail -1 || true
        APT_UPDATED=true
      fi
      apt-get install -y -qq "$@" 2>&1 | tail -2 || { fail "apt-get install $* failed"; }
      ;;
    centos|fedora|rhel|rocky|almalinux|amzn)
      dnf install -y "$@" 2>&1 | tail -2 || yum install -y "$@" 2>&1 | tail -2 || { fail "dnf/yum install $* failed"; }
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm --needed "$@" 2>&1 | tail -2 || { fail "pacman install $* failed"; }
      ;;
    alpine)
      apk add "$@" 2>&1 | tail -2 || { fail "apk add $* failed"; }
      ;;
    *)
      warn "Unknown OS '$OS_TYPE' — trying apt-get"
      apt-get update -qq 2>&1 | tail -1 || true
      apt-get install -y -qq "$@" 2>&1 | tail -2 || { fail "apt-get install $* failed"; }
      ;;
  esac
}

for pkg in curl unzip; do
  if ! command -v "$pkg" >/dev/null 2>&1; then
    info "Installing $pkg..."
    install_pkg "$pkg"
    if command -v "$pkg" >/dev/null 2>&1; then
      ok "$pkg installed"
    else
      fail "Failed to install $pkg"
    fi
  else
    ok "$pkg already installed"
  fi
done

ok "Required packages ready"

# ─── Step 2: Install Bun runtime ─────────────────────────────────
step "Step 2/5: Setting up Bun runtime"

if ! command -v bun >/dev/null 2>&1; then
  info "Installing Bun..."
  # Download installer to a temp file first, then run it.
  # Piping curl|bash inside a curl|bash script causes stdin conflicts.
  BUN_INSTALLER="$(mktemp)"
  curl -fsSL https://bun.sh/install -o "$BUN_INSTALLER"
  bash "$BUN_INSTALLER" </dev/null
  rm -f "$BUN_INSTALLER"
  # Source bun into current shell
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  if ! command -v bun >/dev/null 2>&1; then
    fail "Bun installation failed. Install manually: https://bun.sh"
  fi
  ok "Bun installed ($(bun --version))"
else
  ok "Bun already installed ($(bun --version))"
fi

# ─── Step 3: Download and install agent ──────────────────────────
step "Step 3/5: Installing PocketDev agent"

# Stop existing service if running
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  info "Stopping existing agent..."
  systemctl stop "$SERVICE_NAME"
fi

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

info "Downloading agent bundle..."
BUNDLE_TMP="$(mktemp)"
# -w writes http_code to stdout; -o writes body to file; -f makes curl fail on HTTP errors
if ! curl -fSL --progress-bar -o "$BUNDLE_TMP" "$BUNDLE_URL"; then
  rm -f "$BUNDLE_TMP"
  fail "Failed to download agent bundle from $BUNDLE_URL"
fi
# Verify we got a real tarball (not an HTML error page)
if ! tar -tzf "$BUNDLE_TMP" >/dev/null 2>&1; then
  rm -f "$BUNDLE_TMP"
  fail "Downloaded file is not a valid tarball. Check $BUNDLE_URL"
fi
ok "Bundle downloaded"

info "Extracting..."
tar -xzf "$BUNDLE_TMP" -C "$INSTALL_DIR" --strip-components=1
rm -f "$BUNDLE_TMP"
ok "Agent installed to $INSTALL_DIR"

# Resolve bun path for systemd (must be absolute)
BUN_PATH="$(which bun)"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=PocketDev Agent
After=network.target

[Service]
Type=simple
ExecStart=${BUN_PATH} run ${INSTALL_DIR}/index.js
WorkingDirectory=${INSTALL_DIR}
Environment=POCKETDEV_DATA_DIR=${DATA_DIR}
Environment=POCKETDEV_PORT=${PORT}
Environment=POCKETDEV_HOST=127.0.0.1
Environment=POCKETDEV_PROJECT_DIR=${HOME}
Environment=PATH=${BUN_PATH%/*}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1
ok "Systemd service created"

# ─── Step 4: Install Caddy for HTTPS ─────────────────────────────
step "Step 4/5: Preparing HTTPS (Caddy)"

CADDY_ACTIVE=false
PORT_443_BUSY=false

# Check if port 443 is already in use
if ss -tlnp 2>/dev/null | grep -q ':443 ' || netstat -tlnp 2>/dev/null | grep -q ':443 '; then
  PORT_443_BUSY=true
fi

# Install Caddy binary if not already present
if ! command -v caddy >/dev/null 2>&1; then
  info "Installing Caddy (this may take a minute)..."
  case "$OS_TYPE" in
    ubuntu|debian|pop|linuxmint|zorin)
      info "  Installing prerequisites (keyring, apt-transport-https)..."
      apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https 2>&1 | tail -1 || true
      info "  Adding Caddy GPG key..."
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
      info "  Adding Caddy APT repository..."
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
      info "  Updating package lists..."
      apt-get update -qq 2>&1 | tail -1 || true
      info "  Installing caddy package..."
      apt-get install -y -qq caddy 2>&1 | tail -2 || { fail "Failed to install Caddy"; }
      ;;
    centos|fedora|rhel|rocky|almalinux|amzn)
      info "  Enabling Caddy COPR repository..."
      dnf install -y 'dnf-command(copr)' 2>&1 | tail -1 || true
      dnf copr enable -y @caddy/caddy 2>&1 | tail -1 || true
      info "  Installing caddy package..."
      dnf install -y caddy 2>&1 | tail -2 || { fail "Failed to install Caddy"; }
      ;;
    arch|manjaro)
      info "  Installing caddy package..."
      pacman -Sy --noconfirm caddy 2>&1 | tail -2 || { fail "Failed to install Caddy"; }
      ;;
    alpine)
      info "  Installing caddy package..."
      apk add caddy 2>&1 | tail -2 || { fail "Failed to install Caddy"; }
      ;;
    *)
      warn "Unknown OS '$OS_TYPE' — trying apt-get for Caddy"
      info "  Installing prerequisites (keyring, apt-transport-https)..."
      apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https 2>&1 | tail -1 || true
      info "  Adding Caddy GPG key..."
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
      info "  Adding Caddy APT repository..."
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
      info "  Updating package lists..."
      apt-get update -qq 2>&1 | tail -1 || true
      info "  Installing caddy package..."
      apt-get install -y -qq caddy 2>&1 | tail -2 || { fail "Failed to install Caddy"; }
      ;;
  esac
  if command -v caddy >/dev/null 2>&1; then
    ok "Caddy installed ($(caddy version 2>/dev/null | head -1))"
  else
    fail "Caddy installation failed"
  fi
else
  ok "Caddy already installed ($(caddy version 2>/dev/null | head -1))"
fi

# Allow agent to manage Caddy config from the console UI
cat > "/etc/sudoers.d/pocketdev-caddy" <<SUDOEOF
# Allow PocketDev agent to update Caddy HTTPS config
root ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy
root ALL=(ALL) NOPASSWD: /usr/bin/systemctl start caddy
root ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop caddy
root ALL=(ALL) NOPASSWD: /usr/bin/tee ${CADDY_FILE}
SUDOEOF
chmod 440 /etc/sudoers.d/pocketdev-caddy

# Write default Caddyfile (self-signed on IP) but only start if port 443 is free
mkdir -p "$(dirname "$CADDY_FILE")"
echo "" > "${DATA_DIR}/domain.txt"

if [ "$PORT_443_BUSY" = true ]; then
  warn "Port 443 is already in use (Coolify, Traefik, etc.)"
  info "Caddy installed but not started — configure HTTPS from the console UI."
  # Don't overwrite an existing Caddyfile that may belong to the running service
  # Disable the caddy systemd service so it doesn't fight on reboot
  systemctl disable caddy 2>/dev/null || true
  systemctl stop caddy 2>/dev/null || true
else
  # Port 443 is free — write config and start Caddy with self-signed cert
  cat > "$CADDY_FILE" <<CADDYEOF
:443 {
  tls internal
  reverse_proxy localhost:${PORT}
}
CADDYEOF

  systemctl stop caddy 2>/dev/null || true
  info "Starting Caddy with self-signed certificate..."
  systemctl enable caddy >/dev/null 2>&1
  systemctl start caddy 2>/dev/null || true
  sleep 2
  if systemctl is-active --quiet caddy; then
    ok "Caddy is running (HTTPS on port 443)"
    CADDY_ACTIVE=true
  else
    warn "Caddy failed to start — configure HTTPS from the console UI later."
    journalctl -u caddy --no-pager -n 5 2>/dev/null || true
  fi
fi

# If Caddy is not proxying, agent must be externally accessible on port 4387
if [ "$CADDY_ACTIVE" = false ]; then
  sed -i "s/POCKETDEV_HOST=127.0.0.1/POCKETDEV_HOST=0.0.0.0/" "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
fi

# ─── Step 5: Start and verify ─────────────────────────────────────
step "Step 5/5: Starting PocketDev agent"

systemctl start "$SERVICE_NAME"
sleep 2

if ! systemctl is-active --quiet "$SERVICE_NAME"; then
  echo ""
  warn "Agent failed to start. Showing recent logs:"
  journalctl -u "$SERVICE_NAME" --no-pager -n 20 2>/dev/null || true
  fail "Check logs: journalctl -u $SERVICE_NAME -n 50"
fi

ok "Agent is running on port $PORT"

# ─── Fetch public IP ─────────────────────────────────────────────
PUBLIC_IP="$(curl -4s --max-time 5 https://ifconfig.me 2>/dev/null || curl -4s --max-time 5 https://icanhazip.com 2>/dev/null || echo '<your-server-ip>')"
PUBLIC_IP="$(echo "$PUBLIC_IP" | tr -d '\n')"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PocketDev installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Open this URL in your browser to complete setup:"
echo ""
echo -e "    ${CYAN}http://${PUBLIC_IP}:${PORT}/PocketDev/setup${NC}"
echo ""
echo "  Create your admin account, then pair your mobile device."
if [ "$CADDY_ACTIVE" = true ]; then
  echo ""
  echo -e "  ${BOLD}HTTPS:${NC} Caddy is running with a self-signed certificate."
  echo -e "  Add a custom domain from the console for a trusted Let's Encrypt cert."
fi
echo ""
echo -e "  ${BOLD}Health:${NC}  http://${PUBLIC_IP}:${PORT}/PocketDev/health"
echo ""
echo "  Useful commands:"
echo "    journalctl -u $SERVICE_NAME -f        # Stream agent logs"
echo "    systemctl restart $SERVICE_NAME        # Restart agent"
echo "    curl http://localhost:$PORT/PocketDev/health  # Health check (internal)"
echo ""
