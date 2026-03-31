#!/usr/bin/env bash
# setup-vps.sh — First-time VPS setup for WebRTC Chat deployment
#
# Run this script on a fresh Ubuntu 22.04/24.04 VPS as root:
#   curl -sSL https://raw.githubusercontent.com/<user>/zvonOK/main/scripts/setup-vps.sh | bash
#
# Or copy and run manually:
#   scp scripts/setup-vps.sh root@<vps-ip>:~/
#   ssh root@<vps-ip> bash setup-vps.sh
#
# What this script does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose v2
#   3. Creates a deploy user with Docker access
#   4. Configures UFW firewall
#   5. Creates project directory

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────
DEPLOY_USER="${DEPLOY_USER:-deploy}"
PROJECT_DIR="/home/${DEPLOY_USER}/zvonOK"

echo "=== WebRTC Chat VPS Setup ==="
echo ""

# ── 1. System update ──────────────────────────────────────────────
echo "[1/5] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Install Docker ─────────────────────────────────────────────
echo "[2/5] Installing Docker..."
if command -v docker &> /dev/null; then
    echo "  Docker already installed: $(docker --version)"
else
    # Install prerequisites
    apt-get install -y -qq \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable and start Docker
    systemctl enable docker
    systemctl start docker

    echo "  Docker installed: $(docker --version)"
fi

echo "  Docker Compose: $(docker compose version)"

# ── 3. Create deploy user ─────────────────────────────────────────
echo "[3/5] Setting up deploy user '${DEPLOY_USER}'..."
if id "${DEPLOY_USER}" &> /dev/null; then
    echo "  User '${DEPLOY_USER}' already exists"
else
    adduser --disabled-password --gecos "" "${DEPLOY_USER}"
    echo "  Created user '${DEPLOY_USER}'"
fi

# Add to docker group
usermod -aG docker "${DEPLOY_USER}"

# Set up SSH access (copy root's authorized_keys)
DEPLOY_SSH_DIR="/home/${DEPLOY_USER}/.ssh"
mkdir -p "${DEPLOY_SSH_DIR}"
if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys "${DEPLOY_SSH_DIR}/authorized_keys"
    echo "  Copied SSH keys from root"
else
    echo "  WARNING: No /root/.ssh/authorized_keys found."
    echo "  You'll need to manually add SSH keys to ${DEPLOY_SSH_DIR}/authorized_keys"
fi
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_SSH_DIR}"
chmod 700 "${DEPLOY_SSH_DIR}"
chmod 600 "${DEPLOY_SSH_DIR}/authorized_keys" 2>/dev/null || true

# ── 4. Configure firewall ─────────────────────────────────────────
echo "[4/5] Configuring UFW firewall..."
apt-get install -y -qq ufw

# Reset and set defaults
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp comment "SSH"

# HTTP/HTTPS (Caddy)
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw allow 443/udp comment "HTTP/3 QUIC"

# STUN/TURN (coturn)
ufw allow 3478/tcp comment "STUN/TURN"
ufw allow 3478/udp comment "STUN/TURN"
ufw allow 5349/tcp comment "TURNS (TLS)"

# mediasoup RTC media ports
ufw allow 40000:40099/udp comment "mediasoup RTC"
ufw allow 40000:40099/tcp comment "mediasoup RTC TCP"

# coturn relay ports
ufw allow 49152:49252/udp comment "coturn relay"

# Enable firewall
ufw --force enable
echo "  Firewall configured:"
ufw status numbered

# ── 5. Create project directory ────────────────────────────────────
echo "[5/5] Creating project directory..."
mkdir -p "${PROJECT_DIR}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${PROJECT_DIR}"
echo "  Project directory: ${PROJECT_DIR}"

# ── Done ───────────────────────────────────────────────────────────
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Add your SSH public key to ${DEPLOY_SSH_DIR}/authorized_keys (if not copied from root)"
echo "  2. Copy .env to ${PROJECT_DIR}/.env (use .env.production.example as template)"
echo "  3. Set GHCR_REPO in .env to your GitHub repository (e.g., user/zvonOK)"
echo "  4. Log in to GHCR on the VPS:"
echo "     ssh ${DEPLOY_USER}@<this-server>"
echo "     echo \$GITHUB_TOKEN | docker login ghcr.io -u <github-user> --password-stdin"
echo ""
echo "  5. Configure GitHub Actions secrets:"
echo "     VPS_HOST     = $(curl -s ifconfig.me 2>/dev/null || echo '<this-server-ip>')"
echo "     VPS_USER     = ${DEPLOY_USER}"
echo "     VPS_SSH_KEY  = <private key matching authorized_keys>"
echo "     GHCR_TOKEN   = <GitHub PAT with packages:read scope>"
echo ""
echo "  6. Push to main — GitHub Actions will build, push, and deploy automatically."
echo ""
echo "  For manual deployment:"
echo "     ssh ${DEPLOY_USER}@<this-server>"
echo "     cd ${PROJECT_DIR}"
echo "     docker compose -f docker-compose.prod.yml pull"
echo "     docker compose -f docker-compose.prod.yml up -d"
