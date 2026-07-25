# Panduan Migrasi: SQLite → PostgreSQL + Redis

## Prasyarat (di VPS Rumahweb 202.10.42.237)
- Akses SSH root ke VPS
- Backup database SQLite sudah di-copy ke lokal
- Backend Laravel masih jalan normal

## Daftar Perubahan (sesuai PRD)
Perubahan yang dilakukan migrasi ini:
| No | Item | Status |
|----|------|--------|
| 1 | Install PostgreSQL 16 | Baru |
| 2 | Install Redis 7 | Baru |
| 3 | Konversi SQLite database ke PostgreSQL | Baru |
| 4 | Update Laravel .env → DB_CONNECTION=pgsql | Ubah |
| 5 | Update .env → tambah Redis config (sudah ada tapi verifikasi) | Ubah |
| 6 | Tambah Redis config ke Laravel (SESSION/QUEUE/CACHE/REDIS) | Tambah |
| 7 | Tambah Redis adapter untuk Socket.IO | Baru |
| 8 | Restart semua service | Eksekusi |
| 9 | Verifikasi semua endpoint & WebSocket | Verifikasi |

## Step-by-Step

### STEP 1: Backup (Wajib)
Sebelum apapun, backup dulu.
```bash
ssh root@202.10.42.237
cp /var/www/fif/backend/database/database.sqlite /var/www/fif/backend/database/database.sqlite.bak
cp /var/www/fif/backend/.env /var/www/fif/backend/.env.bak
cp /var/www/fif/backend/database/migrations /var/www/fif/backend/database/migrations.bak -r
mkdir -p /var/www/fif/backups/$(date +%Y%m%d_%H%M%S)
cp /var/www/fif/backend/database/database.sqlite /var/www/fif/backups/$(date +%Y%m%d_%H%M%S)/
cp /var/www/fif/backend/.env /var/www/fif/backups/$(date +%Y%m%d_%H%M%S)/
```

Jika terjadi kesalahan saat migrasi, rollback:
```bash
cp /var/www/fif/backups/YYYYMMDD_HHMMSS/database.sqlite /var/www/fif/backend/database/database.sqlite
cp /var/www/fif/backups/YYYYMMDD_HHMMSS/.env /var/www/fif/backend/.env
systemctl restart php-fpm nginx
```

### STEP 2: Install PostgreSQL 16
```bash
dnf install -y postgresql16-server postgresql16
postgresql-setup --initdb
systemctl enable postgresql
systemctl start postgresql
systemctl is-active postgresql  # harusnya aktif
```

### STEP 3: Buat Database & User FIF
```bash
sudo -u postgres psql -c "CREATE USER fif WITH PASSWORD 'ganti_dengan_password_aman';"
sudo -u postgres psql -c "CREATE DATABASE fif OWNER fif;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fif TO fif;"
```

### STEP 4: Optimasi PostgreSQL untuk FIF
```bash
PG_CONFIG=$(sudo -u postgres psql -t -A -c "SHOW config_file;")
sed -i 's/^#listen_addresses = .*/listen_addresses = '\''localhost'\''/' "$PG_CONFIG"
sed -i 's/^max_connections = .*/max_connections = 100/' "$PG_CONFIG"
sed -i 's/^shared_buffers = .*/shared_buffers = '\''256MB'\''/' "$PG_CONFIG"
sed -i 's/^effective_cache_size = .*/effective_cache_size = '\''1GB'\''/' "$PG_CONFIG"
sed -i 's/^work_mem = .*/work_mem = '\''16MB'\''/' "$PG_CONFIG"
systemctl restart postgresql
```

### STEP 5: Install PHP PostgreSQL Driver
```bash
dnf install -y php-pgsql
systemctl restart php-fpm
```

### STEP 6: Konversi Database SQLite → PostgreSQL
Cara 1: Export SQL dari SQLite, lalu import ke PostgreSQL
```bash
sqlite3 /var/www/fif/backend/database/database.sqlite ".schema" > /tmp/schema.sql
# Modifikasi schema.sql agar kompatibel PostgreSQL (Hapus AUTOINCREMENT → GENERATED ALWAYS AS IDENTITY)
sudo -u postgres psql -d fif -f /tmp/schema.sql
```

Cara 2: Menggunakan Laravel migrate:fresh + seed ulang (aman, tapi data dari seeder perlu dijalankan ulang)
```bash
cd /var/www/fif/backend
export DB_CONNECTION=pgsql
export DB_HOST=127.0.0.1
export DB_DATABASE=fif
export DB_USERNAME=fif
export DB_PASSWORD=<password>
export DB_PORT=5432
# Data lama SQLite harus di-migrate manual (lihat STEP 7)
```

Cara 3: Gunakan package `laravel-postgres-migrate` atau script konversi data (direkomendasikan untuk data besar) — lihat STEP 7.

### STEP 7: Migrasi Data (PENTING)
Ini langkah paling kritis. Jangan skip.

**Opsi A — Tabel kecil (< 10.000 rows):**
```bash
# Export tiap tabel dari SQLite
sqlite3 /var/www/fif/backend/database/database.sqlite ".mode insert" ".dump users" > /tmp/users.sql
sqlite3 /var/www/fif/backend/database/database.sqlite ".mode insert" ".dump customers" > /tmp/customers.sql
# ... dst.

# Import ke PostgreSQL
sudo -u postgres psql -d fif -f /tmp/users.sql
sudo -u postgres psql -d fif -f /tmp/customers.sql
# ... dst.
```

**Opsi B — Tabel besar (broadcast_histories, customer_sent_marks):**
Gunakan chunking untuk menghindari memory overflow (SQLite has 999-variable limit pada whereIn):
```bash
# Gunakan Laravel tinker
cd /var/www/fif/backend
php artisan tinker << 'TINKER'
$users = DB::connection('sqlite')->table('users')->get();
DB::connection('pgsql')->table('users')->insert($users->toArray());
TINKER
```

**Opsi C — Backup terakhir jika gagal:**
Kembali ke SQLite (rollback total):
```bash
cp /var/www/fif/backend/database/database.sqlite.bak /var/www/fif/backend/database/database.sqlite
# Kembalikan .env ke SQLite config
cp /var/www/fif/backend/.env.bak /var/www/fif/backend/.env
systemctl restart php-fpm nginx
```

### STEP 8: Update Laravel .env (Konfigurasi Baru)
Ubah /var/www/fif/backend/.env:

```ini
# Ganti dari SQLite → PostgreSQL
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=fif
DB_USERNAME=fif
DB_PASSWORD=<password_dari_step_3>

# Redis config (sudah ada di .env lama, verifikasi)
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Tambahahkan config Redis untuk session/cache/queue (jika belum ada)
BROADCAST_DRIVER=redis
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
```

### STEP 9: Tambah Redis Adapter untuk Socket.IO (Worker)
Worker socket-server.js perlu subscribe ke Redis Pub/Sub agar event dari Laravel terdistribusi ke semua Socket.IO client.

Tambahkan di worker/src/socket-server.js (di atas createServer):
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const pubClient = createClient({ url: 'redis://127.0.0.1:6379' });
const subClient = pubClient.duplicate();
await pubClient.connect();
await subClient.connect();
io.adapter(createAdapter(pubClient, subClient));
```

Instal dependency:
```bash
cd /var/www/fif/worker
npm install @socket.io/redis-adapter redis
```

### STEP 10: Restart Semua Service
```bash
systemctl restart php-fpm
systemctl restart redis
systemctl restart nginx
# Restart worker Node.js
pkill -f "node src/index.js" 2>/dev/null || true
cd /var/www/fif/worker
nohup node src/index.js &>/var/log/fif-worker.log &
# Restart socket-server jika terpisah
pkill -f "socket-server" 2>/dev/null || true
cd /var/www/fif/worker
nohup node src/socket-server.js &>/var/log/fif-socket.log &
```

### STEP 11: Verifikasi
Jalankan semua test berikut:
```bash
# 1. PostgreSQL connection
sudo -u postgres psql -d fif -c "SELECT 1;"

# 2. Redis connection
redis-cli ping
# Expected: PONG

# 3. Laravel DB connection
cd /var/www/fif/backend
php artisan tinker -e "DB::connection()->getPdo();"
# Expected: object tanpa error

# 4. Test endpoint API
curl -s http://127.0.0.1:8000/api/health
# Expected: JSON response tanpa error 500

# 5. Test WebSocket
npx wscat -c ws://127.0.0.1:3001/socket.io/?EIO=4&transport=websocket

# 6. Test broadcast via API
curl -s -X POST http://127.0.0.1:8000/api/broadcast/prepare \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"TEST","message":"test"}'

# 7. Cek broadcast_histories di PostgreSQL (bukan SQLite)
sudo -u postgres psql -d fif -c "SELECT COUNT(*) FROM broadcast_histories;"
# Expected: angka yang sama dengan sebelum migrasi

# 8. Cek Redis data
redis-cli KEYS "*"
# Expected: ada beberapa keys (cache Laravel, session)
```

### STEP 12: Hapus SQLite Config (Opsional, Setelah 1 Minggu Stabil)
Setelah yakin PostgreSQL berjalan stabil selama 1 minggu:
1. Hapus file database.sqlite lama (atau rename ke .bak)
2. Hapus config SQLite dari config/database.php (hapus sqlite block)
3. Hapus .env variables DB_DATABASE (SQLite path)
4. Hapus file cache Laravel lama: `php artisan cache:clear`
5. Hapus route cache lama: `php artisan route:clear`
6. Hapus config cache lama: `php artisan config:clear`

**JANGAN hapus SQLite database sampai yakin PostgreSQL 100% stable.**

### STEP 13: Update deploy script
Perbarui deploy/deploy-vps.s
