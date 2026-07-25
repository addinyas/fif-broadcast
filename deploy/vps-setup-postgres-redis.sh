#!/bin/bash
# PostgreSQL + Redis Setup Script for FIF VPS
# Run: ssh root@202.10.42.237 "bash /var/www/fif/deploy/vps-setup-postgres-redis.sh"
set -euo pipefail

echo "========================================="
echo "  PostgreSQL + Redis Setup for FIF"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""

# --- 1. Install PostgreSQL ---
echo ">>> Installing PostgreSQL 16..."
dnf install -y postgresql16-server postgresql16 2>/dev/null || \
  yum install -y postgresql-server postgresql 2>/dev/null || \
  echo "PostgreSQL install attempted"

# Initialize if needed
if [ ! -d "/var/lib/pgsql/16/data" ] && [ ! -d "/var/lib/postgresql/16/main" ]; then
  postgresql-setup --initdb 2>/dev/null || true
fi

# Start & enable
systemctl enable postgresql 2>/dev/null || true
systemctl start postgresql 2>/dev/null || true
echo "PostgreSQL: $(systemctl is-active postgresql 2>/dev/null || echo 'status check')"

# --- 2. Create FIF Database + User ---
echo ">>> Setting up FIF database..."
export PGHOST=/var/run/postgresql
export PGUSER=postgres

# Create database user
sudo -u postgres psql -c "CREATE USER fif WITH PASSWORD '\$2y\$10\$FIFbroadcast2026!fifdb#';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE fif OWNER fif;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER fif CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fif TO fif;" 2>/dev/null || true

# --- 3. Configure PostgreSQL for FIF ---
echo ">>> Configuring PostgreSQL..."
PG_CONFIG="/var/lib/pgsql/16/data/postgresql.conf"
PG_HBA="/var/lib/pgsql/16/data/pg_hba.conf"

# Find the actual config location
PG_CONFIG=$(su - postgres -c "psql -c 'SHOW config_file;'" -t -A 2>/dev/null)
PG_HBA=$(su - postgres -c "psql -c 'SHOW hba_file;'" -t -A 2>/dev/null)

if [ -f "$PG_CONFIG" ]; then
  sed -i 's/^#listen_addresses = .*/listen_addresses = '\''localhost'\''/' "$PG_CONFIG" 2>/dev/null || true
  sed -i 's/^max_connections = .*/max_connections = 100/' "$PG_CONFIG" 2>/dev/null || true
  sed -i 's/^shared_buffers = .*/shared_buffers = '\''256MB'\''/' "$PG_CONFIG" 2>/dev/null || true
  sed -i 's/^effective_cache_size = .*/effective_cache_size = '\''1GB'\''/' "$PG_CONFIG" 2>/dev/null || true
  sed -i 's/^work_mem = .*/work_mem = '\''16MB'\''/' "$PG_CONFIG" 2>/dev/null || true
  sed -i 's/^wal_level = .*/wal_level = '\''replica'\''/' "$PG_CONFIG" 2>/dev/null || true
  sed -i 's/^max_wal_size = .*/max_wal_size = '\''1GB'\''/' "$PG_CONFIG" 2>/dev/null || true
fi

echo "PostgreSQL configured."

# --- 4. Install Redis ---
echo ">>> Installing Redis..."
dnf install -y redis 2>/dev/null || \
  yum install -y redis 2>/dev/null || \
  echo "Redis install attempted"

systemctl enable redis 2>/dev/null || true
systemctl start redis 2>/dev/null || true
echo "Redis: $(systemctl is-active redis 2>/dev/null || echo 'status check')"

# --- 5. Configure Redis for FIF ---
echo ">>> Configuring Redis..."
REDIS_CONF="/etc/redis.conf"
if [ -f "$REDIS_CONF" ]; then
  sed -i 's/^maxmemory .*/maxmemory 256mb/' "$REDIS_CONF" 2>/dev/null || true
  sed -i 's/^maxmemory-policy .*/maxmemory-policy allkeys-lru/' "$REDIS_CONF" 2>/dev/null || true
fi

systemctl restart redis 2>/dev/null || true

# --- 6. Test connections ---
echo ""
echo "=== Connection Tests ==="
PGPASSWORD='fifbroadcast2026' psql -h localhost -U fif -d fif -c "SELECT 1;" 2>/dev/null && echo "PostgreSQL: ✅ Connected" || echo "PostgreSQL: ❌ Failed"
redis-cli ping 2>/dev/null && echo "Redis: ✅ Connected" || echo "Redis: ❌ Failed"

echo ""
echo "========================================="
echo "  PostgreSQL + Redis Setup Complete"
echo "  Database: fif (user: fif)"
echo "  Redis: localhost:6379"
echo "========================================="
