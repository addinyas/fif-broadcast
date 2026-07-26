# FIF (Finance Installment Follow-up)

WhatsApp broadcast system: Laravel 12 API backend, React 19 + Vite 8 frontend, Node.js WhatsApp worker.

## Resume Command

**Untuk melanjutkan pekerjaan yang belum selesai, ketik: `lanjut yang tadi`**

## Changelog (Laporan Update)

Format: `YYYY-MM-DD — Judul Singkat` → `* aksi-aksi` → status diakhir

---

### 2026-07-26 — Panduan migrasi SQLite → PostgreSQL + Redis + perbaikan konfigurasi AI

**Sudah di-push ✅**
- `deploy/migrate-sqlite-to-postgres.md`: panduan 13-step migrasi database
- `opencode.json`: ganti 9router (mati) → OpenRouter provider (free tier)
- `opencode.json`: model default Ling 3.0 Flash (124B MoE, unlimited free)
- `deploy/vps-health-check.sh`: script monitoring VPS (services, disk, memory, CPU, opencode status)
- `deploy/vps-setup-postgres-redis.sh`: setup PostgreSQL + Redis di VPS
- `PRD.md`: product requirements document (web Next.js + mobile React Native + DB PostgreSQL + Redis)

**Sudah di-push ✅ (2026-07-26)**
- `scripts/ai-failover.sh`: failover model AI otomatis (lokal)
- Migrasi database SQLite → PostgreSQL (selesai, 9,578 rows termigrasi)
- Redis setup di VPS (selesai, php-redis terinstall, Socket.IO pakai redis adapter)
- PostgreSQL: listen_addresses='*', pg_hba.conf md5 auth, DB=fif, user=fif
- Socket.IO: @socket.io/redis-adapter + redis client terinstall
- Migration fix: `2026_07_13_000003_make_email_nullable_in_users_table.php` dual-driver (SQLite+PG)
- broadcast_histories check constraint: tambah 'cancelled' status

**Sudah di-push ✅ (2026-07-26)**
- Migrasi database SQLite → PostgreSQL (SELESAI, dieksekusi langsung di VPS)
  - 12 tabel termigrasi: customers (8224), broadcast_histories (101), customer_sent_marks (591), customer_shares (500), templates (5), users (10), role_permissions (20), kios (8), notifications (7), whatsapp_connections (6), broadcast_settings (13), personal_access_tokens (184)
  - Total: 9,578 rows
- Redis adapter Socket.IO: @socket.io/redis-adapter + redis client (pub/sub)
- PostgreSQL config: listen_addresses='*', pg_hba.conf md5, DB=fif, user=fif
- PHP extensions: php-pgsql (pdo_pgsql+pgsql), php-pecl-redis5
- Laravel .env: DB_CONNECTION=pgsql, SESSION_DRIVER=redis, QUEUE_CONNECTION=redis, CACHE_STORE=redis
- Broadcast histories check constraint: tambah 'cancelled' status
- Migration fix: `2026_07_13_000003_make_email_nullable_in_users_table.php` dual-driver (SQLite+PG)
- **⚠️ PERLU AUDIT**: Semua perubahan di VPS perlu di-audit sebelum push ke git (perubahan manual di VPS belum di-commit)

### 2026-07-25 — opencode failover + VPS health check

**Sudah di-push ✅**
- `opencode.json`: OpenRouter provider dengan 4 model gratis
- `deploy/vps-health-check.sh`: script monitoring
- Model gratis: Ling Flash, Gemma 4 31B, Laguna M.1, Nemotron Ultra 550B

### 2026-07-13 — 4 bug fixes: Connect race condition + UH cleanup + rolling permission + nopol

**Sudah di-push ✅**
- `socket-server.js`: wa:request_status handler (fix QR expired)
- `socket-server.js`: await disconnect sebelum reconnect
- `QRScannerPage.tsx`: reconnect handler (keep status, don't restart WA)
- `CustomerController.php`: UH delete cleanup (customer_shares + CustomerSentMark + Notification)
- `CustomerShareController.php`: data_rolling permission seed ke DB
- `CalculatorPage.tsx`: autoComplete + inputMode text (fix HP nopol keyboard)

### 2026-07-14 — Broadcast lock + WhatsApp connect stabilization + proxy support + anti-ban

**Sudah di-push ✅**
- Broadcast lock: WA connection gating (3 layer protection)
- Worker: reconnect loop fix (timedOut detection)
- Worker: browser identity WhatsApp/Chrome/120.0.0.0
- Worker: WARP proxy support + warmup delay
- Worker: connectTimeoutMs 15s→30s, keepAlive 25s→180-300s
- Frontend: phone input conversion 08xxx→628xxx

### 2026-07-14 — WhatsApp Ban troubleshooting guide added

**Sudah di-push ✅**
- Troubleshooting table (7 respon → 5 aksi)
- Anti-ban strategy reference table
- Rate-limit mitigation options

### 2026-07-13 — Full codebase audit round 2: 31 fixes

**Sudah di-push ✅ & deployed ✅** (detail di session history lama)

### 2026-07-12 — Full codebase audit + 24 bugs fixed

**Sudah di-push ✅ & deployed ✅** (detail di session history lama)

### 2026-07-11 — Broadcast reliability + connection safety

**Sudah di-push ✅**
- Retry mechanism (max 3x)
- Optimized ORDER BY RANDOM()
- Pending stuck event (pending > 5 no connection)
- Daily limit 200→150
- Session history detail di commit log

### 2026-07-10 — SQLite fix + smart deploy + performance + kalkulator denda

**Sudah di-push ✅** (detail ringkas di session history lama)

---

## Directory Ownership

| Dir | Tech | Entrypoint |
|-----|------|------------|
| `backend/` | Laravel 12, PHP 8.2, PostgreSQL 16 + Redis 7 | `routes/api.php`, `public/index.php` |
| `frontend/` | React 19, TS, Vite 8, TailwindCSS 4 | `src/main.tsx` → `App.tsx` |
| `worker/` | Node.js (CommonJS), Baileys WhatsApp | `src/index.js` |

## Dev commands

**Backend** (run from `backend/`):
- `composer run dev` — concurrently runs php artisan serve (8000), queue:listen, npm run dev (Vite)
- `composer run test` — PHPUnit (:memory: SQLite, QUEUE_CONNECTION=sync)
- `composer run setup` — full first-time setup
- `php artisan migrate` — run migrations
- `php artisan db:seed` — seed default accounts
- `./vendor/bin/pint` — PHP formatting

**Frontend** (run from `frontend/`):
- `npm run dev` — Vite dev server port 5173, proxies /api → localhost:8000
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — **oxlint** (bukan ESLint)
- `npm run preview` — Vite preview

**Worker** (run from `worker/`):
- `npm run start` / `npm run dev` — `node src/index.js`
- `.env` controls: DB_PATH, SOCKET_PORT (3001), POLL_INTERVAL_MS, MIN_DELAY_SEC, MAX_DELAY_SEC

## Architecture notes

- **Auth**: Sanctum token + Google OAuth (Socialite). Roles: `superadmin`, `UH`, `marketing`
- **Default seed**: `superadmin@crm.test`, `admin@crm.test`, `marketing@crm.test`, `marketing2@crm.test` — all password `password`
- **DB**: PostgreSQL 16 (`fif` database via TCP 127.0.0.1:5432). Worker reads/writes directly via `pg` (Node.js)
- **Cache/Queue/Session**: Redis 7 (localhost:6379)
- **Queue**: Redis-driven (QUEUE_CONNECTION=redis)
- **Daily limit**: 150 sent messages per user per day
- **Retry**: Worker retries failed messages up to 3x (`retry_count` column)
- **Real-time**: Worker Socket.IO server (port 3001), events `broadcast:status`, `wa:status`, `broadcast:pending_stuck`
- **Pattern**: Repository interfaces in `app/Interfaces/`, impls in `app/Repositories/`
- **Template variables**: `#nomor_contract`, `#nama`, `#motor_dan_tahun`, `#plat`, `#angsuran_kurang`, `#input_angsuran`, `#dinego_jadi`, `#pinjaman`, `#pelunasan`, `#terima`, `#tenor`, `#sisa_angsuran`
- **WA Client**: Baileys `makeWASocket` with `useMultiFileAuthState`
