#!/usr/bin/env bash
# ============================================================
# SkyTycoon - Proxmox VE Installer
# ============================================================
# Creates an LXC container with nginx and deploys the game
# from GitHub. Run on your Proxmox host:
#
#   chmod +x install.sh && ./install.sh
#
# Or with custom settings:
#   CTID=250 CT_RAM=1024 LISTEN_PORT=8080 ./install.sh
# ============================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────
APP_NAME="SkyTycoon"
REPO_URL="https://github.com/abigpizzapie/skytycoon.git"
CTID="${CTID:-200}"
CT_HOSTNAME="${CT_HOSTNAME:-skytycoon}"
CT_PASSWORD="${CT_PASSWORD:-pve}"
CT_STORAGE="${CT_STORAGE:-local-lvm}"
CT_RAM="${CT_RAM:-512}"
CT_CORES="${CT_CORES:-2}"
CT_DISK="${CT_DISK:-2}"
CT_BRIDGE="${CT_BRIDGE:-vmbr0}"
INSTALL_DIR="/var/www/html"
LISTEN_PORT="${LISTEN_PORT:-8000}"

# ── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

header() {
    clear
    echo -e "${CYAN}"
    echo "  ╔══════════════════════════════════════════════════╗"
    echo "  ║                                                  ║"
    echo "  ║          ✈  SkyTycoon Installer  ✈              ║"
    echo "  ║     Offline Airline Management Simulator         ║"
    echo "  ║                                                  ║"
    echo "  ╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*"; }
err()    { echo -e "${RED}[✗]${NC} $*" >&2; }
info()   { echo -e "${BLUE}[i]${NC} $*"; }

# ── Pre-flight checks ─────────────────────────────────────
preflight() {
    header

    if [[ $EUID -ne 0 ]]; then
        err "This script must be run as root on your Proxmox host."
        exit 1
    fi

    if ! command -v pct &>/dev/null; then
        err "This does not appear to be a Proxmox VE host (pct not found)."
        exit 1
    fi

    if pct status "$CTID" &>/dev/null; then
        err "Container ID $CTID already exists!"
        echo ""
        read -rp "Enter a different CTID (or press Enter to abort): " NEW_CTID
        if [[ -z "$NEW_CTID" ]]; then exit 1; fi
        CTID="$NEW_CTID"
    fi

    if ! pvesm status | grep -q "$CT_STORAGE"; then
        err "Storage '$CT_STORAGE' not found. Available:"
        pvesm status | awk 'NR>1 {print "  - " $1}'
        exit 1
    fi

    if ! command -v git &>/dev/null; then
        err "git is not installed on the Proxmox host."
        exit 1
    fi

    log "Pre-flight checks passed"
    echo ""
}

# ── Configuration prompt ───────────────────────────────────
configure() {
    echo -e "${CYAN}Configuration (press Enter for defaults):${NC}"
    echo ""

    read -rp "  Container ID       [$CTID]: " input && CTID="${input:-$CTID}"
    read -rp "  Hostname           [$CT_HOSTNAME]: " input && CT_HOSTNAME="${input:-$CT_HOSTNAME}"
    read -rp "  Password           [$CT_PASSWORD]: " input && CT_PASSWORD="${input:-$CT_PASSWORD}"
    read -rp "  Storage            [$CT_STORAGE]: " input && CT_STORAGE="${input:-$CT_STORAGE}"
    read -rp "  RAM (MB)           [$CT_RAM]: " input && CT_RAM="${input:-$CT_RAM}"
    read -rp "  CPU Cores          [$CT_CORES]: " input && CT_CORES="${input:-$CT_CORES}"
    read -rp "  Disk (GB)          [$CT_DISK]: " input && CT_DISK="${input:-$CT_DISK}"
    read -rp "  Network Bridge     [$CT_BRIDGE]: " input && CT_BRIDGE="${input:-$CT_BRIDGE}"
    read -rp "  Game Port          [$LISTEN_PORT]: " input && LISTEN_PORT="${input:-$LISTEN_PORT}"

    echo ""
    echo -e "${YELLOW}Summary:${NC}"
    echo "  Container: $CTID ($CT_HOSTNAME)"
    echo "  Resources: ${CT_CORES} cores, ${CT_RAM}MB RAM, ${CT_DISK}GB disk"
    echo "  Storage:   $CT_STORAGE"
    echo "  Network:   $CT_BRIDGE"
    echo "  Game URL:  http://<IP>:$LISTEN_PORT"
    echo "  Source:    $REPO_URL"
    echo ""

    read -rp "  Proceed with installation? [Y/n]: " confirm
    if [[ "${confirm,,}" == "n" ]]; then
        warn "Installation cancelled."
        exit 0
    fi
}

# ── Clone game from GitHub (on Proxmox host) ───────────────
clone_game() {
    info "Downloading game from GitHub..."

    TMPDIR=$(mktemp -d)
    git clone --depth 1 "$REPO_URL" "$TMPDIR" 2>/dev/null
    log "Game downloaded"

    # Store path for container deployment
    echo "$TMPDIR"
}

# ── Create LXC container ──────────────────────────────────
install_container() {
    echo ""
    info "Creating LXC container $CTID..."

    TEMPLATE=$(pveam available --section system | grep -E "debian.*13.*standard" | tail -1 | awk '{print $2}')
    if [[ -z "$TEMPLATE" ]]; then
        TEMPLATE=$(pveam available --section system | grep -E "debian.*12.*standard" | tail -1 | awk '{print $2}')
    fi
    if [[ -z "$TEMPLATE" ]]; then
        err "Could not find a Debian template. Check your pveam repository."
        exit 1
    fi

    if ! pveam list "$CT_STORAGE" | grep -q "$TEMPLATE"; then
        info "Downloading template: $TEMPLATE"
        pveam download "$CT_STORAGE" "$TEMPLATE" >/dev/null 2>&1
        log "Template downloaded"
    fi

    pct create "$CTID" "${CT_STORAGE}:vztmpl/${TEMPLATE}" \
        --hostname "$CT_HOSTNAME" \
        --memory "$CT_RAM" \
        --cores "$CT_CORES" \
        --rootfs "${CT_STORAGE}:${CT_DISK}" \
        --net0 "name=eth0,bridge=${CT_BRIDGE},ip=dhcp" \
        --password "$CT_PASSWORD" \
        --unprivileged 1 \
        --features "nesting=1" >/dev/null 2>&1

    log "Container $CTID created"

    info "Starting container..."
    pct start "$CTID" >/dev/null 2>&1
    sleep 5

    info "Waiting for network..."
    for i in $(seq 1 30); do
        if pct exec "$CTID" -- ping -c1 -W2 8.8.8.8 &>/dev/null; then
            break
        fi
        sleep 2
    done

    IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -z "$IP" ]]; then
        warn "Could not detect container IP. Using DHCP-assigned address."
        IP="<container-ip>"
    fi

    log "Container network ready"
}

# ── Deploy game inside container ──────────────────────────
deploy_game() {
    local game_dir="$1"

    info "Installing nginx..."
    pct exec "$CTID" -- bash -c "
        apt-get update -qq >/dev/null 2>&1
        apt-get install -y -qq nginx >/dev/null 2>&1
    " 2>/dev/null
    log "Nginx installed"

    info "Deploying game files..."

    # Copy game files from host into container
    pct push "$CTID" "$game_dir/index.html" "$INSTALL_DIR/index.html"
    pct push "$CTID" "$game_dir/css" "$INSTALL_DIR/css"
    pct push "$CTID" "$game_dir/js" "$INSTALL_DIR/js"

    info "Configuring nginx..."
    pct exec "$CTID" -- bash -c "
        cat > /etc/nginx/sites-available/skytycoon <<'NGINXEOF'
server {
    listen ${LISTEN_PORT};
    server_name _;
    root ${INSTALL_DIR};
    index index.html;

    location / {
        try_files \\\$uri \\\$uri/ =404;
        add_header Cache-Control \"no-cache, no-store, must-revalidate\";
    }

    location ~* \\\.(js|css)$ {
        add_header Content-Type \"application/javascript\";
        expires 1h;
    }
}
NGINXEOF

        ln -sf /etc/nginx/sites-available/skytycoon /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        systemctl enable -q nginx
        systemctl restart nginx
    " 2>/dev/null

    log "Game deployed and nginx configured"

    # Cleanup temp clone
    rm -rf "$game_dir"
}

# ── Final output ───────────────────────────────────────────
done_msg() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}║       ✈  SkyTycoon installed successfully!  ✈   ║${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}Access your airline at:${NC}"
    echo -e "  ${GREEN}http://${IP}:${LISTEN_PORT}${NC}"
    echo ""
    echo -e "  ${YELLOW}Container Management:${NC}"
    echo -e "    Start:   ${BLUE}pct start $CTID${NC}"
    echo -e "    Stop:    ${BLUE}pct stop $CTID${NC}"
    echo -e "    Console: ${BLUE}pct enter $CTID${NC}"
    echo -e "    Status:  ${BLUE}pct status $CTID${NC}"
    echo ""
    echo -e "  ${YELLOW}To play:${NC}"
    echo -e "    1. Open the URL above in your browser"
    echo -e "    2. Enter your airline name and pick a hub"
    echo -e "    3. Buy aircraft, create routes, and grow your empire!"
    echo ""
}

# ── Main ───────────────────────────────────────────────────
main() {
    header
    preflight
    configure
    local game_dir
    game_dir=$(clone_game)
    install_container
    deploy_game "$game_dir"
    done_msg
}

main "$@"
