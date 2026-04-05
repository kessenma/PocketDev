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

# ─── Step 4: Install and configure Caddy for HTTPS ───────────────
step "Step 4/5: Setting up HTTPS (Caddy)"

CADDY_FAILED=false
CADDY_SKIPPED=false
EXISTING_CADDY=false

# Check if Caddy (or another reverse proxy) is already running on port 443
if systemctl is-active --quiet caddy 2>/dev/null; then
  EXISTING_CADDY=true
  info "Detected an existing Caddy service already running on this server."
  # Check if it looks like Coolify/Traefik manages it
  EXISTING_CADDY_UNIT="$(systemctl show caddy --property=FragmentPath 2>/dev/null | cut -d= -f2)"
  if [ -n "$EXISTING_CADDY_UNIT" ] && grep -qi "coolify\|docker" "$EXISTING_CADDY_UNIT" 2>/dev/null; then
    info "  Appears to be managed by Coolify or Docker."
  fi
elif ss -tlnp 2>/dev/null | grep -q ':443 ' || netstat -tlnp 2>/dev/null | grep -q ':443 '; then
  EXISTING_CADDY=true
  info "Detected another service already listening on port 443."
fi

if [ "$EXISTING_CADDY" = true ]; then
  echo ""
  echo -e "  ${YELLOW}Another service is already using port 443 (HTTPS).${NC}"
  echo -e "  This is common with Coolify, Traefik, or other reverse proxies."
  echo ""
  echo -e "  You have two options:"
  echo -e "    ${BOLD}1)${NC} Skip — configure your existing reverse proxy to forward to localhost:${PORT}"
  echo -e "    ${BOLD}2)${NC} Replace — let PocketDev manage Caddy (will overwrite existing config)"
  echo ""
  printf "  Choice [1/2] (default: 1 = skip): "
  read -r CADDY_CHOICE </dev/tty || CADDY_CHOICE=""
  CADDY_CHOICE="$(echo "$CADDY_CHOICE" | tr -d '[:space:]')"

  if [ "$CADDY_CHOICE" = "2" ]; then
    info "Will replace existing Caddy config with PocketDev's."
    EXISTING_CADDY=false
  else
    CADDY_SKIPPED=true
    ok "Skipping Caddy setup — using existing reverse proxy"
    echo ""
    echo -e "  ${CYAN}To complete HTTPS setup, add a reverse proxy rule in your${NC}"
    echo -e "  ${CYAN}existing tool (Coolify, Traefik, nginx, etc.) that forwards to:${NC}"
    echo ""
    echo -e "    ${BOLD}http://localhost:${PORT}${NC}"
    echo ""
    echo -e "  ${CYAN}The agent path prefix is /PocketDev/ — your proxy should forward${NC}"
    echo -e "  ${CYAN}all paths including WebSocket upgrades.${NC}"
    echo ""
    # Agent needs to be externally accessible since we're not managing the proxy
    sed -i "s/POCKETDEV_HOST=127.0.0.1/POCKETDEV_HOST=0.0.0.0/" "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload
    echo "" > "${DATA_DIR}/domain.txt"
  fi
fi

if [ "$CADDY_SKIPPED" = false ]; then
  # Ask for optional domain
  echo ""
  echo -e "  ${CYAN}Do you have a domain pointing to this server?${NC}"
  echo -e "  Enter it now for a trusted HTTPS certificate (Let's Encrypt),"
  echo -e "  or leave blank for a self-signed certificate on the IP address."
  echo ""
  printf "  Domain (leave blank for IP-only): "
  read -r USER_DOMAIN </dev/tty || USER_DOMAIN=""
  USER_DOMAIN="$(echo "$USER_DOMAIN" | tr -d '[:space:]')"

  # Install Caddy if not already present
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

  # Write Caddyfile
  info "Writing HTTPS config..."
  mkdir -p "$(dirname "$CADDY_FILE")"

  if [ -n "$USER_DOMAIN" ]; then
    cat > "$CADDY_FILE" <<CADDYEOF
${USER_DOMAIN} {
  reverse_proxy localhost:${PORT}
}
CADDYEOF
    echo "$USER_DOMAIN" > "${DATA_DIR}/domain.txt"
    ok "Configured HTTPS for domain: $USER_DOMAIN (Let's Encrypt)"
  else
    cat > "$CADDY_FILE" <<CADDYEOF
:443 {
  tls internal
  reverse_proxy localhost:${PORT}
}
CADDYEOF
    echo "" > "${DATA_DIR}/domain.txt"
    ok "Configured HTTPS with self-signed certificate (IP-only)"
  fi

  # Allow agent to update Caddy config later (from console UI)
  cat > "/etc/sudoers.d/pocketdev-caddy" <<SUDOEOF
# Allow PocketDev agent to update Caddy HTTPS config
root ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy
root ALL=(ALL) NOPASSWD: /usr/bin/tee ${CADDY_FILE}
SUDOEOF
  chmod 440 /etc/sudoers.d/pocketdev-caddy

  # Stop Caddy before restarting with new config
  systemctl stop caddy 2>/dev/null || true

  # Validate the Caddyfile before starting
  info "Validating Caddy config..."
  if caddy validate --config "$CADDY_FILE" 2>&1; then
    ok "Caddyfile is valid"
  else
    warn "Caddyfile validation failed — check $CADDY_FILE"
    CADDY_FAILED=true
  fi

  # Start Caddy (use || true so set -e doesn't kill the install)
  if [ "$CADDY_FAILED" = false ]; then
    info "Starting Caddy..."
    systemctl enable caddy >/dev/null 2>&1
    systemctl start caddy 2>/dev/null || true
    sleep 2
    if systemctl is-active --quiet caddy; then
      ok "Caddy is running (HTTPS on port 443)"
    else
      warn "Caddy failed to start. Showing recent logs:"
      journalctl -u caddy --no-pager -n 15 2>/dev/null || true
      echo ""
      warn "You can debug with: journalctl -u caddy -f"
      CADDY_FAILED=true
    fi
  fi

  # If Caddy failed, bind agent externally so it's still accessible
  if [ "$CADDY_FAILED" = true ]; then
    warn "HTTPS not available. Agent will listen on http://0.0.0.0:${PORT} directly."
    sed -i "s/POCKETDEV_HOST=127.0.0.1/POCKETDEV_HOST=0.0.0.0/" "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload
  fi
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

# Build the display URL
if [ -n "$USER_DOMAIN" ]; then
  DISPLAY_HOST="$USER_DOMAIN"
else
  DISPLAY_HOST="$PUBLIC_IP"
fi

# Determine if PocketDev-managed Caddy is active
POCKETDEV_HTTPS=false
if [ "$CADDY_SKIPPED" = false ] && [ "$CADDY_FAILED" = false ]; then
  POCKETDEV_HTTPS=true
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PocketDev installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Open this URL in your browser to complete setup:"
echo ""
if [ "$POCKETDEV_HTTPS" = true ]; then
  echo -e "    ${CYAN}https://${DISPLAY_HOST}/PocketDev/setup${NC}"
  if [ -z "$USER_DOMAIN" ]; then
    echo ""
    echo -e "  ${YELLOW}Note:${NC} Using a self-signed certificate. Your browser will show"
    echo "  a security warning — click 'Advanced' → 'Proceed' to continue."
  fi
elif [ "$CADDY_SKIPPED" = true ]; then
  echo -e "    ${CYAN}http://${DISPLAY_HOST}:${PORT}/PocketDev/setup${NC}"
  echo ""
  echo -e "  ${YELLOW}Note:${NC} Configure your existing reverse proxy to forward to"
  echo -e "  localhost:${PORT} for HTTPS access."
else
  echo -e "    ${CYAN}http://${DISPLAY_HOST}:${PORT}/PocketDev/setup${NC}"
fi
echo ""
echo "  Create your admin account, then pair your mobile device."
echo "  You can add a custom domain later from the console settings."
echo ""
if [ "$POCKETDEV_HTTPS" = true ]; then
  echo -e "  ${BOLD}Health:${NC}  https://${DISPLAY_HOST}/PocketDev/health"
else
  echo -e "  ${BOLD}Health:${NC}  http://${DISPLAY_HOST}:${PORT}/PocketDev/health"
fi
echo ""
echo "  Useful commands:"
echo "    journalctl -u $SERVICE_NAME -f        # Stream agent logs"
if [ "$POCKETDEV_HTTPS" = true ]; then
  echo "    journalctl -u caddy -f                # Stream Caddy logs"
  echo "    systemctl restart caddy                # Restart Caddy"
fi
echo "    systemctl restart $SERVICE_NAME        # Restart agent"
echo "    curl http://localhost:$PORT/PocketDev/health  # Health check (internal)"
echo ""
