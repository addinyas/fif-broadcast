#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/fif"
DOMAIN="${1:-fif-broadcast.net}"

cd "$APP_DIR"

# --- Git pull & detect changes ---
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)

CHANGED=""
if [ "$BEFORE" != "$AFTER" ]; then
    echo "=== Changes detected ($BEFORE -> $AFTER) ==="
    CHANGED=$(git diff-tree --no-commit-id -r "$BEFORE" "$AFTER" --name-only)
else
    echo "=== Already up to date - nothing to deploy ==="
    exit 0
fi

# --- Backend ---
cd "$APP_DIR/backend"

if echo "$CHANGED" | grep -qE "^(backend/composer\.(json|lock))$"; then
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
if echo "$CHANGED" | grep -q "^frontend/"; then
    echo "=> frontend changed, rebuilding..."
    cd "$APP_DIR/frontend"
    npm install
    npm run build
else
    echo "=> no frontend changes, skipping build"
fi

# --- Worker (only if worker/ changed) ---
if echo "$CHANGED" | grep -q "^worker/"; then
    echo "=> worker changed, reinstalling..."
    cd "$APP_DIR/worker"
    npm install
else
    echo "=> no worker changes, skipping npm install"
fi

# --- Nginx config (always fresh) ---
rm -f /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/ssl.conf

cat > /etc/nginx/conf.d/fif.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 20M;

    root /var/www/fif/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        try_files \$uri /api/index.php?\$query_string;
    }

    location = /api/index.php {
        include fastcgi_params;
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME /var/www/fif/backend/public/index.php;
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
User=root

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/fif-worker.service <<EOF
[Unit]
Description=FIF WhatsApp Worker
After=network.target fif-queue.service

[Service]
Type=simple
WorkingDirectory=/var/www/fif/worker
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

chown -R root:root "$APP_DIR"
chmod -R 775 "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache"
systemctl stop fif-backend 2>/dev/null || true
systemctl disable fif-backend 2>/dev/null || true
nginx -t
systemctl daemon-reload
systemctl enable --now nginx php-fpm fif-queue fif-worker
systemctl restart nginx fif-queue fif-worker
systemctl --no-pager --full status fif-queue fif-worker

echo "=== Deploy complete ==="
