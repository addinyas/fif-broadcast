#!/bin/bash
set -e

cd /app/backend

php artisan migrate --force

php artisan serve --host=0.0.0.0 --port=${PORT:-8080} &

php artisan queue:listen --tries=1 --timeout=0 &

cd /app/worker && node src/index.js &

wait -n

exit $?
