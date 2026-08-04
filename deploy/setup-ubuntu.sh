#!/bin/bash
# ==========================================================
#  FIF VPS Bootstrap — Ubuntu Server 24.04 LTS (SumoPod)
#  Jalankan SEKALI di VPS baru (user ubuntu, butuh sudo):
#     ssh ubuntu@<NEW_IP>
#     sudo apt-get update -y && sudo apt-get install -y git curl
#     curl -fsSL https://raw.githubusercontent.com/addinyas/fif-broadcast/main/deploy/setup-ubuntu.sh | sudo bash
#  Atau setelah repo di-clone:
#     sudo bash /var/www/fif/deploy/setup-ubuntu.sh
#  Catatan: dijalankan sebagai root (via sudo); VPS SumoPod login = user ubuntu.
# ==========================================================
set -euo pipefail

DOMAIN="${DOMAIN:-fif-broadcast.net}"
APP_DIR="${APP_DIR:-/var/www/fif}"
REPO_SSH="git@github.com:addinyas/fif-broadcast.git"
REPO_HTTPS="https://github.com/addinyas/fif-broadcast.git"
DB_USER="fif"
DB_NAME="fif"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"
PHP_VERSION="8.3"

echo "======================================================"
echo "  FIF VPS Bootstrap (Ubuntu 24.04)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Domain : $DOMAIN"
echo "  App    : $APP_DIR"
echo "  DB     : $DB_USER/$DB_NAME"
echo "======================================================"

# --- 1. System packages ---
echo ">>> Upgrade system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo ">>> Install base packages..."
apt-get install -y nginx git curl wget unzip zip ca-certificates \
  gnupg lsb-release software-properties-common acl openssl \
  certbot python3-certbot-nginx ufw \
  postgresql postgresql-contrib redis-server

# --- 2. PHP 8.3 + extensions ---
echo ">>> Install PHP $PHP_VERSION (ondrej/php)..."
add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y \
  php${PHP_VERSION}-fpm \
  php${PHP_VERSION}-cli php${PHP_VERSION}-mbstring php${PHP_VERSION}-xml \
  php${PHP_VERSION}-curl php${PHP_VERSION}-zip php${PHP_VERSION}-gd \
  php${PHP_VERSION}-intl php${PHP_VERSION}-bcmath php${PHP_VERSION}-pgsql \
  php${PHP_VERSION}-redis php${PHP_VERSION}-sqlite3

# --- 3. Composer ---
echo ">>> Install Composer..."
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# --- 4. Node.js 22 LTS (untuk Next.js 15 + worker) ---
echo ">>> Install Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# --- 5. Swap 2GB (penting di RAM 4GB) ---
echo ">>> Setup 2GB swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p
fi
free -h

# --- 6. Firewall ---
echo ">>> UFW (OpenSSH, 80, 443)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

# --- 7. PostgreSQL: DB + user + tuning 4GB ---
echo ">>> Setup PostgreSQL ($DB_USER/$DB_NAME)..."
sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

echo ">>> Tuning PostgreSQL (4GB RAM)..."
sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers = '512MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_cache_size = '1GB';"
sudo -u postgres psql -c "ALTER SYSTEM SET work_mem = '16MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 100;"
systemctl restart postgresql
systemctl enable postgresql

# --- 8. Redis: tuning ---
echo ">>> Tuning Redis..."
sed -i 's/^# *maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf 2>/dev/null || true
sed -i 's/^maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf 2>/dev/null || true
sed -i 's/^# *maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf 2>/dev/null || true
sed -i 's/^maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf 2>/dev/null || true
systemctl restart redis-server || systemctl restart redis
systemctl enable redis-server || systemctl enable redis

# --- 9. User fif + GitHub Deploy Key (server-side git pull) ---
echo ">>> Create app user..."
id -u fif &>/dev/null || useradd -r -m -s /bin/bash fif

echo ">>> Generate GitHub deploy key untuk git pull di server..."
mkdir -p /root/.ssh
if [ ! -f /root/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -C "fif-vps@$(hostname)" -f /root/.ssh/id_ed25519 -N ""
fi
ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null || true

echo ""
echo "======================================================"
echo "  TAMBAHKAN KEY INI DI GITHUB (read-only):"
echo "  Repo addinyas/fif-broadcast > Settings > Deploy keys"
echo "======================================================"
cat /root/.ssh/id_ed25519.pub
echo "======================================================"
echo ""

# --- 10. Clone repo ---
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  echo ">>> Clone repository..."
  if timeout 20 git ls-remote "$REPO_SSH" >/dev/null 2>&1; then
    git clone "$REPO_SSH" "$APP_DIR"
  else
    echo "  SSH ke GitHub belum aktif (deploy key belum diadd) -> clone via https."
    git clone "$REPO_HTTPS" "$APP_DIR"
    echo "  SETELAH deploy key diadd, jalankan:"
    echo "    git -C $APP_DIR remote set-url origin $REPO_SSH"
  fi
else
  echo ">>> Repo sudah ada, update..."
  git -C "$APP_DIR" pull --ff-only || true
fi

# --- 11. backend/.env (fallback; SEBAIKNYA copy .env asli dari server lama) ---
echo ">>> Provision backend/.env..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  sed -i "s|^APP_URL=.*|APP_URL=https://$DOMAIN|" "$APP_DIR/backend/.env"
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$APP_DIR/backend/.env"
  sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=$DOMAIN|" "$APP_DIR/backend/.env"
  sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://$DOMAIN|" "$APP_DIR/backend/.env"
  sed -i "s|^GOOGLE_REDIRECT_URI=.*|GOOGLE_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback|" "$APP_DIR/backend/.env"
  sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=pgsql|" "$APP_DIR/backend/.env"
  sed -i "s|^SESSION_DRIVER=.*|SESSION_DRIVER=redis|" "$APP_DIR/backend/.env"
  sed -i "s|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=redis|" "$APP_DIR/backend/.env"
  sed -i "s|^CACHE_STORE=.*|CACHE_STORE=redis|" "$APP_DIR/backend/.env"
  sed -i "s|^BROADCAST_CONNECTION=.*|BROADCAST_CONNECTION=redis|" "$APP_DIR/backend/.env"
  cat >> "$APP_DIR/backend/.env" <<EOF

DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null
EOF
  APP_KEY=$(openssl rand -base64 32)
  sed -i "s|^APP_KEY=.*|APP_KEY=base64:$APP_KEY|" "$APP_DIR/backend/.env"
  echo "!!! .env fallback dibuat. GANTI GOOGLE_CLIENT_ID/SECRET dan APP_KEY dengan nilai server lama:"
  echo "    scp root@OLD_IP:/var/www/fif/backend/.env $APP_DIR/backend/.env"
else
  echo "  backend/.env sudah ada - biarkan."
fi

# --- 12. worker/.env ---
echo ">>> Provision worker/.env..."
cat > "$APP_DIR/worker/.env" <<EOF
PG_HOST=127.0.0.1
PG_PORT=5432
PG_DATABASE=$DB_NAME
PG_USER=$DB_USER
PG_PASSWORD=$DB_PASSWORD
SOCKET_HOST=127.0.0.1
SOCKET_PORT=3001
POLL_INTERVAL_MS=5000
MIN_DELAY_SEC=3
MAX_DELAY_SEC=30
MAX_CONNECTION_HOURS=8
EOF

# --- 13. Bersihkan default site Nginx (biar fif.conf jadi default) ---
rm -f /etc/nginx/sites-enabled/default

# --- 14. Deploy awal ---
echo ">>> Deploy awal (git pull, composer, build frontend, systemd)..."
chown -R fif:fif "$APP_DIR"
bash "$APP_DIR/deploy/deploy-vps.sh" --force "$DOMAIN" || {
  echo "!!! Deploy awal gagal. Periksa error di atas."
}

echo ""
echo "======================================================"
echo "  BOOTSTRAP SELESAI"
echo "======================================================"
echo "  LANGKAH SELANJUTNYA:"
echo "  1. Add deploy key GitHub (lihat output di atas), lalu:"
echo "       git -C $APP_DIR remote set-url origin $REPO_SSH"
echo "  2. Copy .env asli dari server lama (APP_KEY + Google OAuth):"
echo "       scp root@202.10.42.237:/var/www/fif/backend/.env $APP_DIR/backend/.env"
echo "       cd $APP_DIR/backend && php artisan config:clear"
echo "  3. Migrasi data (dari VPS lama):"
echo "       ssh root@202.10.42.237 \"pg_dump -U fif -h 127.0.0.1 fif | gzip\" | gunzip | psql -U fif -h 127.0.0.1 fif"
echo "       rsync -av root@202.10.42.237:/var/www/fif/backend/storage/app/ $APP_DIR/backend/storage/app/"
echo "  4. Pindah DNS di Cloudflare: A fif-broadcast.net + www -> <NEW_IP>"
echo "  5. Setelah DNS propagate, buat SSL:"
echo "       certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "       bash $APP_DIR/deploy/deploy-vps.sh $DOMAIN"
echo "  6. Autodeploy: tambahkan GitHub Actions secrets (VPS_HOST, VPS_SSH_KEY, dll)"
echo "======================================================"
