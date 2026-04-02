#!/bin/bash
set -e
set -o pipefail

POCKETDEV_VERSION="0.2.0"
INSTALL_DIR="/opt/pocketdev"
DATA_DIR="/opt/pocketdev/data"
BUNDLE_URL="https://pocketdev.run/agent/bundle"
SERVICE_NAME="pocketdev-agent"
PORT=4387

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
step "Step 0/4: Pre-flight checks"

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
step "Step 1/4: Installing required packages"

install_pkg() {
  case "$OS_TYPE" in
    ubuntu|debian|pop|linuxmint|zorin)
      apt-get update -qq >/dev/null 2>&1
      apt-get install -y -qq "$@" >/dev/null 2>&1
      ;;
    centos|fedora|rhel|rocky|almalinux|amzn)
      dnf install -y "$@" >/dev/null 2>&1 || yum install -y "$@" >/dev/null 2>&1
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm --needed "$@" >/dev/null 2>&1
      ;;
    alpine)
      apk add "$@" >/dev/null 2>&1
      ;;
    *)
      warn "Unknown OS '$OS_TYPE' — trying apt-get"
      apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq "$@" >/dev/null 2>&1
      ;;
  esac
}

for pkg in curl unzip; do
  if ! command -v "$pkg" >/dev/null 2>&1; then
    info "Installing $pkg..."
    install_pkg "$pkg"
    ok "$pkg installed"
  fi
done

ok "Required packages ready"

# ─── Step 2: Install Bun runtime ─────────────────────────────────
step "Step 2/4: Setting up Bun runtime"

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
step "Step 3/4: Installing PocketDev agent"

# Stop existing service if running
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  info "Stopping existing agent..."
  systemctl stop "$SERVICE_NAME"
fi

mkdir -p "$INSTALL_DIR" "$DATA_DIR"

info "Downloading agent bundle..."
BUNDLE_TMP="$(mktemp)"
HTTP_CODE=$(curl -fsSL -w '%{http_code}' -o "$BUNDLE_TMP" "$BUNDLE_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  rm -f "$BUNDLE_TMP"
  fail "Failed to download agent bundle (HTTP $HTTP_CODE). Is pocketdev.run up?"
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

# ─── Step 4: Start and verify ─────────────────────────────────────
step "Step 4/4: Starting PocketDev agent"

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

# ─── Extract setup code from journal ─────────────────────────────
SETUP_CODE="$(journalctl -u $SERVICE_NAME --no-pager -n 30 2>/dev/null | grep -oP 'Setup code: \K[A-Z]{4}-[0-9]{4}' | tail -1 || echo '')"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PocketDev installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
if [ -n "$SETUP_CODE" ]; then
  echo -e "  ${BOLD}Setup code:${NC}  ${CYAN}${SETUP_CODE}${NC}"
  echo ""
  echo "  This code expires in 15 minutes."
  echo "  Open PocketDev on your phone and pair this server."
  echo ""
fi
echo -e "  ${BOLD}Agent URL:${NC}   http://${PUBLIC_IP}:${PORT}"
echo -e "  ${BOLD}Health:${NC}      http://${PUBLIC_IP}:${PORT}/health"
echo ""
echo "  Useful commands:"
echo "    journalctl -u $SERVICE_NAME -f        # Stream logs"
echo "    systemctl restart $SERVICE_NAME        # Restart"
echo "    systemctl stop $SERVICE_NAME           # Stop"
echo "    curl http://localhost:$PORT/health     # Health check"
echo ""
