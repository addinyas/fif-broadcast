#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/fif"
DOMAIN="${1:-fif-broadcast.net}"
PHP_USER="nginx"

cd "$APP_DIR"

git pull --ff-only

cd "$APP_DIR/backend"
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link || true
mkdir -p storage/framework/views bootstrap/cache
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:clear

cd "$APP_DIR/frontend"
npm install
npm run build

cd "$APP_DIR/worker"
dnf install -y python3 make gcc-c++ gcc-toolset-12-gcc-c++ 2>/dev/null || yum install -y python3 make gcc-c++ gcc-toolset-12-gcc-c++ 2>/dev/null || true
source /opt/rh/gcc-toolset-12/enable 2>/dev/null || true
npm install

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
        proxy_pass http://127.0.0.1:8000/api;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_connect_timeout 300s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location /storage {
        alias /var/www/fif/backend/public/storage;
    }
}
EOF

# Set PHP upload limits for CLI (php artisan serve)
PHP_INI=$(php --ini | grep "Loaded Configuration" | awk '{print $NF}')
if [ -n "$PHP_INI" ]; then
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 20M/' "$PHP_INI" 2>/dev/null || true
    sed -i 's/post_max_size = .*/post_max_size = 25M/' "$PHP_INI" 2>/dev/null || true
    sed -i 's/max_execution_time = .*/max_execution_time = 300/' "$PHP_INI" 2>/dev/null || true
    sed -i 's/max_input_time = .*/max_input_time = 300/' "$PHP_INI" 2>/dev/null || true
    echo "PHP upload limits updated"
fi

cat > /etc/systemd/system/fif-backend.service <<EOF
[Unit]
Description=FIF Laravel Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/fif/backend
ExecStart=/usr/bin/php artisan serve --host=127.0.0.1 --port=8000
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/fif-queue.service <<EOF
[Unit]
Description=FIF Laravel Queue
After=network.target fif-backend.service

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
After=network.target fif-backend.service

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
nginx -t
systemctl daemon-reload
systemctl enable --now nginx php-fpm fif-backend fif-queue fif-worker
systemctl restart nginx fif-backend fif-queue fif-worker
systemctl --no-pager --full status fif-backend fif-queue fif-worker
