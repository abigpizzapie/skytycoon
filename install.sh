#!/usr/bin/env bash
# ============================================================
# SkyTycoon - Proxmox VE Installer
# ============================================================
# Interactive (default):
#   chmod +x install.sh && ./install.sh
#
# One-liner (auto mode, defaults):
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/abigpizzapie/skytycoon/main/install.sh)"
#
# One-liner with custom settings:
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/abigpizzapie/skytycoon/main/install.sh)" -- --ctid 250 --ram 1024
# ============================================================

set -uo pipefail

# ── Defaults ───────────────────────────────────────────────
APP_NAME="SkyTycoon"
REPO_URL="https://github.com/abigpizzapie/skytycoon.git"
CTID=200
CT_HOSTNAME="skytycoon"
CT_PASSWORD="pve"
CT_STORAGE="local-lvm"
CT_TEMPLATE_STORAGE="local"
CT_RAM=512
CT_CORES=2
CT_DISK=2
CT_BRIDGE="vmbr0"
INSTALL_DIR="/var/www/html"
LISTEN_PORT=8000
AUTO_MODE=false
GAME_DIR=""

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

# ── Parse CLI args ─────────────────────────────────────────
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --auto)        AUTO_MODE=true; shift ;;
            --ctid)        CTID="$2"; shift 2 ;;
            --hostname)    CT_HOSTNAME="$2"; shift 2 ;;
            --password)    CT_PASSWORD="$2"; shift 2 ;;
            --storage)     CT_STORAGE="$2"; shift 2 ;;
            --template-storage) CT_TEMPLATE_STORAGE="$2"; shift 2 ;;
            --ram)         CT_RAM="$2"; shift 2 ;;
            --cores)       CT_CORES="$2"; shift 2 ;;
            --disk)        CT_DISK="$2"; shift 2 ;;
            --bridge)      CT_BRIDGE="$2"; shift 2 ;;
            --port)        LISTEN_PORT="$2"; shift 2 ;;
            --help|-h)
                echo "Usage: $0 [--auto] [--ctid ID] [--ram MB] [--port PORT] ..."
                echo "  --auto         Non-interactive mode (use defaults, no prompts)"
                echo "  --ctid ID      Container ID (default: 200)"
                echo "  --hostname H   Container hostname (default: skytycoon)"
                echo "  --password P   Container password (default: pve)"
                echo "  --storage S    Storage target (default: local-lvm)"
                echo "  --ram MB       RAM in MB (default: 512)"
                echo "  --cores N      CPU cores (default: 2)"
                echo "  --disk GB      Disk in GB (default: 2)"
                echo "  --bridge B     Network bridge (default: vmbr0)"
                echo "  --port PORT    Game port (default: 8000)"
                exit 0
                ;;
            *) err "Unknown option: $1"; exit 1 ;;
        esac
    done
}

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

    # Check CTID conflict — auto-resolve in auto mode
    if pct status "$CTID" &>/dev/null; then
        if [[ "$AUTO_MODE" == true ]]; then
            # Find next available ID
            while pct status "$CTID" &>/dev/null 2>&1; do
                CTID=$((CTID + 1))
            done
            info "Container ID $CTID already exists, using $CTID"
        else
            err "Container ID $CTID already exists!"
            read -rp "Enter a different CTID (or press Enter to abort): " NEW_CTID
            if [[ -z "$NEW_CTID" ]]; then exit 1; fi
            CTID="$NEW_CTID"
        fi
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

# ── Configuration prompt (interactive only) ────────────────
configure() {
    if [[ "$AUTO_MODE" == true ]]; then
        info "Running in auto mode with defaults"
        echo ""
        return
    fi

    # Only prompt if stdin is a terminal
    if [[ -t 0 ]]; then
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
        echo ""

        read -rp "  Proceed with installation? [Y/n]: " confirm
        if [[ "${confirm,,}" == "n" ]]; then
            warn "Installation cancelled."
            exit 0
        fi
    else
        info "Non-interactive mode, using defaults"
    fi
    echo ""
}

# ── Clone game from GitHub (on Proxmox host) ───────────────
clone_game() {
    info "Downloading game from GitHub..."

    GAME_DIR=$(mktemp -d)
    git clone --depth 1 "$REPO_URL" "$GAME_DIR" 2>/dev/null

    if [[ ! -f "$GAME_DIR/index.html" ]]; then
        err "Failed to download game files from $REPO_URL"
        exit 1
    fi

    log "Game downloaded"
}

# ── Create LXC container ──────────────────────────────────
install_container() {
    echo ""
    info "Creating LXC container $CTID..."

    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  ARCH_PATTERN="amd64" ;;
        aarch64) ARCH_PATTERN="arm64" ;;
        *)       ARCH_PATTERN="amd64" ;;
    esac
    info "Detected architecture: $ARCH ($ARCH_PATTERN)"

    TEMPLATE=$(pveam available --section system | grep -E "debian.*13.*standard.*${ARCH_PATTERN}" | tail -1 | awk '{print $2}')
    if [[ -z "$TEMPLATE" ]]; then
        TEMPLATE=$(pveam available --section system | grep -E "debian.*12.*standard.*${ARCH_PATTERN}" | tail -1 | awk '{print $2}')
    fi
    if [[ -z "$TEMPLATE" ]]; then
        err "No Debian template found for $ARCH_PATTERN. Available:"
        pveam available --section system | grep debian
        exit 1
    fi

    if ! pvesm list "$CT_TEMPLATE_STORAGE" | grep -q "$TEMPLATE"; then
        info "Downloading template: $TEMPLATE"
        info "(this may take a few minutes...)"
        pveam download "$CT_TEMPLATE_STORAGE" "$TEMPLATE"
        log "Template downloaded"
    else
        log "Template already cached"
    fi

    echo ""
    info "Template storage: $CT_TEMPLATE_STORAGE"
    info "Container storage: $CT_STORAGE"
    info "Template: $TEMPLATE"
    info "CTID: $CTID"
    echo ""

    info "Creating container (this may take a minute)..."
    if ! pct create "$CTID" "${CT_TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" \
        --hostname "$CT_HOSTNAME" \
        --memory "$CT_RAM" \
        --cores "$CT_CORES" \
        --rootfs "${CT_STORAGE}:${CT_DISK}" \
        --net0 "name=eth0,bridge=${CT_BRIDGE},ip=dhcp" \
        --password "$CT_PASSWORD" \
        --unprivileged 1 \
        --features "nesting=1"; then
        err "Failed to create container. Check storage and try a different CTID."
        exit 1
    fi

    log "Container $CTID created"

    info "Starting container..."
    pct start "$CTID"
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
    info "Installing nginx..."
    pct exec "$CTID" -- bash -c "
        apt-get update -qq
        apt-get install -y -qq nginx
    "
    log "Nginx installed"

    info "Deploying game files..."

    pct exec "$CTID" -- mkdir -p "$INSTALL_DIR/css" "$INSTALL_DIR/js"
    pct push "$CTID" "$GAME_DIR/index.html" "$INSTALL_DIR/index.html"
    pct push "$CTID" "$GAME_DIR/css/style.css" "$INSTALL_DIR/css/style.css"
    pct push "$CTID" "$GAME_DIR/js/aircraft.js" "$INSTALL_DIR/js/aircraft.js"
    pct push "$CTID" "$GAME_DIR/js/airports.js" "$INSTALL_DIR/js/airports.js"
    pct push "$CTID" "$GAME_DIR/js/engine.js" "$INSTALL_DIR/js/engine.js"
    pct push "$CTID" "$GAME_DIR/js/ui.js" "$INSTALL_DIR/js/ui.js"
    pct push "$CTID" "$GAME_DIR/js/main.js" "$INSTALL_DIR/js/main.js"

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
    "

    log "Game deployed and nginx configured"

    # Cleanup
    rm -rf "$GAME_DIR"
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
    parse_args "$@"
    header
    preflight
    configure
    clone_game
    install_container
    deploy_game
    done_msg
}

main "$@"
