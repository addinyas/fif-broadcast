#!/bin/bash
set -e

# Setup database
touch /app/backend/database/database.sqlite

# Laravel setup
cd /app/backend

# Ensure .env exists (variables come from Railway environment)
touch /app/backend/.env
php artisan key:generate --force
php artisan migrate:fresh --force
php artisan db:seed --force 2>/dev/null || true

# Replace nginx port with Railway PORT
NGINX_PORT=${PORT:-8080}
sed -i "s/listen 8080/listen $NGINX_PORT/g" /etc/nginx/sites-enabled/default

# Start Laravel (internal, on port 8000)
php artisan serve --host=127.0.0.1 --port=8000 &

# Start queue worker
php artisan queue:listen --tries=1 --timeout=0 &

# Start WhatsApp worker + Socket.IO
cd /app/worker && node src/index.js &

# Start nginx (frontend + reverse proxy)
nginx -g "daemon off;"
