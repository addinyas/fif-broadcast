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
- `.env` controls: `DB_PATH`, `SOCKET_PORT` (3001), `SOCKET_PATH`, `POLL_INTERVAL_MS` (5000), `MIN_DELAY_SEC` (5), `MAX_DELAY_SEC` (15), `MAX_CONNECTION_HOURS` (8)
- **WA auto-disconnect**: After `MAX_CONNECTION_HOURS` (default 8), worker force-disconnects and clears auth to force QR re-scan. Stale connections cleaned on worker startup too.

## Architecture notes

- **Auth**: Sanctum token + Google OAuth (Socialite). Roles on `users.role`: `superadmin`, `UH`, `marketing`. Role middleware `CheckRole` registered as `role` alias in `bootstrap/app.php`.
- **Default seed accounts**: `superadmin@crm.test`, `admin@crm.test`, `marketing@crm.test`, `marketing2@crm.test` — all password `password`.
- **DB**: SQLite (`database/database.sqlite`). Worker reads/writes directly via `better-sqlite3` with WAL mode (not via API). Worker uses read-only singleton + per-query writable connections.
- **Queue**: Database-driven (`QUEUE_CONNECTION=database`). Backend inserts `broadcast_histories`, worker polls every 5s, processes 5 per batch with 5–15s random delay between sends (anti-ban).
- **Daily limit**: 200 sent messages per user per day, enforced in `BroadcastService::prepare()`. Reset otomatis jam 00:00.
- **Real-time**: Worker runs its own Socket.IO server (port 3001). Frontend connects via socket.io-client (websocket + polling transports). Events: `broadcast:status` (processing/sent/failed), `wa:status` (awaiting_scan/connected/logged_out).
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
| `backend/app/Models/` | `User`, `Customer`, `Template`, `BroadcastHistory`, `RolePermission` |
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
