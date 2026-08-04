#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/fif"
FORCE=0
if [ "${1:-}" = "--force" ] || [ "${1:-}" = "-f" ]; then
    FORCE=1
    shift
fi
DOMAIN="${1:-fif-broadcast.net}"

# --- Detect web user (Ubuntu: www-data, RHEL/Rumahweb: apache) ---
WEB_USER="www-data"
if ! id -u www-data &>/dev/null 2>&1; then
    WEB_USER="apache"
fi

cd "$APP_DIR"

# --- Git safe.directory (repo di-chown ke fif, tapi deploy dijalankan root via sudo) ---
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

# --- Git pull & detect changes ---
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)

# --- Re-exec bila deploy-vps.sh sendiri berubah (bash baca inode lama saat git pull menimpa file) ---
if [ -z "${FIF_DEPLOY_REEXEC:-}" ] && [ -f "$APP_DIR/deploy/deploy-vps.sh" ]; then
    RUNNING_HASH=$(sha256sum "${BASH_SOURCE[0]}" 2>/dev/null | awk '{print $1}')
    DISK_HASH=$(sha256sum "$APP_DIR/deploy/deploy-vps.sh" 2>/dev/null | awk '{print $1}')
    if [ -n "$RUNNING_HASH" ] && [ "$RUNNING_HASH" != "$DISK_HASH" ]; then
        echo "deploy-vps.sh berubah saat berjalan — re-exec dengan versi baru..."
        export FIF_DEPLOY_REEXEC=1
        exec bash "$APP_DIR/deploy/deploy-vps.sh" "$@"
    fi
fi

CHANGED=""
if [ "$BEFORE" != "$AFTER" ]; then
    echo "=== Changes detected ($BEFORE -> $AFTER) ==="
    CHANGED=$(git diff-tree --no-commit-id -r "$BEFORE" "$AFTER" --name-only)
elif [ "$FORCE" = "1" ]; then
    echo "=== Force deploy — rebuild all ==="
    CHANGED=""
else
    echo "=== Already up to date - nothing to deploy ==="
    exit 0
fi

# --- Backend ---
cd "$APP_DIR/backend"

if [ "$FORCE" = "1" ] || echo "$CHANGED" | grep -qE "^(backend/composer\.(json|lock))$"; then
    echo "=> composer install"
    composer install --no-dev --optimize-autoloader
fi

php artisan migrate --force
php artisan storage:link || true
mkdir -p storage/framework/views bootstrap/cache
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:clear

# --- Frontend (only if frontend/ changed) ---
if [ "$FORCE" = "1" ] || echo "$CHANGED" | grep -q "^frontend/"; then
    echo "=> frontend changed, rebuilding..."
    cd "$APP_DIR/frontend"
    npm install
    npm run build
else
    echo "=> no frontend changes, skipping build"
fi

# --- Worker (only if worker/ changed) ---
if [ "$FORCE" = "1" ] || echo "$CHANGED" | grep -q "^worker/"; then
    echo "=> worker changed, reinstalling..."
    cd "$APP_DIR/worker"
    npm install
else
    echo "=> no worker changes, skipping npm install"
fi

# --- Nginx config (always fresh) ---
rm -f /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/ssl.conf
rm -f /etc/nginx/sites-enabled/default

# --- Detect PHP-FPM socket (Ubuntu vs RHEL) ---
FPM_SOCK="$(ls /run/php/php*-fpm.sock 2>/dev/null | head -1 || true)"
FPM_SOCK="${FPM_SOCK:-/run/php-fpm/www.sock}"

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    # SSL cert exists — write config with HTTPS + redirect
    cat > /etc/nginx/conf.d/fif.conf <<EOF
server {
    server_name $DOMAIN www.$DOMAIN _;

    client_max_body_size 20M;
    server_tokens off;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/fif/backend/public;
    index index.html;

    # Next.js Frontend (port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
    }

    # Laravel API
    location /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # PHP-FPM
    location ~ \.php\$ {
        fastcgi_pass unix:$FPM_SOCK;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300s;
        fastcgi_send_timeout 300s;
        fastcgi_connect_timeout 300s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /storage {
        alias /var/www/fif/backend/public/storage;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    if (\$host = www.$DOMAIN) {
        return 301 https://\$host\$request_uri;
    }
    if (\$host = $DOMAIN) {
        return 301 https://\$host\$request_uri;
    }
    listen 80 default_server;
    server_name $DOMAIN www.$DOMAIN _;
    return 404;
}
EOF
else
    # No SSL yet — HTTP only
    cat > /etc/nginx/conf.d/fif.conf <<EOF
server {
    listen 80 default_server;
    server_name $DOMAIN www.$DOMAIN _;

    client_max_body_size 20M;
    server_tokens off;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /var/www/fif/backend/public;
    index index.html;

    # Next.js Frontend (port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
    }

    # Laravel API
    location /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # PHP-FPM
    location ~ \.php\$ {
        fastcgi_pass unix:$FPM_SOCK;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300s;
        fastcgi_send_timeout 300s;
        fastcgi_connect_timeout 300s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /storage {
        alias /var/www/fif/backend/public/storage;
    }
}
EOF
fi

# --- PHP upload limits ---
PHP_INI=$(php --ini | grep "Loaded Configuration" | awk '{print $NF}')
if [ -n "$PHP_INI" ]; then
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 20M/' "$PHP_INI" 2>/dev/null || true
    sed -i 's/post_max_size = .*/post_max_size = 25M/' "$PHP_INI" 2>/dev/null || true
    sed -i 's/max_execution_time = .*/max_execution_time = 300/' "$PHP_INI" 2>/dev/null || true
    sed -i 's/max_input_time = .*/max_input_time = 300/' "$PHP_INI" 2>/dev/null || true
    echo "PHP upload limits updated"
fi

# --- Systemd services (always fresh) ---
# Note: Backend served via PHP-FPM (already running), not php artisan serve
# fif-backend.service is intentionally removed — use PHP-FPM instead

cat > /etc/systemd/system/fif-queue.service <<EOF
[Unit]
Description=FIF Laravel Queue
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/fif/backend
ExecStart=/usr/bin/php artisan queue:listen --tries=1 --timeout=0
Restart=always
RestartSec=5
User=fif
Group=fif

[Install]
WantedBy=multi-user.target
EOF

# --- Systemd for Worker (stable, no PM2 needed) ---
cat > /etc/systemd/system/fif-worker.service <<EOF
[Unit]
Description=FIF WhatsApp Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/fif/worker
ExecStart=/usr/bin/node src/index.js
KillMode=control-group
KillSignal=SIGTERM
TimeoutStopSec=10
Restart=always
RestartSec=8
User=fif
Group=fif
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# --- Systemd for Next.js Frontend ---
cat > /etc/systemd/system/fif-frontend.service <<EOF
[Unit]
Description=FIF Next.js Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/fif/frontend
ExecStart=/usr/bin/npx next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
User=fif
Group=fif
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create fif user if not exists
id -u fif &>/dev/null || useradd -r -s /bin/false fif

chown -R root:root "$APP_DIR"
chown -R "$WEB_USER":"$WEB_USER" "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache" "$APP_DIR/backend/database"
chmod -R 775 "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache"
setfacl -R -m u:"$WEB_USER":rwx "$APP_DIR/backend/database" 2>/dev/null || true
chown -R fif:fif "$APP_DIR/worker/auth_info" 2>/dev/null || true
chmod 700 "$APP_DIR/worker/auth_info" 2>/dev/null || true
chown -R fif:fif "$APP_DIR/frontend/.next" 2>/dev/null || true
# Worker now uses PostgreSQL directly — no SQLite access needed
setfacl -R -m u:fif:r "$APP_DIR/backend/storage" 2>/dev/null || true
setfacl -R -m u:fif:rx "$APP_DIR/backend/bootstrap" 2>/dev/null || true

nginx -t
systemctl daemon-reload

# --- Detect PHP-FPM service name (Ubuntu: php8.3-fpm, RHEL: php-fpm) ---
FPM_SERVICE="php-fpm"
FPM_UNITS="$(systemctl list-unit-files 2>/dev/null || true)"
if printf '%s\n' "$FPM_UNITS" | grep -qE '^php[0-9.]+-fpm\.service'; then
    FPM_SERVICE="$(printf '%s\n' "$FPM_UNITS" | grep -oE '^php[0-9.]+-fpm\.service' | head -1 | sed 's/\.service$//')"
fi

systemctl enable --now nginx "$FPM_SERVICE" fif-queue fif-worker fif-frontend
systemctl restart nginx "$FPM_SERVICE" fif-queue fif-worker fif-frontend

# --- Cloudflare WARP proxy (Docker) ---
if command -v docker &>/dev/null; then
    if docker ps -a --format '{{.Names}}' | grep -q '^warp$'; then
        echo "=> Ensuring WARP proxy is running..."
        docker start warp 2>/dev/null || true
    fi
fi

echo "=== Deploy complete ==="
