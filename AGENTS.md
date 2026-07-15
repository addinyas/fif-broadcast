# FIF (Finance Installment Follow-up)

WhatsApp broadcast system: Laravel 12 API backend, React 19 + Vite 8 frontend, Node.js WhatsApp worker.

## Resume Command

**Untuk melanjutkan pekerjaan yang belum selesai, ketik: `lanjut yang tadi`**

Perintah ini berlaku untuk SEMUA session — termasuk fitur baru, bug fix, push/deploy, atau apapun yang tertunda di "Session History". AI akan otomatis membaca AGENTS.md, menemukan session terakhir yang belum selesai, dan melanjutkannya.

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
| `/admin/permissions` | `role:superadmin` (GET open to all, PUT superadmin-only) | superadmin (write), all (read) |

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
| `worker/src/` | `index.js` (entry), `wa-client.js` (Baileys), `queue-consumer.js` (poll + send), `db.js` (SQLite), `socket-server.js` (Socket.IO), `events.js` (emit functions, breaks circular dep) |

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
- `CalculatorPage.tsx`: tambah field CORI (dropdown) & Vcode (input) di form manual input + tampilan di card customer (read-only dari `dynamic_data`)
- `CalculatorPage.tsx`: rincian output hanya muncul jika semua field wajib terisi (Pelunasan Nego & Denda opsional)

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-11 (malam) — Railway/Docker cleanup

**Sudah di-push ✅**
- Hapus file deployment yang tidak relevan: `.dockerignore`, `Dockerfile`, `backend/.dockerignore`, `backend/Dockerfile`, `nginx.conf`, `start.sh`, `fly.toml`
- `AGENTS.md`: cleanup referensi Railway/Docker
- Alasan: deploy sudah pindah ke VPS (`deploy/deploy-vps.sh` + PHP-FPM + nginx), Docker/Railway/Fly.io tidak dipakai lagi

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-11 (sore) — Feature permission middleware on backend routes

**Sudah di-push ✅**
- `backend/routes/api.php`: `feature:qr_scanner` ditambahkan ke `whatsapp/*` routes, `feature:user_management` ditambahkan ke `admin/users` routes
- Backend sekarang konsisten dengan frontend (3-layer permission: seeder → backend middleware → frontend guards)

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-11 — Cross-check: Fitur Customers untuk role UH & marketing

**Status: SUDAH DIPERBAIKI ✅**

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
Ketik: `lanjut yang tadi`

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
Ketik: `lanjut yang tadi`

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

### 2026-07-12 — Full codebase audit + 24 bugs fixed

**Sudah di-push & deployed ✅**

**Critical (Worker):**
- `queue-consumer.js`: fix import — `sendMessage` from `wa-manager` (was undefined from `wa-client`)
- `wa-client.js`: auto-disconnect sets `intentionalDisconnect` flag, skip reconnect in close handler
- `queue-consumer.js`: add `processing` guard to prevent concurrent `processPending` double-sends
- `wa-client.js`: move `reconnectAttempts`/`reconnecting` to shared `reconnectState` Map (backoff no longer resets)

**Critical (Backend):**
- `CustomerController.php`: `byNoContract` use parameterized LIKE + `json_extract` (was SQL injection)
- `CustomerController.php`: `store`/`update` use `$request->only()` (was `$request->all()` — mass assignment)

**High (Frontend):**
- `usePermissions.ts`: `clearPermissionsCache()` exported, called on logout (was cross-session permission leak)
- `AuthContext.tsx`: init user from localStorage, skip redundant `/auth/me` on login

**Medium (Frontend):**
- `BroadcastFormPage.tsx`: use `replaceAll()` for template variables (was first-match-only)
- `BroadcastStatusBanner.tsx`: link uses role-based path (was hardcoded `/marketing/connect`)
- `App.tsx`: add `ErrorBoundary` for lazy routes (was crash on chunk failure)
- `api.ts`: skip 401 redirect if already on login/register

**Low (Worker):**
- All worker files: `DB_PATH` resolved to absolute path
- `index.js`: exit code 1 on crash (was 0)
- `index.js`: `unhandledRejection` triggers shutdown
- `socket-server.js`: remove dead `onDisconnectRequest` variable

**Low (Backend):**
- `CustomerController.php`: remove internal exception messages from API responses
- `BroadcastService.php`: `not_broadcast_count` uses distinct customer_id (was total rows)
- `CustomerController.php`: `destroyManual` checks ownership for marketing users

**Low (Frontend):**
- `NotificationBell.tsx`: use counter suffix for unique notification IDs
- `CustomerManagementPage.tsx`: extract duplicated pagination IIFE to `Pagination` component

**Sengaja di-skip (intentional design):**
- #2: Privilege escalation registration — superadmin hanya via seeder/manual
- #10: Hard delete bypass SoftDeletes — intentional untuk monthly refresh

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-12 — User Management: Terakhir Connect & Terakhir Broadcast

**Sudah di-push ✅**
- `UserController.php`: tambah subquery `broadcast_histories` → `MAX(sent_at)` per user, load `whatsappConnection` include `updated_at`, return `last_connected_at` + `last_broadcast_at`
- `UserManagementPage.tsx`: tambah 2 kolom "Terakhir Connect" & "Terakhir Broadcast" format `HH:mm:ss` + tanggal, auto-refresh `setInterval` 10 detik
- `types/index.ts`: tambah `last_connected_at?: string | null` & `last_broadcast_at?: string | null` ke `User` interface
- `UserController.php`: sembunyikan akun superadmin dari user list untuk role UH & marketing (security)

### 2026-07-12 — Registrasi Kios + Login NPO MCE ID + Reset Password

**Sudah di-push ✅**

**Backend — 7 file baru/diubah:**
- `database/migrations/2026_07_12_000001_create_kios_table.php`: tabel `kios` (`kios_id` unique, `kios_name`)
- `database/migrations/2026_07_12_000002_add_unique_to_npo_mce_id.php`: unique constraint `npo_mce_id`
- `database/seeders/KiosSeeder.php`: 8 kios entries (40200 CRE, 40207 POS WATES, 40272 PASAR TELO, 40274 GODEAN, 40275 SEDAYU, 40276 COKRO, 40278 WATES KOTA, 40279 YOGYAKARTA)
- `database/seeders/DatabaseSeeder.php`: tambah `KiosSeeder`, seed user dengan `npo_mce_id` + `kios_id`
- `app/Models/Kios.php`: model Kios baru
- `app/Http/Controllers/Api/KiosController.php`: CRUD kios (index public, store/update/destroy superadmin)
- `app/Http/Controllers/Api/AuthController.php`: login pakai `npo_mce_id` (bukan email), register `email` nullable + `kios_id` exists di tabel kios
- `app/Services/AuthService.php`: login manual `where npo_mce_id` + `Hash::check`, register resolve `kios_name` dari tabel `kios`
- `app/Http/Controllers/Api/UserController.php`: tambah `resetPassword()`, `updateKios()`, filter user by kios untuk non-superadmin
- `routes/api.php`: tambah public `GET /kios`, superadmin routes `admin/kios/*`, `admin/users/{id}/reset-password`, `admin/users/{id}/kios`

**Frontend — 9 file baru/diubah:**
- `types/index.ts`: tambah `Kios` & `KiosGroup` interface
- `services/authService.ts`: login pakai `npoMceId`, register tanpa `kios_name`, tambah `getKios()`
- `context/AuthContext.tsx`: login signature `npoMceId`, register tanpa `kios_name`
- `pages/auth/RegisterPage.tsx`: dropdown kios dari API, field order baru (Kios → Nama → NPO/MCE → Email optional → Password → Gender), kios name auto-fill
- `pages/auth/LoginPage.tsx`: field `npo_mce_id` (bukan email), icon Fingerprint
- `pages/admin/KiosManagementPage.tsx`: CRUD kios page (superadmin only), modal add/edit
- `pages/admin/UserManagementPage.tsx`: group by kios, expand/collapse, reset password modal, edit kios modal, kolom NPO/MCE
- `components/ui/Sidebar.tsx`: tambah "Kios" link ke `superadminOnlyLinks`
- `App.tsx`: tambah route `/admin/kios` (superadmin only), lazy import `KiosManagementPage`

**Login sekarang pakai NPO MCE ID, bukan email.** Email tetap ada tapi optional saat register. Seed password tetap `password`.

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-12 — Security fixes: Google OAuth disabled + ProfileController validation

**Sudah di-push ✅**

**Fix 1 — Google OAuth dinonaktifkan (incompatible dengan NPO MCE login):**
- `backend/routes/api.php`: hapus route `auth/google/redirect` dan `auth/google/callback`
- `frontend/src/pages/auth/LoginPage.tsx`: hapus token param handling dari Google callback
- `frontend/src/services/authService.ts`: hapus `googleRedirect()` dan `googleCallback()` methods
- Alasan: `googleCallback()` tidak set `npo_mce_id` atau `kios_id`, sehingga user Google tidak bisa login

**Fix 2 — SettingsPage: kios hanya read-only:**
- `frontend/src/pages/SettingsPage.tsx`: ganti 2 input free-text kios (nama + ID) jadi 1 field read-only `KiosName (KiosId)` + helper text "Hubungi superadmin untuk mengubah kios"
- `frontend/src/pages/SettingsPage.tsx`: hapus state `kiosName`/`kiosId`, hapus dari `handleSave` payload
- `frontend/src/services/profileService.ts`: hapus `kios_name`/`kios_id` dari `updateProfile()` type
- Alasan: user tidak boleh ganti kios sendiri — hanya superadmin via `admin/users/{id}/kios`

**Fix 3 — ProfileController: validasi npo_mce_id unique:**
- `backend/app/Http/Controllers/Api/ProfileController.php`: tambah `Rule::unique('users', 'npo_mce_id')->ignore($user->id)` ke validasi `npo_mce_id`
- `backend/app/Http/Controllers/Api/ProfileController.php`: hapus `kios_name`/`kios_id` dari validasi & update (hanya superadmin boleh ubah kios)
- `backend/app/Http/Controllers/Api/ProfileController.php`: pindahkan `$user = $request->user()` sebelum validator (needed untuk `ignore()`)

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-12 — Download Template Spreadsheet + Import flow clarification

**Sudah dikerjakan ✅**

**Diskusi:**
- Import/delete/re-import cycle sudah berfungsi untuk semua akun UH (forceDelete + UNIQUE constraint composite)
- Sama `no_contract` beda kios diperbolehkan (constraint: `unique(['no_contract', 'kios_id'])`)
- Bulanan: data dari atasan di-import, delete all, import lagi dengan data terbaru — tidak eror
- Broadcast history ikut terhapus saat delete all — user setuju

**Rencana: Download Template Spreadsheet**
- **Backend**: Route `GET /customers/template-download` + method `templateDownload()` di `CustomerController`
- Generate XLSX via PhpSpreadsheet (sudah terinstall: `phpoffice/phpspreadsheet ^5.8`)
- Kolom template: `NO_CONTRACT`, `NAMA`, `SISA ANGSURAN`, `KECAMATAN`, `KELURAHAN`, `BUSS_UNIT`, `OBJ_DESC`, `VCODE`, `TAHUN`, `OTR`, `PLAFON`, `CORI`, `NO_WHATSAPP`
- Route di group `role:superadmin,UH` + `feature:customer_management`
- **Frontend**: `downloadTemplate()` di `customerService.ts`, tombol "Download Template" di import modal tab File CSV
- User pilih format XLSX

**Files yang perlu dibuat/diubah:**
1. `backend/routes/api.php` — tambah route `GET customers/template-download`
2. `backend/app/Http/Controllers/Api/CustomerController.php` — tambah method `templateDownload()`
3. `frontend/src/services/customerService.ts` — tambah `downloadTemplate()`
4. `frontend/src/pages/admin/CustomerManagementPage.tsx` — tambah tombol "Download Template"

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-12 — Download Template + Cleanup + AGENTS.md update

**Sudah dikerjakan ✅ (belum di-push)**
- `fly.toml`: dihapus (Fly.io config sudah tidak relevan)
- `backend/routes/api.php`: tambah route `GET customers/template-download`
- `backend/app/Http/Controllers/Api/CustomerController.php`: tambah `templateDownload()` — generate XLSX via PhpSpreadsheet
- `frontend/src/services/customerService.ts`: tambah `downloadTemplate()` — fetch blob + auto-download
- `frontend/src/pages/admin/CustomerManagementPage.tsx`: tambah tombol "Download Template" di import modal tab File CSV
- `AGENTS.md`: tandai semua session sebelumnya sebagai "Sudah di-push ✅" / "SUDAH DIPERBAIKI ✅", hapus item CORI/Vcode dari CalculatorPage (tidak diperlukan)

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-12 — Real-time broadcast history + superadmin kios/marketing filter

**Sudah di-push ✅**
- `backend/app/Http/Controllers/Api/BroadcastController.php`: `history()` & `stats()` — superadmin bisa filter by `kios_id` dan `marketing_id` query params
- `frontend/src/services/customerService.ts`: `getMarketingUsers(kiosId?)` — terima optional param untuk filter by kios
- `frontend/src/pages/marketing/BroadcastHistoryPage.tsx`: ganti `setInterval` polling → Socket.IO `broadcast:status` event (real-time); superadmin dapat dropdown kios + dropdown marketing; marketing list berubah otomatis saat kios dipilih

### 2026-07-12 — NMC/REFI: ganti dari buss_unit → prefix no_contract + assignment kios-scoped

**Sudah di-push ✅**
- `backend/app/Http/Controllers/Api/AssignmentController.php`: `autoCalculate()` & `assignByUnit()` — ganti filter dari `json_extract(dynamic_data, '$.buss_unit')` → `no_contract LIKE '4020%'` (NMC) / `'4029%'` (REFI); tambah kios scope untuk non-superadmin
- `backend/app/Http/Controllers/Api/CustomerController.php`: param `buss_unit` → `customer_type`; `templateDownload()` hapus kolom `BUSS_UNIT`, sample data `CON001` → `40200001`
- `backend/app/Repositories/CustomerRepository.php`: filter `customer_type` → `no_contract LIKE` di `getAll()` & `getAssignedToMarketing()`
- `frontend/src/pages/admin/CustomerManagementPage.tsx`: rename `bussUnitFilter` → `customerTypeFilter`, label "Buss Unit" → "Tipe", param `customer_type`
- `frontend/src/pages/marketing/ProspectListPage.tsx`: sama — rename + label + param

### 2026-07-12 — Customer page: default assigned-only + search bypasses filter

**Sudah di-push ✅**
- `frontend/src/pages/admin/CustomerManagementPage.tsx`: default `assignment_status=assigned` saat search kosong; search aktif bypass filter assignment (tampilkan semua hasil); hapus toggle `showAssigned` + tombol "Tampilkan Semua"
- `frontend/src/pages/marketing/ProspectListPage.tsx`: sama — search bypasses assignment filter

### 2026-07-13 — Data Rolling: pinjam data antar marketing + customer_shares

**Sudah di-push ✅**

**Backend:**
- `backend/database/migrations/2026_07_13_000001_create_customer_shares_table.php`: tabel `customer_shares` (customer_id, from_marketing_id, to_marketing_id, status, share_type, shared_count, requested_by, approved_by, timestamps)
- `backend/app/Models/CustomerShare.php`: model baru dengan relations ke Customer, User
- `backend/app/Http/Controllers/Api/CustomerShareController.php`: 6 methods — `info()`, `requestShare()`, `pendingRequests()`, `approveShare()`, `revokeShare()`, `mySharedCustomers()`
- `backend/routes/api.php`: routes `customer-shares/*` — info/request (marketing), pending/approve/revoke (UH/superadmin), my-shared (marketing)
- `backend/app/Http/Controllers/Api/RolePermissionSeeder.php`: tambah feature `data_rolling`
- `backend/app/Repositories/CustomerRepository.php`: `getAssignedToMarketing()` sekarang include shared customers via UNION query

**Frontend:**
- `frontend/src/types/index.ts`: tambah `ShareInfo` & `CustomerShareRequest` interfaces
- `frontend/src/services/customerService.ts`: tambah `getShareInfo()`, `requestShare()`, `getPendingShares()`, `approveShare()`, `revokeShare()`, `getMySharedCustomers()`
- `frontend/src/components/ui/RollingDataModal.tsx`: modal 2-step (input jumlah → pilih tipe share)
- `frontend/src/pages/admin/RollingApprovalPage.tsx`: halaman UH approve/revoke pending requests
- `frontend/src/pages/marketing/ProspectListPage.tsx`: section "Data Dipinjam" + tombol "Rolling Data" buka modal
- `frontend/src/components/ui/Sidebar.tsx`: tambah link "Rolling Data" (`ArrowLeftRight` icon) untuk admin/UH, feature-gated `data_rolling`
- `frontend/src/App.tsx`: route `/admin/rolling` + lazy import `RollingApprovalPage`

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-13 — Notification bell untuk assignment + toast diperlama

**Sudah di-push ✅**

**Backend:**
- `backend/database/migrations/2026_07_13_000002_create_notifications_table.php`: tabel `notifications` (user_id, type, title, message, data JSON, read_at, timestamps) + index `[user_id, read_at]`
- `backend/app/Models/Notification.php`: model baru dengan scope `unread()`, method `markAsRead()`
- `backend/app/Http/Controllers/Api/NotificationController.php`: 3 methods — `index()`, `markAsRead()`, `markAllRead()`
- `backend/app/Http/Controllers/Api/AssignmentController.php`: hook `assign()` & `assignByUnit()` — create notification record ke target marketing saat assign berhasil
- `backend/routes/api.php`: routes `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`

**Frontend:**
- `frontend/src/services/notificationService.ts`: service baru — `getAll()`, `markAsRead()`, `markAllRead()`
- `frontend/src/components/ui/NotificationBell.tsx`: rewrite — fetch dari API (bukan localStorage), tampilkan assignment notifications (icon `UserPlus`), click to mark as read
- `frontend/src/components/ui/Toast.tsx`: durasi 4s → 8s

### 2026-07-13 — Notification sound + UH notification + real-time polling

**Sudah di-push ✅**

**Backend:**
- `backend/app/Http/Controllers/Api/AssignmentController.php`: `assign()` & `assignByUnit()` — tambah notification ke assigner (UH) sebagai konfirmasi, sehingga BOTH marketing DAN UH dapat notifikasi

**Frontend:**
- `frontend/src/components/ui/NotificationBell.tsx`: tambah `playNotificationSound()` via Web Audio API (2-tone beep: 880Hz → 1175Hz), polling setiap 10 detik via `setInterval`, play sound hanya saat unreadCount naik (notifikasi baru)

### 2026-07-13 — Full codebase audit round 2: 31 fixes planned

**Status: SUDAH DIEKSEKUSI ✅**

**Dari diskusi:**
- `clearCache` tetap bisa diakses semua user (user buat untuk bantu reset app saat lambat/wa stuck). Bukan crash risk, tapi tetap bisa disalahgunakan. **Tidak diubah.**
- `info()` di `customer-shares/info/{marketingId}` tetap ada — user pakai untuk lihat jumlah data marketing. Tapi perlu scope by kios agar marketing A tidak bisa lihat data marketing B.
- Manual send (markSent) bebas tanpa batas — by design, risk ditanggung pemilik akun.
- Template visibility: marketing harusnya hanya lihat template sendiri, tapi superadmin bisa lihat semua.
- UH kios A tidak boleh assign customer ke marketing kios B.
- no_contract duplikat antar kios diizinkan (data lapangan), tapi single-creation duplikat check harus kios-scoped (bukan global).

#### P0 CRITICAL (Worker)
1. ✅ `worker/src/queue-consumer.js`: fix `processing` flag permanent lock — try-catch-finally sudah benar.

#### P1 HIGH (Backend + Frontend)
2. ✅ `backend/app/Repositories/CustomerRepository.php`: `deleteAll()` — sudah pakai subquery `$query->toBase()`
3. ✅ `backend/app/Http/Controllers/Api/CustomerController.php`: `store()` + `marketingAdd()` — scope duplicate check by `kios_id`
4. ✅ `backend/app/Http/Controllers/Api/AssignmentController.php`: `assign()` — cek kios customer DAN marketing
5. ✅ `backend/app/Http/Controllers/Api/AssignmentController.php`: `assignByUnit()` — cek kios marketing target
6. ✅ `backend/app/Http/Controllers/Api/AssignmentController.php`: `unassign()` — cek kios customer
7. ✅ `backend/app/Http/Controllers/Api/CustomerController.php`: `update()` + `destroy()` — cek kios customer
8. ✅ `backend/app/Repositories/TemplateRepository.php`: `findById/update/delete` — ownership check untuk marketing
9. ✅ `backend/app/Repositories/TemplateRepository.php`: `getAll()` — superadmin lihat semua template
10. ✅ `backend/app/Http/Controllers/Api/NotificationController.php`: auto-trim + cap 100 notifikasi + deleteAll method

#### P2 MEDIUM (Worker + Frontend + Backend)
11. ✅ `worker/src/index.js`: `gracefulShutdown()` — panggil `stopQueue()`, disconnect WA connections
12. ✅ `worker/src/queue-consumer.js`: export `stopQueue`
13. ✅ `worker/src/wa-client.js`: max reconnect attempts (10x) + emit `logged_out`
14. ✅ `worker/src/wa-client.js`: cleanup `activeClients` saat auto-disconnect
15. ✅ `frontend/src/components/ui/NotificationBell.tsx`: `clearAll()` panggil `DELETE /notifications` (bukan mark read)
16. ✅ `frontend/src/context/AuthContext.tsx`: `disconnectSocket()` di `logout()`
17. ✅ `frontend/src/hooks/usePermissions.ts`: TTL 5 menit ke permission cache
18. ✅ `backend/routes/api.php`: `admin/permissions` tetap bisa diakses semua user (tidak diubah)
19. ✅ `backend/app/Http/Controllers/Api/CustomerShareController.php`: `info()` — scope by kios
20. ✅ `backend/app/Http/Controllers/Api/CustomerShareController.php`: `notifyUhsForShare()` — scope ke UH kios terkait

#### P3 LOW (Worker + Frontend + Backend)
21. ✅ `worker/src/queue-consumer.js`: deduplicate `pending_stuck` emit per poll cycle
22. ✅ `worker/src/socket-server.js`: pindahkan `require()` ke top-level (juga fix duplicate DB_PATH + missing requires)
23. ✅ `worker/src/db.js`: `closeDb()` tidak diperlukan (setiap call buat baru)
24. ✅ `worker/src/index.js`: exit code 0 untuk SIGINT/SIGTERM
25. ✅ `worker/src/index.js`: `unhandledRejection` — log saja, tidak shutdown
26. ✅ `worker/src/wa-client.js`: cleanup LID files > 7 hari saat startup
27. ✅ `frontend/src/components/ui/NotificationBell.tsx`: sembunyikan bell di mobile (`hidden lg:block`)
28. ✅ `frontend/src/pages/admin/CustomerManagementPage.tsx`: debounce 300ms di search input
29. ✅ `backend/app/Http/Controllers/Api/CustomerShareController.php`: `info()` — scope by kios
30. ✅ `backend/app/Http/Controllers/Api/CustomerShareController.php`: `notifyUhsForShare()` — scope ke UH kios terkait
31. ✅ `backend/app/Http/Controllers/Api/KiosController.php`: `destroy()` — cek ada user/customer sebelum hapus

### 2026-07-13 — Additional fixes: socket-server crash + PHP memory + notification cleanup + LID cleanup

**Sudah di-push ✅**

**Worker — socket-server.js crash fix (CRITICAL):**
- `worker/src/socket-server.js`: fix duplicate `const DB_PATH` declaration, tambah missing `require('path')`, `require('crypto')`, `const { Server } = require('socket.io')`, hapus redundant `require()` di dalam `createSocketServer()`

**Backend — PHP memory optimization:**
- `backend/app/Services/CustomerService.php`: `importFromFile()` CSV sekarang pakai `fopen()` + `fgetcsv()` langsung dari file (bukan `file_get_contents()` + `php://temp`). Eliminasi `$rows` intermediate array.
- `backend/app/Services/CustomerService.php`: `importFromExcel()` bangun `$customers` langsung dari `$rows` tanpa intermediate `$parsedRows`. Kurangi peak memory dari 3x ke 1x.

**Backend + Frontend — Notification cleanup:**
- `backend/app/Http/Controllers/Api/NotificationController.php`: tambah `deleteAll()` method — benar-benar DELETE dari database
- `backend/app/Http/Controllers/Api/NotificationController.php`: auto-trim tambah cap 100 notifikasi total (hapus yang paling lama)
- `backend/routes/api.php`: tambah `DELETE /notifications` route
- `frontend/src/services/notificationService.ts`: tambah `deleteAll()` method
- `frontend/src/components/ui/NotificationBell.tsx`: `clearAll` button panggil `DELETE /notifications` (bukan `PATCH /notifications/read-all`)

**Worker — LID cleanup:**
- `worker/src/wa-client.js`: tambah `cleanupOldLidFiles()` — scan `auth_info/` untuk file `.lid` > 7 hari, hapus saat startup
- `worker/src/index.js`: panggil `cleanupOldLidFiles()` saat startup

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-13 — Security hardening: 29 vulnerabilities patched

**Sudah di-push ✅ & deployed ✅**

**Critical (Backend):**
- `backend/routes/api.php`: login `throttle:10,1`, register `throttle:5,1` (superadmin-only)
- `backend/routes/api.php`: `admin/permissions` restricted to superadmin (was open, later changed: GET open to all for permission checking)
- `backend/routes/api.php`: `admin/kios/*` restricted to superadmin
- `backend/routes/api.php`: register moved to superadmin-only group (was public)
- `backend/routes/api.php`: `deleteAll` route changed to POST (for confirmation token)
- `backend/config/sanctum.php`: token expiry set to 1440 min (24h)
- `backend/app/Http/Controllers/Api/ProfileController.php`: clearCache restricted to superadmin, `Artisan::call()` replaces `exec()`, removed dead `rmdirRecursive()`
- `backend/app/Http/Controllers/Api/ProfileController.php`: changePassword invalidates all tokens
- `backend/app/Http/Controllers/Api/UserController.php`: resetPassword invalidates all tokens + password policy (uppercase+lowercase+digit)

**High (Backend):**
- `backend/app/Http/Controllers/Api/BroadcastController.php`: kios ownership check in prepare()
- `backend/app/Http/Controllers/Api/CustomerShareController.php`: kios scoping for pendingRequests + approveShare + revokeShare + notifyUhsForShare
- `backend/app/Http/Controllers/Api/CustomerController.php`: deleteAll requires confirmation token (`confirm: DELETE_ALL`)
- `backend/app/Http/Controllers/Api/CustomerController.php`: marketingAdd uses `$request->only()` (mass assignment fix)
- `backend/app/Http/Controllers/Api/TemplateController.php`: store/update uses `$request->only()` (mass assignment fix)
- `backend/app/Http/Controllers/Api/AuthController.php`: login accepts email OR npo_mce_id, me() returns only safe fields

**Medium (Backend):**
- `backend/app/Http/Controllers/Api/KiosController.php`: kios_id regex validation + trim/sanitize
- `backend/app/Models/User.php`: remove `google_id` from fillable

**Frontend:**
- `frontend/src/context/AuthContext.tsx`: PWA cache cleared on logout via `caches.keys()` + `caches.delete()`
- `frontend/src/pages/SettingsPage.tsx`: password policy enforced (uppercase+lowercase+digit)
- `frontend/src/pages/auth/RegisterPage.tsx`: password policy enforced client-side
- `frontend/src/services/customerService.ts`: deleteAll uses POST with `{ confirm: 'DELETE_ALL' }`

**Deploy/Infra:**
- `deploy/deploy-vps.sh`: nginx security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS, server_tokens off)
- `deploy/deploy-vps.sh`: non-root systemd (User=fif, Group=fif) + ACL permissions for worker DB access
- `deploy/deploy-vps.sh`: auth_info permissions 700 (chmod) + chown fif:fif
- `worker/src/socket-server.js`: CORS restricted to domain list (was `origin: '*'`)
- `.gitattributes`: enforce LF line endings for shell scripts (fix CRLF heredoc corruption)

### 2026-07-13 — POST-deploy security hardening bug fixes

**Sudah di-push ✅ & deployed ✅**

**Fix 1 — Register redirect loop (CRITICAL):**
- `backend/routes/api.php`: `GET /admin/permissions` — hapus `role:superadmin` middleware. Marketing/UH users yang baru register mengalami infinite redirect loop (berkedip) karena `RequireFeature` → `usePermissions()` → 403 → `hasFeature()=false` → redirect `/login` → `PublicRoute` lihat user exists → redirect balik ke dashboard → loop
- Route GET sekarang terbuka untuk semua role yang login. PUT tetap superadmin-only.

**Fix 2 — Sidebar Customers link missing:**
- `frontend/src/components/ui/Sidebar.tsx`: tambah `{ to: '/admin/customers', label: 'Customers', icon: <Users />, feature: 'customer_management' }` ke `adminLinks`. Route `/admin/customers` sudah ada di App.tsx tapi link sidebar belum ditambahkan.

**Fix 3 — Nama display uppercase:**
- `frontend/src/components/ui/Sidebar.tsx:154`: tambah `uppercase` CSS class ke user name display
- `frontend/src/pages/marketing/MarketingDashboardPage.tsx:36`: tambah `<span className="uppercase">` ke greeting

### 2026-07-13 — 4 bug fixes: Connect, DeleteAll, Nopol, UH delete cascade

**Sudah di-push ✅ & deployed ✅ (4 commits bertahap)**

#### Fix 1: Connect feature crash (CRITICAL)
- **Root cause**: Circular dependency `wa-client.js` → `socket-server.js` → `wa-manager.js` → `wa-client.js`. `emitWAStatus` di `wa-client.js` selalu `undefined` karena `socket-server.js` belum selesai load saat di-require. Setiap WA status event (QR, connected, disconnected) → TypeError → worker crash → frontend tidak pernah dapat QR code.
- **Fix**: `worker/src/events.js` (baru) — extract `emitWAStatus`, `emitBroadcastStatus`, `emitPendingStuck` ke file terpisah. `socket-server.js` panggil `setIO(io)` saat init. `wa-client.js` dan `queue-consumer.js` import dari `events.js` (bukan `socket-server.js`).
- **Bonus fix**: `setfacl -m u:fif:rwx` di `/var/www/fif/backend/database/` — fix "attempt to write a readonly database" error di queue consumer (directory butuh write access untuk WAL/SHM files)

#### Fix 2: DeleteAll error + SQLite stability
- `backend/config/database.php`: set `busy_timeout => 5000`, `journal_mode => 'WAL'` (sebelumnya `null`)
- `backend/app/Http/Controllers/Api/CustomerController.php`: `deleteAll()` error sekarang return detail message (`$e->getMessage()`) + log ke `Log::error()`

#### Fix 3: Nopol input tidak bisa alphanumeric di HP
- `frontend/src/pages/CalculatorPage.tsx`: tambah `type="text" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false}` ke 2 input nopol. Tanpa `inputMode="text"`, mobile browser menampilkan keyboard numeric karena input di atasnya (plafon, angsuran) bernumeric.

#### Fix 4: Hapus UH → data import ikut terhapus bersih
- `backend/app/Http/Controllers/Api/UserController.php`: `destroy()` — tambah cleanup `customer_shares` (FROM/TO/REQUESTED/APPROVED) sebelum `$user->delete()`. Tanpa ini, FK constraint `customer_shares.*_marketing_id` → `users.id` (RESTRICT) akan crash. Ganti `Customer::where('uploaded_by', ...)->delete()` → `forceDelete()` agar uploaded customers benar-benar hilang (bukan soft-delete yang masih exist dengan FK ke user terhapus).

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Auth flow fix + Worker DB stability + 429 handling

**Sudah di-push ✅ & deployed ✅**

**Frontend (High Priority):**
- `frontend/src/pages/auth/LoginPage.tsx`: tambah `useNavigate` import (missing — sebelumnya crash runtime), ganti `window.location.href = '/'` → `navigate(role-based)` — superadmin/UH ke `/admin/dashboard`, marketing ke `/marketing/dashboard`, handle 429 rate limit dengan pesan spesifik
- `frontend/src/pages/auth/RegisterPage.tsx`: tambah `useNavigate` import (fix dari session sebelumnya), ganti `window.location.href = '/'` → `navigate('/login')`
- `frontend/src/hooks/usePermissions.ts`: `hasFeature()` return `true` saat `loading` (bukan `false`) — mencegah `RequireFeature` redirect ke `/login` selama permissions masih dimuat
- `frontend/src/services/api.ts`: 401 interceptor — skip redirect kalau tidak ada `token` di sessionStorage (race condition: interceptor fire sebelum login selesai simpan token)
- `frontend/src/context/AuthContext.tsx`: wrap `JSON.parse(sessionStorage.getItem('user'))` di try-catch — cegah crash karena sessionStorage korup

**Backend (Low Priority):**
- `backend/app/Services/AuthService.php`: hapus `Auth::login($user)` yang tidak perlu — app pakai Sanctum token-based auth, session login tidak diperlukan + buang unused import `Auth`

**Worker (Medium Priority):**
- `worker/src/db.js`: `getWritableDb()` sekarang singleton — buka 1 koneksi, reuse setiap poll cycle, tutup pas shutdown via `closeDb()`. Eliminasi SQLITE_BUSY dari频繁 open/close
- `worker/src/queue-consumer.js`: gunakan singleton DB — hapus `getWritableDb()` open/close di `processPending()` dan `sendPushNotification()`. Singleton + busy_timeout handle concurrency
- `worker/src/index.js`: panggil `closeDb()` di `gracefulShutdown()` — cleanup koneksi DB pas SIGTERM/SIGINT
- `worker/src/wa-client.js`: tambah `busy_timeout = 5000` ke `saveConnectionStatus()` — cegah SQLITE_BUSY saat wa-client + queue-consumer write bersamaan
- `worker/src/socket-server.js`: tambah `busy_timeout = 5000` ke readonly token validation connection

**Deploy:**
- `deploy/deploy-vps.sh`: fix SQLite permissions — `chmod 666` database.sqlite + SHM/WAL files, `chown apache:apache` SHM/WAL, `setfacl` full rwx untuk apache di database directory. Fix "attempt to write a readonly database" saat throttle middleware coba write cache ke SQLite.

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Fix: deleteAll SQLite subquery + toast responsive mobile

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `backend/app/Repositories/CustomerRepository.php`: `deleteAll()` — ganti `$query->toBase()` (returns all 14 columns) → `pluck('id')` lalu `whereIn` with ID collection. Fix SQLite error "sub-select returns 14 columns - expected 1"

**Frontend:**
- `frontend/src/components/ui/Toast.tsx`: responsive — `left-4 sm:left-auto sm:max-w-sm`, `break-words` untuk pesan error panjang di mobile, `shrink-0` untuk icon/close button

### 2026-07-14 — Fix: deleteAll SQLite 999-variable limit

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `backend/app/Repositories/CustomerRepository.php`: `deleteAll()` — chunk IDs into batches of 500 before `whereIn`. SQLite has a hard limit of ~999 variables per query. With 8221 customers, the unchunked `whereIn('customer_id', $customerIds)` exceeded the limit. Same fix applied to `batchDelete()`.
- `backend/app/Repositories/CustomerRepository.php`: `batchDelete()` — same chunking pattern, returns correct total deleted count across chunks.

### 2026-07-14 — 5 bug fixes: Connect race condition + UH cleanup + rolling permission + nopol

**Sudah di-push ✅ & deployed ✅**

**Bug 1 — Connect race condition (HIGH):**
- `worker/src/socket-server.js`: tambah `wa:request_status` event handler — frontend bisa request status terkini setelah listener terpasang
- `worker/src/socket-server.js`: tambah `await` sebelum `disconnect(userId)` di `wa:reconnect` handler — cegah race condition antara old/new Baileys client
- `frontend/src/pages/marketing/QRScannerPage.tsx`: emit `wa:request_status` setelah setup listener — fix QR expired karena event terkirim sebelum listener siap; tambah `connect_error` + `disconnect` socket handlers — tampilkan error ke user

**Bug 2 — Auto-calculate NMC/REFI:**
- ✅ TIDAK ADA BUG — NMC=`4020%`, REFI=`4029%` konsisten di semua layer (autoCalculate, assignByUnit, CustomerRepository, frontend filter)

**Bug 4 — Calculator nopol:**
- `frontend/src/pages/CalculatorPage.tsx`: tambah `autoComplete="off" pattern="[A-Za-z0-9]*"` ke 2 input nopol — hint tambahan untuk mobile browser agar menampilkan text keyboard (bukan numeric)

**Bug 5 — UH delete data cleanup (MEDIUM):**
- `backend/app/Http/Controllers/Api/UserController.php`: tambah explicit `WhatsappConnection::where('user_id', ...)->delete()` dan `Notification::where('user_id', ...)->delete()` sebelum `$user->delete()` — sebelumnya relies on SQLite CASCADE yang bisa gagal

**Bug 6 — UH rolling data approval (HIGH):**
- VPS database: seed `role_permissions` rows untuk `data_rolling` (UH + marketing) — sebelumnya tidak ada di DB karena seeder belum dijalankan ulang
- `frontend/src/services/permissionService.ts`: tambah `data_rolling: 'Rolling Data'` ke `FEATURE_LABELS` — fix label di Permission Management page

### 2026-07-14 — Rolling approval toast + notification persistence + data dipinjam column

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `backend/app/Http/Controllers/Api/CustomerShareController.php`: tambah `share_group` (requested_by_from_marketing_id) ke semua notif rolling — link notif ke share records untuk cek status pending
- `backend/app/Http/Controllers/Api/CustomerShareController.php`: `mySharedCustomers()` return `from_marketing_name` + `share_group` via load relation `fromMarketing`
- `backend/app/Http/Controllers/Api/NotificationController.php`: auto-trim skip notif rolling yang masih punya `customer_shares` dengan `status = 'pending'`
- `backend/app/Http/Controllers/Api/NotificationController.php`: `deleteAll()` hanya hapus notif `created_at < hari ini` + skip pending rolling

**Frontend:**
- `frontend/src/components/ui/NotificationBell.tsx`: Klik notif "Rolling Data" (UH/superadmin) → floating toast di pojok kanan bawah dengan tombol Approve (hijau), Reject (merah), Batal (abu). Toast tetap sampai diambil tindakan. `clearAll()` panggil API lalu refresh (pending rolling tetap ada)
- `frontend/src/types/index.ts`: tambah `from_marketing_name` & `share_group` ke `Customer` interface
- `frontend/src/pages/marketing/ProspectListPage.tsx`: tambah kolom "Pinjam Dari" di table Data Dipinjam

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Fix: rolling notif persistence + center toast + assignedToMe logging

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `NotificationController.php`: ganti `where('status', 'pending')` → `whereIn('status', ['pending', 'approved'])` di auto-trim (2 tempat) + deleteAll (1 tempat). Notif rolling sekarang tetap ada selama share masih pending ATAU approved. Fix notif approved terhapus dari semua akun.
- `CustomerController.php`: tambah `Log::info()` di `assignedToMe()` — log user_id, role, marketing_id, kios_id, total, page_count. Untuk debug data pemilik hilang setelah approve (belum ditemukan root cause-nya dari kode).

**Frontend:**
- `NotificationBell.tsx`: rolling approval toast dipindah ke tengah layar (fixed inset-0 + flex center)

### 2026-07-14 — Daily Bug Report

**Status: Investigated & Partially Fixed**

| # | Bug | Priority | Status |
|---|-----|----------|--------|
| 1 | Connect feature tidak bisa terhubung | HIGH | ✅ Code fix deployed, WA rate-limit perlu cooldown |
| 2 | Auto-calculate pool: NMC harus 4020, REFI harus 4029 | HIGH | ✅ Tidak ada bug, code konsisten |
| 4 | Calculator nopol tidak bisa input angka+huruf | HIGH | ✅ Sudah fix di code, user perlu hard refresh |
| 5 | UH delete: solusi hapus data | MEDIUM | ✅ Cleanup sudah lengkap |
| 6 | UH rolling approval hilang | HIGH | ✅ Code & DB OK, user perlu hard refresh |

**Bug 1 — Root Cause Analysis:**
- Baileys v7 error: `"QR refs attempts ended"` — koneksi ke WA OK tapi QR pairing timeout
- Baileys v6 error: `"Connection Failure"` di noise-handler — protocol terlalu tua
- **Root cause: WhatsApp rate-limit VPS IP** karena reconnect loop panjang dari Baileys v7 sebelumnya
- VPS IP perlu cooldown 1-2 jam sebelum coba connect lagi
- Auth directories sudah di-clear untuk force fresh QR
- **Fitur baru**: Pairing Code (kode 8 digit) sebagai alternatif QR — flow terpisah, bypass QR rate limit

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

### 2026-07-14 — WhatsApp connect stabilization: reconnect loop fix + DB status recovery

**Sudah di-push ✅ & deployed ✅**

**Root causes fixed:**
1. QR/pairing timeout → Baileys triggers `connection.close` with `DisconnectReason.timedOut` → auto-reconnect loop → new QR → timeout → loop endlessly
2. Socket reconnect (page refresh / tab switch) → frontend loses WA status → worker auto-creates new WA client, killing old one
3. No status recovery — socket-server relied on in-memory state only

**Worker:**
- `worker/src/wa-client.js`: detect `DisconnectReason.timedOut` — stop reconnect loop, clear reconnect state, save `awaiting_scan` status, emit to frontend, wait for user manual retry
- `worker/src/wa-client.js`: `softResetForUser()` — kill WA socket + clear in-memory state WITHOUT deleting auth dir (for retry scenarios)
- `worker/src/wa-manager.js`: export `softReset()` wrapper
- `worker/src/socket-server.js`: `getWAStatusFromDB()` — read WA status + QR from SQLite on new socket connection
- `worker/src/socket-server.js`: on new socket connect, read DB status first (don't auto-create WA client). Show `awaiting_scan` + QR from DB, `connected`, or `disconnected`
- `worker/src/socket-server.js`: `wa:request_status` handler also reads from DB
- `worker/src/socket-server.js`: `wa:reconnect` — use `softReset()` when retrying (status is `awaiting_scan`/`connected`), only `disconnect()` when status is `logged_out`/`disconnected`

**Frontend:**
- `frontend/src/pages/marketing/QRScannerPage.tsx`: don't set `disconnected` on socket disconnect/error — keep last known status so WA doesn't restart unnecessarily

**Deploy:**
- `deploy/deploy-vps.sh`: runs `npm install` + `npm run build` + `systemctl restart fif-worker`

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Broadcast lock: WA connection status gating + phone input fix

**Sudah di-push ✅ & deployed ✅**

**Feature: Lock broadcast ke koneksi WhatsApp**
- Sebelumnya: broadcast bisa di-queue meskipun WA tidak connect (fire-and-forget). Pesan stuck di pending sampai WA connect.
- Sekarang: **3 layer protection** — tidak bisa kirim pesan jika WA tidak connected.

**Backend:**
- `backend/app/Services/BroadcastService.php`: `prepare()` cek `whatsapp_connections.status === 'connected'` sebelum insert broadcast. Reject dengan pesan jelas jika belum connect.

**Frontend:**
- `frontend/src/pages/marketing/ProspectListPage.tsx`: 
  - Listen `wa:status` via socket, track `waStatus` state
  - Tampilkan amber warning banner jika WA tidak connect (link ke /marketing/connect)
  - Disable tombol "Kirim" jika `waStatus !== 'connected'`
- `frontend/src/pages/marketing/BroadcastFormPage.tsx`:
  - Listen `wa:status` via socket, track `waStatus` state
  - Tampilkan amber warning banner jika WA tidak connect
  - Pass `disabled` + `disabledReason` ke DynamicFormEditor
- `frontend/src/components/forms/DynamicFormEditor.tsx`:
  - Tambah `disabled` + `disabledReason` props
  - Tombol "Kirim Broadcast" disabled + hover tooltip menjelaskan alasan

**Bug fix: Phone input pairing code**
- `frontend/src/pages/marketing/QRScannerPage.tsx`: auto-convert `08xxx` → `628xxx` (user bisa input format lokal)
- Placeholder diubah dari `628xxx` ke `08xxx`
- Helper text: "Format: 08xxx atau 628xxx — otomatis dikonversi"

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Fix: pairing code gagal karena WebSocket belum siap

**Sudah di-push ✅ & deployed ✅**

**Root cause:**
`requestPairingCode()` dipanggil SEBELUM Baileys WebSocket terbuka ke WhatsApp servers. Node `link_code_companion_reg` dikirim lewat WS yang belum open → WhatsApp tidak menerimanya. Kode di-generate client-side dan ditampilkan ke user, tapi pairing selalu gagal karena WhatsApp tidak pernah menerima registration node.

**Fix:**
- `worker/src/wa-client.js`: `createWAClientForUser` sekarang buat `wsReadyPromise` yang resolve saat `connection === 'open'`. Disimpan di `connections` Map.
- `worker/src/wa-client.js`: `requestPairingCodeForUser` tunggu `wsReadyPromise` resolve sebelum panggil `sock.requestPairingCode()`.
- `worker/src/socket-server.js`: timeout client creation naik dari 3s ke 15s (WS butuh waktu handshake + noise).
- `frontend/src/pages/marketing/QRScannerPage.tsx`: loading state "Menyiapkan koneksi..." saat menunggu kode, tombol "Ganti Nomor / Kode Baru" untuk retry.

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Fix: pairing code "WA client not found" race condition

**Sudah di-push ✅ & deployed ✅**

**Root cause:**
`wa:request_pairing_code` handler di socket-server memanggil `getOrCreateClient()` lalu menunggu 8 detik via `setTimeout`. Selama jeda 8 detik, Baileys bisa gagal connect (QR timeout, WS error), disconnect handler menghapus entry dari `connections` Map → `requestPairingCodeForUser()` dapat "WA client not found for user".

**Fix — atomic pairing flow:**
- `worker/src/wa-client.js`: `requestPairingCodeForUser()` sekarang self-contained — jika client belum ada atau sudah hilang dari Map, **buat baru sendiri** (`createWAClientForUser`), tunggu `wsReadyPromise`, langsung request pairing code. Tidak ada timeout terpisah.
- `worker/src/socket-server.js`: `wa:request_pairing_code` handler disederhanakan — langsung panggil `requestPairingCode(userId, phoneNumber)`. Hapus `getOrCreateClient` + `setTimeout` + promise race.

### 2026-07-14 — Cooldown untuk reconnect/pairing spam

**Sudah di-push ✅ & deployed ✅**
- `worker/src/socket-server.js`: tambah 30 detik cooldown per user untuk `wa:reconnect` dan `wa:request_pairing_code`. Cegah spam reconnect yang memperparah WhatsApp rate-limit. Pesan error: "Tunggu X detik sebelum coba lagi..."

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-14 — Anti-Ban: Browser fix + Proxy support + Warmup + Cooldown upgrade

**Sudah di-push ✅ & deployed ✅**

**Worker:**
- `worker/package.json`: tambah dependencies `socks-proxy-agent@^8.0.5` + `https-proxy-agent@^7.0.6`
- `worker/.env`: tambah `WA_PROXY=` (empty by default, backwards compatible)
- `worker/src/wa-client.js`:
  - Browser identity: `['FIF Broadcast', 'Chrome', '1.0.0']` → `['WhatsApp', 'Chrome', '120.0.0.0']` + `platform: 'Desktop'`
  - `connectTimeoutMs`: 15_000 → 30_000
  - `keepAliveIntervalMs`: 25_000 → 20_000 + random(0, 10000) (jitter)
  - Proxy support: baca `WA_PROXY` dari env, auto-detect SOCKS5 vs HTTP agent, pass ke `makeWASocket()`
  - Warmup delay: 3-5 detik setelah connect sebelum onReady
  - `lastConnectedAt` Map: track timestamp connect terakhir per user, di-export untuk queue-consumer
- `worker/src/socket-server.js`: cooldown 30s → 60s
- `worker/src/queue-consumer.js`: post-reconnect warmup — delay 10 detik pertama setelah reconnect sebelum kirim pesan

**Frontend:**
- `frontend/src/pages/marketing/QRScannerPage.tsx`: tambah amber warning text "Jika pairing gagal berulang, VPS mungkin di-rate-limit oleh WhatsApp..."

#### Root Cause Analysis
WhatsApp mendeteksi dan memblokir koneksi dari VPS karena:
1. **IP datacenter** (Rumahweb `202.10.42.237`) — WhatsApp tahu semua range IP hosting
2. **Browser fingerprint mencurigakan** — `['FIF Broadcast', 'Chrome', '1.0.0']` jelas bot
3. **Reconnect spam** — sebelum ada cooldown, user klik reconnect berkali-kat → 6-7 client barengan
4. **Tidak ada warmup** — langsung burst send setelah connect

#### File yang perlu diubah

##### 1. `worker/package.json` — tambah dependencies
```json
"socks-proxy-agent": "^8.0.5",
"https-proxy-agent": "^7.0.6"
```

##### 2. `worker/.env` — tambah WA_PROXY
```
# Proxy untuk koneksi WhatsApp (opsional)
# SOCKS5: socks5://user:pass@host:port
# HTTP: http://user:pass@host:port
# Kosongkan jika tidak pakai proxy (langsung dari VPS)
WA_PROXY=
```

##### 3. `worker/src/wa-client.js` — 4 perubahan besar

**a) Browser identity fix (baris 86-95):**
```js
// SEBELUM:
browser: ['FIF Broadcast', 'Chrome', '1.0.0'],
markOnlineOnConnect: false,
connectTimeoutMs: 15_000,
keepAliveIntervalMs: 25_000,

// SESUDAH:
browser: ['WhatsApp', 'Chrome', '120.0.0.0'],
platform: 'Desktop',
markOnlineOnConnect: false,
connectTimeoutMs: 30_000,
keepAliveIntervalMs: 20_000 + Math.floor(Math.random() * 10_000),
```

**b) Proxy support (baru, di atas makeWASocket):**
```js
const WA_PROXY = process.env.WA_PROXY || '';
let agent = undefined;
let fetchAgent = undefined;

if (WA_PROXY) {
  if (WA_PROXY.startsWith('socks')) {
    const { SocksProxyAgent } = require('socks-proxy-agent');
    agent = new SocksProxyAgent(WA_PROXY);
    fetchAgent = agent;
  } else {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    agent = new HttpsProxyAgent(WA_PROXY);
    fetchAgent = agent;
  }
  console.log(`[WA] Using proxy: ${WA_PROXY}`);
}
```
Tambahkan `agent` dan `fetchAgent` ke options `makeWASocket()`.

**c) Warmup delay (setelah connection === 'open'):**
Sebelum `onReady(sock)`, tambah delay 3-5 detik:
```js
const WARMUP_MS = 3000 + Math.floor(Math.random() * 2000);
setTimeout(() => {
  if (onReady) onReady(sock);
}, WARMUP_MS);
```

**d) Export `lastConnectedAt` Map untuk queue-consumer:**
Tambahkan `const lastConnectedAt = new Map();` dan update saat `connection === 'open'`:
```js
const { emitWAStatus, emitPairingCode } = require('./events');
const connections = new Map();
const reconnectState = new Map();
const lastConnectedAt = new Map(); // ← BARU: userId → timestamp connect terakhir
```
Di handler `connection === 'open'`:
```js
lastConnectedAt.set(userId, Date.now());
```
Export: `module.exports = { ..., lastConnectedAt }` (atau export via getter function).

##### 4. `worker/src/socket-server.js` — Cooldown naik 30s → 60s
```js
// SEBELUM:
const COOLDOWN_MS = 30_000;

// SESUDAH:
const COOLDOWN_MS = 60_000;
```

##### 5. `worker/src/queue-consumer.js` — Post-reconnect warmup
```js
const WARMUP_GRACE_MS = 10_000; // 10 detik grace period
```
Import `lastConnectedAt` dari `wa-client`:
```js
const { isConnectedForUser, getConnectedUsers, lastConnectedAt } = require('./wa-client');
```
Sebelum `sendMessage()`, cek warmup:
```js
const lastConn = lastConnectedAt.get(row.marketing_id) || 0;
const elapsed = Date.now() - lastConn;
if (elapsed < WARMUP_GRACE_MS) {
  const extraDelay = WARMUP_GRACE_MS - elapsed;
  console.log(`[Queue] Warmup delay ${extraDelay}ms for user ${row.marketing_id}`);
  await new Promise(r => setTimeout(r, extraDelay));
}
```

##### 6. `frontend/src/pages/marketing/QRScannerPage.tsx` — Warning text
Tambah di bawah QR / pairing code:
```tsx
<div className="text-xs text-amber-600 mt-2">
  Jika pairing gagal berulang, VPS mungkin di-rate-limit oleh WhatsApp.
  Tunggu 1-2 jam lalu coba lagi, atau gunakan VPN/proxy dengan IP residential.
</div>
```

##### 7. `AGENTS.md` — Update session history

#### Deployment Options (Gratis)

| Opsi | Effektif? | Cara |
|------|-----------|------|
| Browser fix saja | ⚠️ Perbaiki chance | Ganti fingerprint + warmup |
| SSH tunnel ke PC rumah | ✅ Best free | Install SSH server di PC, VPS connect lewat tunnel |
| **Termux di HP Android** | ✅ Best free | Install Termux + OpenSSH, reverse tunnel ke VPS. IP WiFi = residential |
| Cloudflare WARP | ❌ TIDAK cocok | Exit IP tetap datacenter Cloudflare |
| Free proxy internet | ❌ Bahaya | Bisa intercept session WhatsApp |

#### Termux Setup (HP Android → VPN Proxy Gratis)

**Di HP (Termux dari F-Droid):**
```bash
pkg install openssh
sshd
ifconfig  # cat IP WiFi
```

**Di HP → connect ke VPS (reverse tunnel):**
```bash
ssh -R 1080:localhost:22 root@202.10.42.237 -N
```

**Di VPS (worker .env):**
```
WA_PROXY=socks5://127.0.0.1:1080
```

**Tips Termux:**
- Matikan battery optimization untuk Termux (Settings → Apps → Termux → Battery → Unrestricted)
- Pakai `autossh` untuk auto-reconnect: `pkg install autossh`
- `autossh -M 0 -R 1080:localhost:22 root@202.10.42.237 -N`
- IP WiFi biasanya statis (192.168.x.x), public IP dari Indihome jarang berubah

#### Anti-Ban Strategy Reference

| Setting | Nilai | Keterangan |
|---------|-------|------------|
| Browser | `['WhatsApp', 'Chrome', '120.0.0.0']` | Match real WhatsApp Web |
| Platform | `'Desktop'` | Explicit |
| Cooldown | 60 detik | Anti reconnect spam |
| Warmup | 3-5 detik | Setelah connect, sebelum kirim |
| Post-reconnect grace | 10 detik | Delay pertama setelah reconnect |
| connectTimeoutMs | 30 detik | Lebih lama dari sebelumnya (15s) |
| keepAliveIntervalMs | 20-30 detik (random) | Jitter agar tidak patterned |
| Delay antar pesan | 60-180 detik | Sudah ada dari sebelumnya |
| Daily limit | 150 pesan/hari | Sudah ada dari sebelumnya |
| MAX_RECONNECT_ATTEMPTS | 10 | Sudah ada dari sebelumnya |

#### Risk Assessment

| Perubahan | Risk |
|-----------|------|
| Browser identity | ✅ Zero risk |
| Proxy support | ✅ Zero risk — empty = tidak ada perubahan |
| Cooldown 60s | ✅ Low risk — user tunggu lebih lama |
| Warmup delay | ✅ Zero risk — delay 3-5 detik |
| Post-reconnect grace | ✅ Low risk — tambah delay sebelum burst |
| Termux SSH tunnel | ✅ Low risk — IP residential, pasti aman |

Semua perubahan **backwards compatible** — tanpa `WA_PROXY`, behavior tetap sama.

### Next steps when resuming
Ketik: `lanjut yang tadi` — setup Termux SSH tunnel dari HP Android untuk residential IP.

### 2026-07-14 — Dashboard shared data + ProspectList badge + Real-time notification sound

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `backend/app/Services/BroadcastService.php`: `marketingSummary()` — tambah `shared_data` return (total_shared + owners array) via query ke `customer_shares` where `to_marketing_id` = current user & `status = approved`. Import `CustomerShare` model.

**Frontend — Dashboard:**
- `frontend/src/types/index.ts`: tambah `shared_data: { total_shared: number; owners: string[] }` ke `MarketingSummary` interface
- `frontend/src/pages/marketing/MarketingDashboardPage.tsx`: tambah card "Data Dipinjam" (cyan gradient border) — muncul hanya jika `shared_data.total_shared > 0`, tampilkan jumlah data + nama pemilik. Import `ArrowLeftRight` icon.

**Frontend — ProspectListPage:**
- `frontend/src/pages/marketing/ProspectListPage.tsx`: tambah kolom "Pemilik" setelah kolom "Nama" — tampilkan `from_marketing_name` dengan warna cyan untuk data dipinjam, `-` untuk data sendiri. Tambah badge "Dipinjam" (cyan) di kolom Nama untuk data pinjaman. Tambah `rowClassName` prop ke DataTable — data dipinjam dapat background `bg-cyan-50/30`.
- `frontend/src/components/ui/DataTable.tsx`: tambah `rowClassName?: (item: T) => string` prop — diterapkan ke `<tr>` sebagai custom class.

**Worker — Real-time notification sound:**
- `worker/src/events.js`: tambah `emitNotificationNew(userId, data)` — emit `notification:new` event ke room `user:${userId}`
- `worker/src/queue-consumer.js`: tambah notification poller — poll `notifications` table tiap 5 detik (`NOTIF_POLL_INTERVAL_MS`), track `lastNotifId` Map per user, emit `notification:new` saat ada unread notification baru. Import `emitNotificationNew`.
- `frontend/src/components/ui/NotificationBell.tsx`: sudah ada `socket.on('notification:new', ...)` handler yang panggil `fetchNotifications()` → play sound saat unread count naik. Worker sekarang emit event ini secara real-time.

#### Alur Notifikasi Real-time
1. Backend create `Notification` record di SQLite (assignment, rolling, dll)
2. Worker poll `notifications` table tiap 5 detik
3. Worker detect new unread notification → emit `notification:new` via Socket.IO
4. Frontend terima event → panggil `fetchNotifications()` → play sound jika `unreadCount` naik
5. Latency: ~5 detik (worker poll interval) + <1 detik (socket emit + frontend fetch)

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Hide superadmin test data + split delete buttons

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `CustomerRepositoryInterface.php`: tambah `deleteMyData(int $userId): int`
- `CustomerRepository.php`: `getAll()` & `getAssignedToMarketing()` — filter `whereNotIn('uploaded_by', superadminIds)` untuk non-superadmin viewers. Test data superadmin tidak terlihat di UH/marketing.
- `CustomerRepository.php`: tambah `deleteMyData(int $userId)` — force delete customers where `uploaded_by = $userId` + cascade broadcast_histories
- `CustomerService.php`: tambah `deleteMyData()` delegasi ke repository
- `CustomerController.php`: `index()` & `assignedToMe()` — pass `viewer_role` ke repository filters
- `CustomerController.php`: `deleteAll()` — terima optional `kios_id` untuk superadmin per-kios deletion
- `CustomerController.php`: tambah `deleteMyData()` — requires `confirm: DELETE_MY_DATA`, superadmin only
- `routes/api.php`: tambah `POST customers/delete-my-data` di group `role:superadmin,UH` + `feature:customer_management`

**Frontend:**
- `customerService.ts`: tambah `deleteMyData()` → `POST /customers/delete-my-data` + `deleteAllByKios(kiosId)` → `POST /customers/delete-all` with kios_id
- `CustomerManagementPage.tsx`: superadmin dapat 2 tombol — "Hapus Data Saya" (orange, `User` icon) + "Hapus Per Kios" (red, dropdown kios). UH tetap "Hapus Semua" (red). Hapus duplicate useEffect.
- Import `User` icon dari lucide-react + `authService` + `Kios` type

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — 6 tasks: template default + calculator fix + delete preserve + UH dashboard + hide superadmin data

**Sudah di-push ✅ & deployed ✅**

**Task 1 — Rolling approval:** Tidak ada perubahan — sudah 1 approval, UH klik Approve → batch approve via `approveShare()`.

**Task 2 — Default template + `#namapanggilanakun` (HIGH):**
- `backend/database/migrations/2026_07_14_000001_add_is_default_to_templates_table.php`: tambah kolom `is_default` boolean ke tabel `templates`
- `backend/app/Models/Templates.php`: tambah `is_default` ke `$fillable`
- `backend/database/seeders/TemplateSeeder.php`: seeder baru — buat template default "Default Broadcast" dengan body mengandung `#namapanggilanakun` + `#sisa_angsuran`, `created_by` superadmin
- `backend/database/seeders/DatabaseSeeder.php`: tambah `TemplateSeeder` ke `$this->call()`
- `backend/app/Repositories/TemplateRepository.php`: `getAll()` — marketing lihat template sendiri + `is_default`; `update()`/`delete()` — `is_default` hanya bisa diubah superadmin
- `backend/app/Services/BroadcastService.php`: `prepare()` resolve `#namapanggilanakun` → `$marketingUser->name`; `mapFormToMessage()` tambah `#namapanggilanakun` ke `$values['_namapanggilanakun']`
- `backend/app/Http/Controllers/Api/TemplateController.php`: `store()` — only superadmin can set `is_default`, gunakan `$request->only()` (bukan `$request->all()`)
- `frontend/src/types/index.ts`: tambah `is_default?: boolean` ke `Template` interface; tambah `{ key: 'namapanggilanakun', label: 'Nama Panggilan' }` ke `FORM_FIELDS`
- `frontend/src/pages/admin/TemplateManagementPage.tsx`: badge "Default" (Shield icon) untuk default templates; `canEdit()`/`canDelete()` — non-superadmin tidak bisa edit/hapus default template; placeholder tambah `#namapanggilanakun`
- `frontend/src/components/ui/DataTable.tsx`: tambah `editDisabled`/`deleteDisabled` props (optional per-item callbacks)
- `frontend/src/pages/marketing/ProspectListPage.tsx`: tambah `#namapanggilanakun` ke `VARIABLE_BUTTONS`; `interpolateMessage()` resolve `#namapanggilanakun` → `user?.name`; destructure `user` dari `useAuth()`

**Task 3 — Calculator unit input allow spaces (HIGH):**
- `frontend/src/pages/CalculatorPage.tsx`: `formatAlphaNum(raw, allowSpaces)` — Unit field pakai `allowSpaces=true`, collapse double spaces

**Task 4 — UH dashboard show unassigned marketing (HIGH):**
- `backend/app/Repositories/CustomerRepository.php`: `getDistributionReport()` — query `User::where('role', 'marketing')` + left-join dengan customer count via `pluck()` + `map()`. Semua marketing muncul meskipun 0 assigned, sorted by total desc.

**Task 5 — Delete all preserve marketing manual entries (HIGH):**
- `backend/app/Repositories/CustomerRepository.php`: `deleteAll()` — tambah filter `whereRaw("json_extract(dynamic_data, '$._entry_source') IS NULL OR json_extract(dynamic_data, '$._entry_source') != 'manual'")`. Marketing entries tidak ikut terhapus.

### 2026-07-14 — Fix: dashboard 500 error (getDistributionReport array access)

**Sudah di-push ✅ & deployed ✅**

**Root cause:**
`CustomerRepository::getDistributionReport()` direfactor dari Eloquent Collection (object) ke plain array (via `map()`). Tapi `CustomerService::getDistributionReport()` masih akses `$item->marketing_id` (object syntax) → PHP error `Attempt to read property "marketing_id" on array`. Semua dashboard semua role return 500.

**Fix:**
- `backend/app/Services/CustomerService.php`: `$item->marketing_id` → `$item['marketing_id']` (array syntax). `foreach` diganti `->map()` dengan return item yang sudah di-enrich broadcast stats. `$report['by_marketing']` di-reassign dengan collection yang sudah di-update.

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — Ownership filter + 'Anda' badge + from_marketing_name in main query

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `backend/app/Repositories/CustomerRepository.php`: `getAssignedToMarketing()` — attach `from_marketing_name` + `from_marketing_id` ke shared customers via eager-loaded `CustomerShare` map (sebelumnya tidak ada di query utama, hanya di `mySharedCustomers()`); tambah filter `ownership` parameter (`all` | `own` | `shared`)
- `backend/app/Http/Controllers/Api/CustomerController.php`: `assignedToMe()` — teruskan `ownership` filter ke service

**Frontend:**
- `frontend/src/types/index.ts`: tambah `from_marketing_id?: number` ke `Customer` interface
- `frontend/src/pages/marketing/ProspectListPage.tsx`:
  - Filter dropdown "Semua Data / Data Saya / Dipinjam" di toolbar
  - Kolom "Pemilik" — data sendiri: badge gradient violet "Anda" + UserIcon; data dipinjam: nama marketing + ArrowLeftRight icon di circle gradient cyan
  - Hapus section "Data Dipinjam" terpisah di bawah table (redundan — sudah gabung di main DataTable)
  - Row styling data dipinjam: gradient background + left border cyan

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-14 — display_name global + default template checkbox + read-only fields + warning banners

**Sudah di-push ✅ & deployed ✅**

**Backend:**
- `backend/database/migrations/2026_07_14_000002_add_display_name_to_users_table.php`: new — tambah kolom `display_name` nullable ke users
- `backend/app/Models/User.php`: tambah `display_name` ke `$fillable`
- `backend/app/Http/Controllers/Api/AuthController.php`: `me()` return `display_name` + `broadcast_sender_name` (current user's `display_name ?? name`)
- `backend/app/Http/Controllers/Api/ProfileController.php`: ALL users can update `display_name` di profile (bukan superadmin-only)
- `backend/app/Services/BroadcastService.php`: `prepare()` resolve `#namapanggilanakun` dari current user's `display_name` (bukan superadmin)
- `backend/database/seeders/DatabaseSeeder.php`: tambah `display_name` ke seed users (superadmin → "Admin FIF")

**Frontend:**
- `frontend/src/types/index.ts`: tambah `display_name` + `broadcast_sender_name` ke User interface
- `frontend/src/services/profileService.ts`: tambah `display_name` ke `updateProfile()` payload
- `frontend/src/pages/SettingsPage.tsx`: ALL users can set their own "Nama Panggilan (Broadcast)"
- `frontend/src/components/forms/DynamicFormEditor.tsx`: `nomor_contract`, `no_contract`, `namapanggilanakun` masuk `READ_ONLY_FIELDS`
- `frontend/src/pages/marketing/ProspectListPage.tsx`:
  - Default template checkbox (Settings icon) di sebelah kanan dropdown template tersimpan
  - Fix `#namapanggilanakun` resolve: `user?.broadcast_sender_name` (bukan `user?.name`)
  - Amber warning banner jika `broadcast_sender_name` kosong (semua user) dengan tombol "Ke Settings"
- `frontend/src/pages/marketing/BroadcastFormPage.tsx`: amber warning banner jika `broadcast_sender_name` kosong (semua user)

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-15 — Font upgrade + variable button redesign + #namapanggilan prefix fix + #nomor variable

**Sudah di-push ✅ & deployed ✅**

**Font upgrade:**
- `frontend/index.html`: ganti Google Fonts `Inter` → `Plus Jakarta Sans` (geometric, modern, populer di produk tech Indonesia)
- `frontend/src/index.css`: `--font-sans` → `"Plus Jakarta Sans"`

**Variable button redesign:**
- `frontend/src/pages/marketing/ProspectListPage.tsx`: tombol variabel pakai tema fif — `bg-fif-50 text-fif-600 hover:bg-fif-100` (konsisten dengan website, tidak rainbow)
- `frontend/src/pages/admin TemplateManagementPage.tsx`: sama — warna fif konsisten
- Hapus `color` property dari `VARIABLE_BUTTONS` (tidak diperlukan lagi)

**Critical fix — `#namapanggilan` corrupted by `#nama` prefix match:**
- **Root cause**: `replaceAll('#nama', customer_name)` match di dalam `#namapanggilan` karena `#nama` adalah prefix dari `#namapanggilan`. Hasil: `SRI ENI SUPRAPTIpanggilan`
- **Fix 3 layer:**
  - `frontend/src/pages/marketing/ProspectListPage.tsx`: `interpolateMessage()` — reorder: `#namapanggilan` di-replace **SEBELUM** `#nama`
  - `frontend/src/pages/marketing/BroadcastFormPage.tsx`: `handleTemplateSelect()` + useEffect — sort `FORM_FIELDS` by key length descending sebelum replace loop (`[...FORM_FIELDS].sort((a, b) => b.key.length - a.key.length)`)
  - `backend/app/Services/BroadcastService.php`: `mapFormToMessage()` — `uksort($map, fn($a, $b) => strlen($b) - strlen($a))` sebelum `str_replace` loop

**New variable `#nomor` (phone_number dari Settings):**
- **Flow sama kayak `#namapanggilan`**: user isi phone_number di Settings → `#nomor` resolve ke `phone_number` user yang login
- `backend/app/Services/BroadcastService.php`: `prepare()` tambah `$formValues['_nomor'] = $marketingUser?->phone_number ?? '';` + `mapFormToMessage()` tambah `'#nomor' => $values['_nomor'] ?? ''`
- `frontend/src/pages/marketing/ProspectListPage.tsx`: tambah `#nomor` ke `VARIABLE_BUTTONS` + `interpolateMessage()` `.replace(/#nomor/g, user?.phone_number || '')` (setelah `#nomor_contract`, sebelum `#namapanggilan`)
- `frontend/src/pages/admin/TemplateManagementPage.tsx`: tambah `#nomor` ke `VARIABLE_BUTTONS`
- `frontend/src/components/forms/DynamicFormEditor.tsx`: tambah `'nomor'` ke `READ_ONLY_FIELDS`

**Template variables reference (lengkap):**
| Variabel | Sumber | Read-only |
|----------|--------|-----------|
| `#no_contract` | customer dynamic_data | Yes |
| `#nama` | customer dynamic_data | Yes |
| `#nomor` | user phone_number (Settings) | Yes |
| `#namapanggilan` | user display_name ?? name (Settings) | Yes |
| `#obj_desc` | customer dynamic_data | No |
| `#tahun` | customer dynamic_data | No |
| `#plafon` | customer dynamic_data | No |
| `#sisa_angsuran` | customer dynamic_data | No |
| `#waktu` | auto (Pagi/Siang/Sore/Malam based on WIB) | Yes |

### Next steps when resuming
Ketik: `lanjut yang tadi` — semua sudah di-push ✅ dan deployed ke VPS.

### 2026-07-15 — Remove plafon from import, compute on-the-fly from OTR+CORI

**Sudah di-push ✅ & deployed ✅**

**Konsep:** Hapus `plafon` dari import. Plafon selalu dihitung dari `calcPlafon(otr, cori)`:
- MEDIUM → 75% × OTR
- GOOD / GOOD LOYAL → 90% × OTR

**Backend:**
- `CustomerController::updateCori()` — hapus simpan plafon/pembulatan_75/pembulatan_90
- `BroadcastService::mapFormToMessage()` — compute `#plafon` dari OTR+CORI
- `CustomerController::templateDownload()` — hapus kolom PLAFON dari template

**Frontend:**
- `frontend/src/finance/financeEngine.ts` — tambah `calcPlafon(otr, cori)` utility function
- `CalculatorPage.tsx` — pakai `calcPlafon()` untuk pinjaman
- `CustomerManagementPage.tsx` — plafon column + CORI hint pakai `calcPlafon()`, hapus dead `'75'`/`'90'` keys
- `ProspectListPage.tsx` — interpolation + column pakai `calcPlafon()`, manual add swap plafon → otr + cori
- `types/index.ts` — FORM_FIELDS swap `plafon` → `otr` + `cori`

### Next steps when resuming
Ketik: `lanjut yang tadi`

### ⏳ Perlu diperbaiki: Plafon pembulatan

**Plafon belum dibulatkan dengan benar.** Contoh: OTR 15.650.000 × 75% = 11.737.500 → harusnya **11.700.000** (bukan 11.737.500).

**Aturan pembulatan:**
- Sisa < 50.000 → bulatkan ke bawah ke 100.000 terdekat (11.737.500 → 11.700.000)
- Sisa >= 50.000 tapi belum 100.000 → bulatkan ke 50.000 (11.775.000 → 11.750.000)

**Rumus:**
```php
$remainder = $plafon % 100000;
if ($remainder < 50000) {
    $plafon = $plafon - $remainder; // bulatkan ke bawah ke 100k
} else {
    $plafon = $plafon - $remainder + 50000; // bulatkan ke 50k
}
```

**Contoh:**
- 11.737.500 → remainder 37.500 (< 50k) → 11.700.000
- 11.750.000 → remainder 50.000 (>= 50k) → 11.750.000
- 11.775.000 → remainder 75.000 (>= 50k) → 11.750.000
- 11.800.000 → remainder 0 → 11.800.000
- 12.060.000 → remainder 60.000 (>= 50k) → 12.050.000
- 12.040.000 → remainder 40.000 (< 50k) → 12.000.000

**Files yang perlu diubah:**
- `frontend/src/finance/financeEngine.ts` — `calcPlafon()` tambah pembulatan
- `backend/app/Services/BroadcastService.php` — `mapFormToMessage()` tambah pembulatan di plafon computation

### 2026-07-15 — CORI editable + auto plafon calculation (CORI×OTR)

**Sudah di-push ✅ & deployed ✅**

**Alur baru:**
1. User ganti CORI di Kalkulator → PATCH `/customers/{id}/cori`
2. Backend simpan CORI + hitung plafon = OTR × percentage:
   - MEDIUM → 75% × OTR
   - GOOD / GOOD LOYAL → 90% × OTR
3. Simpan hasil ke `dynamic_data.plafon` + `dynamic_data.pembulatan_75` + `dynamic_data.pembulatan_90`
4. Frontend refresh data → plafon otomatis ter-update di table & broadcast

**Backend:**
- `CustomerController::updateCori()` — tambah auto-calculate plafon dari CORI×OTR

**Frontend:**
- `CalculatorPage.tsx`: CORI di detail card jadi dropdown editable (bukan read-only text)
- `CalculatorPage.tsx`: setelah save CORI, refresh selected customer data

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-15 — Marketing scope fix + Calculator OTR + Kios-wide search

**Sudah di-push ✅ & deployed ✅**

**Task 1 — Marketing customer scope (HIGH):**
- `backend/app/Http/Controllers/Api/CustomerController.php`: `index()` — marketing users automatically pass `viewer_id` to filters
- `backend/app/Repositories/CustomerRepository.php`: `getAll()` — when `viewer_role=marketing`, filter to own assigned customers + shared (borrowed) customers only. Uses `CustomerShare` query like `getAssignedToMarketing()`
- Alasan: marketing hanya boleh lihat data sendiri + data pinjaman, bukan semua data di kios

**Task 2 — Calculator kios-wide search (INFO):**
- `backend/app/Http/Controllers/Api/CustomerController.php`: `searchCalculator()` — sudah benar, search ALL customers in kios tanpa filter marketing_id
- Tidak perlu perubahan

**Task 3 — Calculator detail card: Nopol → OTR (MEDIUM):**
- `frontend/src/pages/CalculatorPage.tsx`: ganti field "Nopol" di detail card jadi "OTR" — tampilkan `dyn('otr')` dengan format currency

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-15 — Plafon pembulatan 50k/100k + UserManagement polling fix

**Sudah di-push ✅ & deployed ✅**

**Frontend — Plafon rounding:**
- `frontend/src/finance/financeEngine.ts`: tambah `roundPlafon()` helper — remainder < 50k → bulat bawah ke 100k, >= 50k → bulat ke 50k. Ganti `Math.floor(otrNum * 0.75/0.90)` → `roundPlafon(...)`. OTR 15.650.000 × 75% = 11.737.500 → **11.700.000**

**Backend — Plafon rounding:**
- `backend/app/Services/BroadcastService.php`: tambah `private roundPlafon()` method — rumus PHP yang sama. Ganti `(int) ($otr * 0.75/0.90)` → `$this->roundPlafon(...)`. Template `#plafon` di broadcast juga resolve ke nilai yang dibulatkan

**Frontend — Hapus polling:**
- `frontend/src/pages/admin/UserManagementPage.tsx`: hapus `setInterval(fetchUsers, 10000)` + `clearInterval` — data hanya refresh saat mount/navigate

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-15 — Fix: CORI dropdown one-step lag + instant render

**Sudah di-push ✅ & deployed ✅**

**Root cause:**
`e.target.value` di-baca SETELAH `await` di async handler. `e.target` adalah live reference ke DOM element — selama `await`, React re-render dan revert controlled `<select>` value ke value lama. Akibatnya `calcPlafon()` menerima CORI yang salah (one-step lag):
- MEDIUM → GOOD: plafon tetap 75% (tidak berubah)
- GOOD → MEDIUM: plafon tampil 90% (nilai GOOD, bukan MEDIUM)

**Fix 2 layer:**
1. **Stale value fix**: Capture `newCori = e.target.value` + `otr = selected.dynamic_data?.otr` SEBELUM `await`
2. **Instant render**: Ganti `async/await` → sync `onChange` + `setPinjaman()` langsung, API save di-background (fire-and-forget via `.then()/.catch()`)

**Files:**
- `frontend/src/pages/CalculatorPage.tsx:329-338`: `onChange` sync — `setPinjaman(calcPlafon(otr, newCori))` langsung, `customerService.updateCori()` di-background

### Next steps when resuming
Ketik: `lanjut yang tadi`

### 2026-07-15 — CORI BAD (65% x OTR) + CORI dropdown instant render

**Sudah di-push ✅ & deployed ✅**

**CORI BAD — 6 files diubah:**
- `frontend/src/finance/financeEngine.ts`: `calcPlafon()` tambah `BAD → 65%` (sebelum MEDIUM 75%)
- `frontend/src/pages/CalculatorPage.tsx`: tambah `<option value="BAD">BAD</option>` di 2 dropdown (manual input + info card)
- `frontend/src/pages/admin/CustomerManagementPage.tsx`: tambah option BAD + warna `red-300/red-50/red-700`
- `backend/app/Http/Controllers/Api/CustomerController.php`: validasi `in:BAD,MEDIUM,GOOD,GOOD LOYAL`
- `backend/app/Services/BroadcastService.php`: `mapFormToMessage()` tambah `BAD → 65%`

**CORI reference:**
| CORI | Persentase |
|------|-----------|
| BAD | 65% × OTR |
| MEDIUM | 75% × OTR |
| GOOD | 90% × OTR |
| GOOD LOYAL | 90% × OTR |

### Next steps when resuming
Ketik: `lanjut yang tadi`

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
