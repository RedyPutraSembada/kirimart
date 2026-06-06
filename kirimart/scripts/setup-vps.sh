#!/bin/bash
# ============================================
# KawanBelanja — VPS Initial Setup Script
# ============================================
#
# Jalankan SATU KALI saat pertama kali setup VPS baru.
#
# Cara pakai:
#   chmod +x scripts/setup-vps.sh
#   sudo ./scripts/setup-vps.sh
#
# ============================================

set -e  # Stop jika ada error

echo "============================================"
echo "  KawanBelanja — VPS Setup"
echo "============================================"
echo ""

# ── 1. Update System ──
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Docker ──
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# ── 3. Install Docker Compose Plugin ──
echo "[3/8] Checking Docker Compose..."
if docker compose version &> /dev/null; then
    echo "✅ Docker Compose plugin ready"
else
    apt install -y docker-compose-plugin
    echo "✅ Docker Compose plugin installed"
fi

# ── 4. Create Deploy User ──
echo "[4/8] Creating deploy user..."
if id "deploy" &>/dev/null; then
    echo "✅ User 'deploy' already exists"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    echo "✅ User 'deploy' created and added to docker group"
fi

# ── 5. Setup Firewall (UFW) ──
echo "[5/8] Configuring firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # Port 22
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw allow 81/tcp       # Nginx Proxy Manager Admin UI
ufw --force enable
echo "✅ Firewall configured (SSH, HTTP, HTTPS, NPM Admin)"

# ── 6. Create Swap File (2GB) ──
echo "[6/8] Creating 2GB swap file..."
if [ -f /swapfile ]; then
    echo "✅ Swap file already exists"
else
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Tuning: gunakan swap hanya saat darurat
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "✅ 2GB swap created (swappiness=10)"
fi

# ── 7. Create Project Directory ──
echo "[7/8] Creating project directory..."
DEPLOY_DIR="/home/deploy/kawanbelanja"
mkdir -p "$DEPLOY_DIR"
chown -R deploy:deploy "$DEPLOY_DIR"
echo "✅ Directory created: $DEPLOY_DIR"

# ── 8. Install Utilities ──
echo "[8/8] Installing utilities..."
apt install -y git curl wget htop nano

echo ""
echo "============================================"
echo "  ✅ VPS Setup Complete!"
echo "============================================"
echo ""
echo "  Langkah selanjutnya (sebagai user 'deploy'):"
echo ""
echo "  1. su - deploy"
echo "  2. cd ~/kawanbelanja"
echo "  3. git clone <REPO_URL> kirimart"
echo "  4. git clone <UPLOADER_REPO_URL> file-uploader"
echo "  5. cd kirimart"
echo "  6. cp .env.production .env.production  # Edit isi values"
echo "  7. nano .env.production                # Isi semua GANTI_INI"
echo "  8. bash scripts/deploy.sh              # Build & start!"
echo ""
echo "  NPM Admin UI: http://$(curl -s ifconfig.me):81"
echo "  Default login: admin@example.com / changeme"
echo ""
echo "============================================"
