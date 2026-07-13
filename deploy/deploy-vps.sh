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

    # Frontend SPA (serves from frontend/dist)
    location / {
        root /var/www/fif/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Laravel API
    location /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # PHP-FPM
    location ~ \.php\$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
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

    # Frontend SPA (serves from frontend/dist)
    location / {
        root /var/www/fif/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Laravel API
    location /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # PHP-FPM
    location ~ \.php\$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
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
User=fif
Group=fif
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create fif user if not exists
id -u fif &>/dev/null || useradd -r -s /bin/false fif

chown -R root:root "$APP_DIR"
chown -R apache:apache "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache" "$APP_DIR/backend/database"
chmod -R 775 "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache"
chmod 664 "$APP_DIR/backend/database/database.sqlite"
# Fix WAL/SHM files — worker (fif) creates them, PHP-FPM (apache) must also write
chown apache:apache "$APP_DIR/backend/database/database.sqlite"-shm "$APP_DIR/backend/database/database.sqlite"-wal 2>/dev/null || true
chmod 666 "$APP_DIR/backend/database/database.sqlite" "$APP_DIR/backend/database/database.sqlite"-shm "$APP_DIR/backend/database/database.sqlite"-wal 2>/dev/null || true
setfacl -R -m u:apache:rwx "$APP_DIR/backend/database" 2>/dev/null || true
chown -R fif:fif "$APP_DIR/worker/auth_info" 2>/dev/null || true
chmod 700 "$APP_DIR/worker/auth_info" 2>/dev/null || true
# Worker needs read-write access to SQLite DB + read access to bootstrap/cache
setfacl -R -m u:fif:rwx "$APP_DIR/backend/database/database.sqlite" 2>/dev/null || true
setfacl -R -m u:fif:r "$APP_DIR/backend/storage" 2>/dev/null || true
setfacl -R -m u:fif:rx "$APP_DIR/backend/bootstrap" 2>/dev/null || true
systemctl stop fif-backend 2>/dev/null || true
systemctl disable fif-backend 2>/dev/null || true
nginx -t
systemctl daemon-reload
systemctl enable --now nginx php-fpm fif-queue fif-worker
systemctl restart nginx fif-queue fif-worker
systemctl --no-pager --full status fif-queue fif-worker

echo "=== Deploy complete ==="
