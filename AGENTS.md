# FIF (Finance Installment Follow-up)

WhatsApp broadcast system: Laravel 12 API backend, React 19 + Vite 8 frontend, Node.js WhatsApp worker.

## Directory ownership

| Dir | Tech | Entrypoint |
|-----|------|------------|
| `backend/` | Laravel 12, PHP 8.2, SQLite | `routes/api.php` (routes), `public/index.php` |
| `frontend/` | React 19, TS, Vite 8, TailwindCSS 4 | `src/main.tsx` → `App.tsx` |
| `worker/` | Node.js (CommonJS), Baileys WhatsApp | `src/index.js` |

## Dev commands

**Backend** (run from `backend/`):
- `composer run dev` — concurrently runs 3 processes: `php artisan serve` (8000), `queue:listen --tries=1 --timeout=0`, `npm run dev` (Vite)
- `composer run test` — PHPUnit (`:memory:` SQLite, `QUEUE_CONNECTION=sync`)
- `composer run setup` — full first-time setup (composer install, .env, key:generate, migrate, npm install, npm build)
- `php artisan migrate` — run migrations
- `php artisan db:seed` — seed default accounts (4 users)
- `./vendor/bin/pint` — PHP formatting (Laravel Pint)

**Frontend** (run from `frontend/`):
- `npm run dev` — Vite dev server on port 5173, proxies `/api` → `http://localhost:8000`
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — **oxlint**, not ESLint
- `npm run preview` — Vite preview

**Worker** (run from `worker/`):
- `npm run start` / `npm run dev` — `node src/index.js`
- `.env` controls: `DB_PATH`, `SOCKET_PORT` (3001), `SOCKET_PATH`, `POLL_INTERVAL_MS` (5000), `MIN_DELAY_SEC` (60), `MAX_DELAY_SEC` (180), `MAX_CONNECTION_HOURS` (8)
- **WA auto-disconnect**: After `MAX_CONNECTION_HOURS` (default 8), worker force-disconnects and clears auth to force QR re-scan. Stale connections cleaned on worker startup too.

## Architecture notes

- **Auth**: Sanctum token + Google OAuth (Socialite). Roles on `users.role`: `superadmin`, `UH`, `marketing`. Role middleware `CheckRole` registered as `role` alias in `bootstrap/app.php`.
- **Default seed accounts**: `superadmin@crm.test`, `admin@crm.test`, `marketing@crm.test`, `marketing2@crm.test` — all password `password`.
- **DB**: SQLite (`database/database.sqlite`). Worker reads/writes directly via `better-sqlite3` with WAL mode (not via API). Worker uses read-only singleton + per-query writable connections.
- **Queue**: Database-driven (`QUEUE_CONNECTION=database`). Backend inserts `broadcast_histories`, worker polls every 5s, processes 5 per batch with 60–180s random delay between sends (anti-ban).
- **Daily limit**: 150 sent messages per user per day, enforced in `BroadcastService::prepare()`. Reset otomatis jam 00:00.
- **Retry**: Worker retries failed messages up to 3x (`retry_count` column). Transient failures recover automatically.
- **Real-time**: Worker runs its own Socket.IO server (port 3001). Frontend connects via socket.io-client (websocket + polling transports). Events: `broadcast:status` (processing/sent/failed), `wa:status` (awaiting_scan/connected/logged_out), `broadcast:pending_stuck` (pending > 5 with no connection).
- **Pattern**: Repository interfaces in `app/Interfaces/`, impls in `app/Repositories/`, bound in `RepositoryServiceProvider` (registered in `bootstrap/app.php`).
- **Template variables**: `#nomor_contract`, `#nama`, `#motor_dan_tahun`, `#plat`, `#angsuran_kurang`, `#input_angsuran`, `#dinego_jadi`, `#pinjaman`, `#pelunasan`, `#terima`, `#tenor`, `#sisa_angsuran`.
- **WA Client**: Baileys `makeWASocket` with `useMultiFileAuthState` in `auth_info/`, exponential backoff reconnect (2^attempt, capped 30s). QR code dikirim ke frontend via Socket.IO (`wa:status` event) dan ditampilkan di halaman `/admin/connect` atau `/marketing/connect`.

## API route groups

| Prefix | Middleware | Roles |
|--------|-----------|-------|
| `/auth/*` | none / sanctum | public / authenticated |
| `/customers/*`, `/templates/*`, `/assignments/*` | `role:superadmin,UH` | superadmin, UH |
| `/customers/assigned-to-me` | `role:marketing` | marketing |
| `/broadcast/history`, `/broadcast/stats` | `role:superadmin,UH,marketing` | all roles |
| `/broadcast/prepare` | `role:marketing` | marketing only |
| `/admin/permissions` | `role:superadmin` | superadmin |

## Feature permissions

Superadmin can toggle feature access for UH and marketing roles at `/admin/permissions`. Backend uses `CheckFeature` middleware (`feature:` alias), frontend uses `usePermissions()` hook + `RequireFeature` route guard. Superadmin always has full access.

## App structure

| Dir | Contents |
|-----|----------|
| `backend/app/Services/` | `AuthService`, `BroadcastService`, `CustomerService`, `TemplateService`, `GoogleSheetsService`, `PermissionService` |
| `backend/app/Http/Controllers/Api/` | `AuthController`, `BroadcastController`, `CustomerController`, `TemplateController`, `AssignmentController`, `GoogleSheetsController`, `PermissionController` |
| `backend/app/Http/Middleware/` | `CheckRole` (role:), `CheckFeature` (feature:) |
| `backend/app/Models/` | `User`, `Customer`, `Template`, `BroadcastHistory`, `RolePermission`, `WhatsappConnection` |
| `frontend/src/services/` | `api.ts` (axios), `authService`, `broadcastService`, `customerService`, `templateService`, `socketService`, `permissionService` |
| `frontend/src/hooks/` | `usePermissions.ts` |
| `frontend/src/pages/admin/` | `DashboardPage`, `CustomerManagementPage`, `TemplateManagementPage`, `UserManagementPage`, `PermissionManagementPage` |
| `frontend/src/pages/marketing/` | `ProspectListPage`, `BroadcastFormPage`, `BroadcastHistoryPage`, `QRScannerPage` |
| `worker/src/` | `index.js` (entry), `wa-client.js` (Baileys), `queue-consumer.js` (poll + send), `db.js` (SQLite), `socket-server.js` (Socket.IO) |

## Testing quirks

- Backend tests use in-memory SQLite (`:memory:`) with `QUEUE_CONNECTION=sync` — no external DB, no services needed.
- Frontend and worker have no test framework configured.

## Frontend quirks

- Linting uses **oxlint** (`npm run lint`) — do not add ESLint config. Plugins: react, typescript, oxc. Rules: `react/rules-of-hooks`, `react/only-export-components`.
- TypeScript strict: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` are errors.
- `verbatimModuleSyntax` is on — use `import type` for type-only imports.
- TailwindCSS v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed.
- No `.env` file needed (Vite proxy handles `/api` routing). Socket URL from `VITE_SOCKET_URL` env var, defaults to `http://localhost:3001`.

## Deployment

### VPS Details

| Info | Value |
|------|-------|
| **Provider** | Rumahweb |
| **IP** | `202.10.42.237` |
| **Hostname** | `vps.fif-broadcast.net` |
| **OS** | AlmaLinux 8.9 |
| **SSH** | `ssh root@202.10.42.237` (key auth, port 22, password `r8I3%PL1KOA#4X`) |
| **App dir** | `/var/www/fif` (monorepo root) |
| **Frontend dist** | `/var/www/fif/frontend/dist` (served by nginx) |
| **Worker auth** | `/var/www/fif/worker/auth_info/` (Baileys auth) |

### Systemd Services

| Service | Command | Port |
|---------|---------|------|
| `fif-queue` | `php artisan queue:listen --tries=1 --timeout=0` | - |
| `fif-worker` | `npm run start` (from `worker/`) | 3001 (Socket.IO) |

> **Note:** `fif-backend.service` dihapus. Backend dilayani langsung oleh **PHP-FPM** (unix socket `/run/php-fpm/www.sock`), bukan `php artisan serve`. PHP-FPM sudah terinstall & running dengan 5 worker processes.

### Nginx

Reverse proxy di `/etc/nginx/conf.d/fif.conf`:
- `/api` -> **PHP-FPM `fastcgi_pass unix:/run/php-fpm/www.sock`** (timeout 300s)
- `/socket.io/` -> `127.0.0.1:3001` (WebSocket, timeout 86400s)
- `/storage` -> `backend/public/storage`
- `client_max_body_size 20M`

PHP-FPM menggantikan `php artisan serve` — handle **5 concurrent requests** (sebelumnya 1).

### Deploy Script

`deploy/deploy-vps.sh` — jalankan via SSH:

```bash
ssh root@202.10.42.237 "bash /var/www/fif/deploy/deploy-vps.sh"
```

Script ini **smart** — hanya rebuild bagian yang berubah:

| Perubahan di | Yang dijalankan |
|---|---|
| `backend/composer.json` atau `composer.lock` | `composer install --no-dev --optimize-autoloader` |
| `backend/*` | migrate, config:cache, route:cache, view:clear |
| `frontend/*` | `npm install && npm run build` |
| `worker/*` | `npm install` |
| Tidak ada perubahan | Exit 0 (tidak ngapa-ngapain) |

Nginx config, PHP upload limits, dan systemd services selalu ditulis ulang (fast).
Semua service di-restart setiap deploy via `systemctl restart nginx fif-queue fif-worker`.
`fif-backend.service` dihentikan & dinonaktifkan (tidak dipakai lagi).

### Auto-deploy

Belum ada CI/CD. Deploy masih manual via SSH + script.

## Session History

### 2026-07-10 — SQLite fix + smart deploy + performance + kalkulator denda

**Pushed to GitHub ✅**
- `CustomerRepository.php`: chunk `no_contract` duplicate check (batches of 500) — fix SQLite 999-variable limit
- `deploy/deploy-vps.sh`: smart deploy (skip build jika tidak ada perubahan), switch `php artisan serve` → PHP-FPM, hapus `fif-backend.service`
- `AGENTS.md`: added Deployment section (VPS info, systemd, nginx, auto-deploy)

**Local only (not pushed) ⏸️**
- `CustomerManagementPage`: `per_page: 500 → 50` — ringankan payload & render
- `App.tsx`: code splitting via `React.lazy()` — bundle split: vendor (182KB), app (122KB), per-page (1-35KB), socket (41KB)
- `vite.config.ts`: `manualChunks` function — pisahkan vendor, socket, ui ke chunk terpisah
- `BroadcastStatusBanner.tsx`: `socket.disconnect()` → `socket.off()` — tidak disconnect tiap ganti halaman
- `UserManagementPage.tsx`: hapus `setInterval(fetchUsers, 30000)` — tidak polling tiap 30 detik
- `CalculatorPage.tsx`: tambah input **Denda** (opsional) — ditambahkan ke pelunasan, ditampilkan inline di "Angsuran Kurang" sebagai `+ Rp ...`
- `CalculatorPage.tsx`: output copy-to-clipboard tanpa enter antara Pinjaman/Pelunasan/Terima
- `CalculatorPage.tsx`: nopol tanpa spasi (`AB 5678 EAF` → `AB5678EAF`)
- `CalculatorPage.tsx`: `Tahun` → `thn`, `Pinjaman Maksimal Cair` → `Pinjaman Maksimal`
- `CalculatorPage.tsx`: tambah tampilan **CORI** dan **Vcode** di output card & copy-to-clipboard (read-only dari `dynamic_data`)
- `CalculatorPage.tsx`: tambah field CORI (dropdown) & Vcode (input) di form manual input
- `CalculatorPage.tsx`: rincian output hanya muncul jika semua field wajib terisi (Pelunasan Nego & Denda opsional)

### Next steps when resuming
1. Push local changes → `git push origin main`
2. Deploy to VPS via SSH: `bash /var/www/fif/deploy/deploy-vps.sh`
3. Test import spreadsheet (9114 rows) — SQLite harusnya tidak error lagi
4. Test website feels faster (code splitting, PHP-FPM, per_page 50)

### 2026-07-11 (malam) — Railway/Docker cleanup

**Belum di-push ⏸️**
- Hapus file deployment yang tidak relevan: `.dockerignore`, `Dockerfile`, `backend/.dockerignore`, `backend/Dockerfile`, `nginx.conf`, `start.sh`
- `AGENTS.md`: cleanup 29 baris (hapus referensi Railway/Docker)
- Alasan: deploy sudah pindah ke VPS (`deploy/deploy-vps.sh` + PHP-FPM + nginx), Docker/Railway tidak dipakai lagi

### Next steps when resuming
1. Push local changes → `git push origin main`
2. Deploy ke VPS: `bash /var/www/fif/deploy/deploy-vps.sh`

### 2026-07-11 (sore) — Feature permission middleware on backend routes

**Sudah di-push ✅**
- `backend/routes/api.php`: `feature:qr_scanner` ditambahkan ke `whatsapp/*` routes, `feature:user_management` ditambahkan ke `admin/users` routes
- Backend sekarang konsisten dengan frontend (3-layer permission: seeder → backend middleware → frontend guards)

### Next steps when resuming
1. Push local changes → `git push origin main`
2. Deploy ke VPS: `bash /var/www/fif/deploy/deploy-vps.sh`

### 2026-07-11 — Cross-check: Fitur Customers untuk role UH & marketing (BUG DITEMUKAN)

**Status: BELUM DIPERBAIKI, menunggu konfirmasi user**

#### Bug 1 (Critical): Route `GET /customers` & `GET /customers/{id}` ter-shadow — marketing dapat 403

**Root cause**: `apiResource('customers')` di `api.php:48` mendaftarkan route `GET /customers` (index) dan `GET /customers/{id}` (show) dengan middleware `role:superadmin,UH`. Route marketing-accessible di `api.php:74-75` mendaftarkan route yang SAMA (`GET /customers`, `GET /customers/{id}`) dengan middleware `role:superadmin,UH,marketing`, tapi **tidak pernah tercapai** karena Laravel menggunakan route PERTAMA yang match.

| Route | Line pertama (shadow) | Line kedua (dead) |
|-------|----------------------|-------------------|
| `GET /customers` | 48: `role:superadmin,UH` | 74: `role:superadmin,UH,marketing` ❌ |
| `GET /customers/{id}` | 49: `role:superadmin,UH` | 75: `role:superadmin,UH,marketing` ❌ |

**Akibat**: Marketing users tidak bisa list/detail customers — selalu dapat 403.

**Fix**: Ubah `apiResource` di line 48 menjadi `->only(['store', 'update', 'destroy'])` atau `->except(['index', 'show'])`. Route index dan show hanya boleh ada di group `role:superadmin,UH,marketing` (line 66-81).

#### Bug 2 (Medium): `GET /admin/marketing-users` hanya bisa diakses superadmin/UH

**Root cause**: Route di `api.php:61` hanya di group `role:superadmin,UH`, tapi frontend `CustomerManagementPage.tsx:91` memanggilnya tanpa guard `isAdmin`:

```tsx
useEffect(() => {
    customerService.getMarketingUsers().then(setAllMarketingUsers); // selalu dipanggil
}, []);
```

**Akibat**: Marketing users dapat error 403 saat load page Customers (silent failure, tapi fungsi filter MCE tidak jalan).

**Fix**: 
- Backend: Pindahkan route `admin/marketing-users` ke group `role:superadmin,UH,marketing` + `feature:customer_management` (line 66-81), ATAU
- Frontend: Guard dengan `if (isAdmin)` sebelum memanggil `getMarketingUsers()`

#### Bug 3 (Low): Route duplicate — `GET /customers` dan `GET /customers/{id}` terdaftar 2x

`apiResource` (line 48) + explicit route (line 49/74/75) membuat route yang sama terdaftar 2x. Route kedua (marketing-accessible) menjadi dead code.

#### Feature access matrix setelah fix

| Endpoint | Superadmin | UH | Marketing |
|----------|-----------|-----|-----------|
| `GET /customers` (index) | ✅ | ✅ | ✅ |
| `GET /customers/{id}` (show) | ✅ | ✅ | ✅ |
| `POST /customers` (store) | ✅ | ✅ | ❌ |
| `PUT /customers/{id}` (update) | ✅ | ✅ | ❌ |
| `DELETE /customers/{id}` (destroy) | ✅ | ✅ | ❌ |
| `POST /customers/marketing-add` | ✅ | ✅ | ✅ |
| `DELETE /customers/{id}/manual-entry` | ✅ | ✅ | ✅ |
| `PATCH /customers/{id}/cori` | ✅ | ✅ | ✅ |
| `POST /customers/import*` | ✅ | ✅ | ❌ |
| `POST /assignments/*` | ✅ | ✅ | ❌ |
| `GET /admin/marketing-users` | ✅ | ✅ | ✅ (setelah fix) |

#### Files yang perlu diubah

1. **`backend/routes/api.php`**: 
   - Line 48: `apiResource('customers')` → `apiResource('customers')->only(['store', 'update', 'destroy'])`
   - Line 61: `admin/marketing-users` pindah ke group marketing-accessible (line 66-81)
   
2. **`frontend/src/pages/admin/CustomerManagementPage.tsx`**:
   - Line 90-92: Guard `getMarketingUsers()` dengan `isAdmin`

### Next steps when resuming
1. Fix Bug 1: ubah `apiResource` → `apiResource()->only(['store', 'update', 'destroy'])`
2. Fix Bug 2: pindahkan `admin/marketing-users` ke group `role:superadmin,UH,marketing`
3. Fix Bug 3 (frontend): guard `getMarketingUsers()` dengan `if (isAdmin)`
4. Test: login sebagai marketing → buka /marketing/customers → pastikan bisa list customers
5. Test: login sebagai UH → buka /admin/customers → pastikan semua fitur masih jalan
6. Push → deploy ke VPS

### 2026-07-11 — Broadcast reliability fix + connection safety + NotificationBell progress

**Root causes fixed:**
1. Frontend delay 30-120s removed (INSERT-only delay, no impact on actual send rate)
2. Worker delay changed 5-15s → 60-180s (anti-ban: user confirmed 35-93s still got banned)
3. `onWhatsApp()` check removed (rate-limit trigger, causes mass failures)
4. Retry mechanism added (max 3x, transient failures recover)
5. SQLite busy_timeout + WAL checkpoint (reduce SQLITE_BUSY errors)
6. Optimized `ORDER BY RANDOM()` query (faster for large datasets)
7. Completed `interpolateMessage()` (all template variables now replaced)
8. Daily limit 200 → 150 (more conservative)
9. Connection safety: auto-stop on disconnect, pending_stuck event, warning banner
10. NotificationBell: aggregate counter (X terkirim, Y gagal, Z pending)
11. Progress bar: now shows worker-side progress (not INSERT progress)

**Files changed:**
- `worker/.env`: MIN_DELAY_SEC=60, MAX_DELAY_SEC=180
- `worker/src/wa-client.js`: removed onWhatsApp check
- `worker/src/db.js`: added busy_timeout=5000, wal_autocheckpoint=1000
- `worker/src/queue-consumer.js`: retry mechanism, optimized query, emit pending_stuck
- `backend/database/migrations/2026_07_11_000001_add_retry_count_to_broadcast_histories.php`: new
- `backend/app/Services/BroadcastService.php`: daily limit 150
- `frontend/src/pages/marketing/ProspectListPage.tsx`: remove delay UI, update progress bar, complete interpolateMessage, auto-stop on disconnect
- `frontend/src/components/ui/NotificationBell.tsx`: aggregate counter
- `frontend/src/components/ui/BroadcastStatusBanner.tsx`: disconnect warning banner

### Next steps when resuming
1. Push local changes → `git push origin main`
2. Deploy to VPS via SSH: `bash /var/www/fif/deploy/deploy-vps.sh`
3. Jalankan migration: `php artisan migrate` (kolom `retry_count`)
4. Restart worker di VPS setelah deploy

### Troubleshooting: WhatsApp Ban / Blokir

**Pertanyaan kunci saat uji lapangan — ditanyakan ke user:**
> "Dari 10 pesan yang dikirim, berapa yang merespon?"

| Respons | Arti | Aksi |
|---------|------|------|
| 7-10 merespon | Pesan terkirim & terbaca, delay aman | Tidak perlu ubah apapun |
| 4-6 merespon | Pesan terkirim tapi ada yang terkena spam filter | Pertimbangkan naikkan delay (120-300s) |
| 1-3 merespon | Pesan terkirim tapi banyak masuk spam/restricted | Naikkan delay signifikan (180-600s), kurangi volume harian |
| 0 merespon & ada yang "gagal" di notif | Pesan TIDAK terkirim / account restricted | Stop broadcast, ganti nomor WA, naikkan delay ke 300-900s |
| 0 merespon & semua "terkirim" | Pesan terkirim tapi tidak terbaca (bukan blokir) | Bukan masalah delay — cek konten pesan, timing kirim (jam berapa) |

**Jika masih kena blokir meskipun delay 60-180s:**
1. Cek: apakah semua pesan statusnya "terkirim" atau ada yang "gagal"?
2. Jika semua terkirim → delay sudah cukup, blokir mungkin dari nomor WA yang sudah lama tidak aktif atau konten pesan
3. Jika banyak gagal → naikkan delay lagi: `MIN_DELAY_SEC=180`, `MAX_DELAY_SEC=600`
4. Pertimbangkan: kirim di jam kerja (09:00-17:00), hindari malam/minggu
5. Pertimbangkan: variasi pesan (tambah randomisasi teks per customer)

**Anti-ban strategy reference:**
- Delay saat ini: 60-180 detik (3-4 pesan/jam)
- Daily limit: 150 pesan/hari
- Batch pause: worker otomatis delay antar pesan
- Jika perlu lebih aman: naikkan ke 120-300 detik (2-3 pesan/jam, ~70-100/hari)

## Push & Deploy Workflow

### Sebelum Push ke GitHub
1. Cek status: `git status` dan `git diff`
2. Tambah file: `git add <file>`
3. **Wajib commit message yang jelas**, format Conventional Commits:
   - `feat: <fitur baru>`
   - `fix: <bug fix>`
   - `refactor: <perubahan struktur>`
   - `chore: <maintenance>`
4. Push: `git push origin main`

### Sebelum Deploy ke VPS
1. Pastikan sudah di-push ke GitHub
2. Jalankan: `ssh root@202.10.42.237 "bash /var/www/fif/deploy/deploy-vps.sh"`
3. **Wajib update AGENTS.md** — tambahkan rincian di "Session History"

### Format Rincian di Session History
```markdown
### YYYY-MM-DD — <Judul Singkat>

**Sudah di-push ✅**
- `<File>`: <deskripsi perubahan>

**Belum di-push ⏸️**
- `<File>`: <deskripsi perubahan>

### Next steps
1. <langkah selanjutnya>
```
