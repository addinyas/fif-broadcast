# FIF (Finance Installment Follow-up)

WhatsApp broadcast system: Laravel 12 API backend, React 19 + Vite 8 frontend, Node.js WhatsApp worker.

## Resume Command

**Untuk melanjutkan pekerjaan yang belum selesai, ketik: `lanjut yang tadi`**

## Changelog (Laporan Update)

Format: `YYYY-MM-DD — Judul Singkat` → `* aksi-aksi` → status diakhir

---

### 2026-08-04 — Dekomision VPS lama + hapus fitur proxy WA per-user (push semua fitur 27–31 Juli)

**Status: SELESAI — deploy ke VPS baru (push 1 + push 2), VPS lama tidak dipakai lagi ✅**

**Yang sudah dikerjakan:**
- **Hapus referensi VPS lama (202.10.42.237/Rumahweb) dari repo**:
  - `deploy/migrate-sqlite-to-postgres.md` — dihapus (dok migrasi untuk VPS lama)
  - `deploy/vps-setup-postgres-redis.sh` — dihapus (script RHEL/Rumahweb lama; pakai `setup-ubuntu.sh`)
  - `deploy/deploy-vps.sh` — komentar sanitasi (hapus sebutan "Rumahweb")
  - `deploy/setup-ubuntu.sh` — langkah lanjutan tidak lagi menyebut `scp root@202.10.42.237`/pg_dump lama
  - `PRD.md` — bagian "VPS Migration (Rumahweb → Hostingan.id/Kencang.id)" TODO diganti jadi SELESAI ke SumoPod 43.129.41.36
  - Secret GitHub `VPS_USERNAME` (sisa VPS lama, tidak dipakai) — dihapus via `gh secret delete`
  - Artifact build `frontend/dist` lokal yang masih menyimpan IP lama — dibersihkan
- **`.github/workflows/deploy.yml`** — dirapikan: nama job "Deploy to VPS SumoPod", tetap pakai secrets `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY`
- **Hapus fitur proxy per-user WA** (aplikasi jadi mobile-only):
  - `worker/src/wa-client.js` — hapus `WA_PROXY_FALLBACK`, `getUserProxy`, `resolveProxyAgent`, spread proxy di `makeWASocket`
  - `worker/package.json` — hapus `socks-proxy-agent`, `https-proxy-agent`
  - `worker/.env` — hapus `WA_PROXY=socks5://127.0.0.1:1080` (lokal; `.env` di-ignore git)
  - Backend: `User.php` (fillable), `ProfileController.php` (show/update/rules/result), migration `2026_08_04_000001_drop_wa_proxy_from_users_table.php`
  - Frontend: `admin/settings/page.tsx` + `marketing/settings/page.tsx` (hapus blok "WhatsApp Tunnel (Termux)", state `waProxy`, `setupCmd`, `copyToClipboard`), `profileService.ts`, `types/index.ts`
  - `frontend/.env.production` — hapus `NEXT_PUBLIC_TUNNEL_HOST` (file di-ignore git)
  - `docs/termux-setup.md` — dihapus
- **Push semua fitur 27–31 Juli** (yang tadinya ditahan menunggu konfirmasi): AO roles, Excel import, cabang wilayah/kabupaten, uh_id, redesign UI — semua kini di main + ter-deploy ke VPS baru
- **Fix deploy script** (3 kendala berurutan):
  - `sw.js` berubah lokal di VPS menahan `git pull --ff-only` → `deploy-vps.sh` ganti `git fetch origin main; git reset --hard origin/main`
  - reset di workflow (sebelum panggil script) bikin `BEFORE==AFTER` → script `exit 0` **tanpa jalankan migrate** → workflow dikembalikan ke pemanggilan script polos
  - dubious ownership saat git jalan non-root → safe.directory di-handle di dalam script
- **Verifikasi pasca-deploy (via workflow temp + SSH)**:
  - git HEAD = `61368c7`, semua migration `Ran` (batch 3: fitur 27–31 Juli + drop `wa_proxy`)
  - kolom `users.wa_proxy` = `COLUMN_GONE` ✅
  - `wa-client.js` = 0 referensi proxy ✅
  - `worker/.env` di VPS masih `WA_PROXY=socks5://127.0.0.1:1080` (file di-ignore git, tidak ikut deploy) → dihapus manual via sed → sekarang **0 (bersih)** ✅
  - `auth_info` masih kosong (menunggu re-scan QR)
  - Semua service active; site 200, API 422/401 (hidup), Socket.IO handshake OK
- **Akses SSH**: public key laptop (`addinyas@gmail.com`) didaftarkan ke `/home/fif/.ssh/authorized_keys` via workflow temp (fif tidak punya sudo NOPASSWD, jadi operasi root via GitHub Actions) — workflow temp sudah dihapus setelah selesai
- Verifikasi lokal: `node --check wa-client.js` OK, `npm run build` sukses, `php artisan test` PASS, `pint` passed, `bash -n` pada script deploy OK

**Sisa (manual):**
1. Re-scan WA QR di VPS baru (auth_info masih kosong) — buka `/admin/connect` atau `/marketing/connect` di browser
2. Dekomision VPS lama (202.10.42.237) — berhenti bayar setelah WA sudah jalan di VPS baru

---

### 2026-08-04 — Go-live VPS baru: DNS cutover Cloudflare + SSL + auto-sync Cloudflare dari repo

**Status: SELESAI ✅ (sisa: SSL mode strict opsional + re-scan WA QR)**

**Yang sudah dikerjakan:**
- **DNS cutover** — Cloudflare: A `fif-broadcast.net` + `www` → `43.129.41.36` (Proxied, orange cloud) → `nslookup` resolve ke IP Cloudflare
- **Arsitektur aman** — Internet Publik → Cloudflare (proxied) → VPS baru; IP origin tersembunyi
- **Auto-sync Cloudflare dari repo** (baru):
  - `deploy/cloudflare/dns.yaml` — source of truth (zone, ssl_mode, records)
  - `deploy/cloudflare/sync.py` — reconciliation (create/update/delete duplikat/cleanup record tak sesuai config), set ssl_mode, **tidak menyentuh record non-managed** (MX/SPF/dll)
  - `deploy/cloudflare/sync.sh` — wrapper bash untuk run manual
  - `.github/workflows/cloudflare-sync.yml` — trigger push `deploy/cloudflare/**` + `workflow_dispatch`; pakai secret `CF_API_TOKEN` (semua API call dari server GitHub → IP laptop tak terlihat Cloudflare)
  - Teruji: run pertama hijau (16s), 2 record A di-verify SKIP (sudah benar), **tidak ada record lama 202.10.42.237 tersisa**
- **Firewall VPS baru** — UFW 80/443 HANYA dari 22 range Cloudflare (15 v4 + 7 v6), `Anywhere` dihapus; SSH 22 tetap open (untuk GitHub Actions deploy)
- **SSH hardening** — `PermitRootLogin no` + `PasswordAuthentication no` (key-only), `sshd -t` OK, koneksi ulang via key tetap jalan; backup config disimpan
- **SSL Let's Encrypt** — `certbot certonly --nginx -d fif-broadcast.net -d www.fif-broadcast.net` → cert valid (expire 2026-11-02, auto-renew via systemd timer); deploy ulang → nginx listen 80+443, HTTP→HTTPS 301 redirect, cert origin = Let's Encrypt
- **Verifikasi end-to-end** — HTTP 301→HTTPS, HTTPS 200 via Cloudflare, frontend 200, API `/api/auth/login` respons 401 (kredensial produksi, endpoint hidup)
- **Kendala yang ditemukan** — SSL mode Cloudflare saat ini `full`; `sync.py` coba set `ssl_mode` dari config tapi **token `CF_API_TOKEN` tidak punya izin Zone Settings:Edit** (hanya DNS:Edit) → step SSL mode jalan tapi graceful (print GAGAL, run tetap sukses). Untuk otomatisasi SSL mode: buat token + tambah permission `Zone → Zone Settings → Edit`, update secret, ubah `dns.yaml` `ssl_mode: strict`
- **Catatan** — catatan `2026-08-03` sebelumnya: "menunggu DNS cutover + SSL" → sudah beres. Sisa manual: re-scan WA QR (auth_info masih kosong di VPS baru)

---

### 2026-08-03 — Migrasi VPS: SumoPod (Tencent) 43.129.41.36 + autodeploy GitHub Actions

**Status: SELESAI ✅ (menunggu DNS cutover + SSL + re-scan WA QR)**

**Yang sudah dikerjakan:**
- VPS baru dibeli: SumoPod/Tencent Cloud, `43.129.41.36`, Ubuntu Server 24.04 LTS, 2 vCPU / 4GB / 60GB, user `ubuntu` (sudo NOPASSWD)
- `deploy/setup-ubuntu.sh` (baru): bootstrap Ubuntu — PHP 8.3 (ondrej), Node 22 LTS, PostgreSQL 16, Redis, swap 2GB, UFW, user `fif`, deploy key server→GitHub, clone repo, `.env` fallback, deploy awal
- `deploy/deploy-vps.sh` (baru, sudah keluar dari `.gitignore`): multi-distro — deteksi web user (`www-data`/`apache`), FPM socket/service (Ubuntu vs RHEL), systemd fif-queue/fif-worker/fif-frontend, nginx conf (HTTP/HTTPS), `--force`
- `.github/workflows/deploy.yml`: push `main` → `appleboy/ssh-action` → `sudo bash deploy/deploy-vps.sh`; secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`; **teruji end-to-end ✅** (run hijau 41s)
  - Fix: guard `secrets` di `if` tidak didukung GitHub Actions (semua level) → dihapus
- Key SSH: `fif_actions` (GitHub Actions → VPS) + `fif_server_github` (VPS → GitHub pull, terdaftar sebagai Deploy key read-only) — keduanya terverifikasi
- `.env` asli dari server lama (`old_backend.env`/`old_worker.env`) dipindah via scp, tanpa di-echo
- Migrasi data: `pg_dump` old (PG 10, 8224 customers, 20 tabel) → new (PG 16) **bersih** (error DROP-only pada DB kosong, tidak fatal); storage/app 1.2MB via tar-stream
- Deploy pertama: composer install, migrate (32 migration = kondisi produksi lama), build Next.js, nginx + systemd aktif, HTTP 200, login API OK
  - Fix: `git safe.directory` saat deploy dijalankan root (dubious ownership)
  - Fix: `set -o pipefail` + `grep -q` bikin `systemctl list-unit-files` kena SIGPIPE → deteksi FPM salah → tampung output dulu baru grep
- Worker jalan: Socket.io 3001, queue poll 5s, env ter-inject; **WA perlu re-scan QR** (auth_info belum ada)
- `.gitignore`: + `/worker/.env.*`, `**/*.key`, `**/*.pem`, `**/*.p12`, `**/*.pfx`
- **Cleanup secret**: `deploy/vps-setup-postgres-redis.sh` password asli (`fifbroadcast2026` & hash) → placeholder `GANTI_DENGAN_PASSWORD_AMAN`
- **Catatan**: kerja fitur 27–31 Juli (AO roles, Excel import, cabang wilayah/kabupaten, uh_id, redesign UI) **belum di-push** — repo main = kode produksi lama; VPS baru sengaja mirror produksi lama (DB 32 migration konsisten). Keputusan push fitur menunggu konfirmasi.

**Sisa (manual):**
1. DNS Cloudflare: A `fif-broadcast.net` + `www` → `43.129.41.36`
2. SSL: `certbot --nginx -d fif-broadcast.net -d www.fif-broadcast.net` lalu deploy ulang
3. Re-scan WA QR via halaman WA Monitor

---

### 2026-07-31 — Cabang Wilayah: kolom kabupaten/kota + deteksi cabang diperbaiki

**Status: SELESAI ✅**

**Yang sudah dikerjakan:**
- Migration `2026_07_31_000001_add_kabupaten_kota_to_cabang_wilayah_table` — kolom `kabupaten_kota`, backfill 291 row (Bantul 71, Kota Yogyakarta 46, Kulon Progo 88, Sleman 86), unique index jadi `(kabupaten_kota, kecamatan, kelurahan)`
- Kecamatan "Jetis" kini benar-benar terpisah: Kota Yogyakarta (Bumijo/Cokrodiningratan/Gowongan) vs Bantul (Canden/Patalan/Sumberagung/Trimulyo) — bisa dimiliki cabang berbeda
- `CabangWilayahController::update` — terima & simpan `kabupaten_kota`, key jadi `kabupaten::kecamatan::kelurahan`
- `CustomerRepository::detectCabangFromData` — normalisasi prefix (`Kec `/`Kel `/`Kecamatan `/`Kelurahan `/`Kabupaten `/`Kab. `), match berdasarkan **kecamatan+kelurahan** (bukan kelurahan saja), pakai kabupaten jika tersedia, skip bila ambigu (9 kelurahan yang muncul di 2-3 kecamatan kini aman: Argomulyo, Caturharjo, Jatimulyo, Ngestiharjo, Pleret, Sendangsari, Sidomulyo, Sidorejo, Triharjo)
- **Match space-insensitive**: data customer lama sistemik pakai spasi di kata majemuk (`Sumber Agung`, `Gedong Tengen`, `Purwo Martani`, dll) — `queryCabangWilayah()` fallback pakai `REPLACE(...,' ','')` di kecamatan+kelurahan+kabupaten. Audit 292 kombinasi alamat customer: semua resolve, **0 ambigu**
- **Alias typo**: `Cangkringan/Wukir Sari`→`Wukisari` & `Cangkringan/Kepuh Harjo`→`Kepuharjo` (3 customer) via `KELURAHAN_ALIASES`
- **Hapus orphan kec-level Jetis (id 27)**: record `Kota Yogyakarta::Jetis` (kelurahan NULL, cabang 40200) yang tak tampil di UI & membuat customer Jetis-Bantul tanpa match kelurahan salah ter-assign ke 40200 — sekarang fallback kec-level tidak bisa menangkap mereka
- **Sync ulang**: `syncCustomerCabang()` — 8218 customer ter-assign; Jetis Kota → 40200 (154), Jetis Bantul → 43800 (204); sisa 3 null karena data alamat kosong (bukan bug)
- Cleanup dead code yang mereferensikan tabel `cabang_region_mappings` (sudah di-drop): `CabangDetectionService`, `SyncCustomerCabang`, `CabangMappingController`, `CabangRegionMappingSeeder`, `cabangService.ts`
- Frontend `/admin/kios-wilayah` — `makeKey` sertakan kabupaten, toggle/save kirim `kabupaten_kota`, fix `allLocked` untuk kecamatan tanpa kelurahan
- **Fix bug tampilan "Jetis tidak menampilkan isi"**: duplikasi React key `key='Jetis'` (baris grup kosong + baris khusus JETIS_YOGYA/JETIS_BANTUL di kabupaten yang sama) membuat React membuang baris berisi kelurahan. Perbaikan: `KABUPATEN_GROUPS` skip 'Jetis', key jadi `makeKey(kabupaten, kecamatan, null)` per kabupaten, `expandedKec` di-scope per kabupaten+kecamatan (tidak saling tabrak), `toggleKecamatan` terima `kels` eksplisit, dan `checked` init difilter `isRenderableRow` (kec-level tak terlihat tidak ikut tersimpan ulang)
- **Customer menyesuaikan wilayah otomatis**: `CustomerRepository::create/update` kini hitung `cabang_id` dari `dynamic_data` saat create manual & saat `dynamic_data` berubah (update nama saja tidak menyentuh cabang_id). `CabangWilayahController::update` otomatis panggil `syncCustomerCabang()` setelah wilayah disimpan (respons tambah `synced_customers`). Verified via tinker: create `Kec Jetis/Kel Sumber Agung` (spasi) → 43800, update `Kel Bumijo` → 40200, update nama saja tetap 40200, endpoint update round-trip ✅
- **Modal detail customer menampilkan Wilayah**: blok "Wilayah" baru di modal Detail Customer (admin & marketing) dengan label rapi `Kabupaten`/`Kecamatan`/`Kelurahan`, prefix `Kec `/`Kel `/`Kabupaten `/`Kab. ` dihapus untuk tampilan, kabupaten diresolve dari `kabupaten_kota|kabupaten|kab_kota|kota_kabupaten|kota`. Kunci wilayah dihapus dari `dynamicFields` & di-skip di fallback raw agar tidak duplikat
- **Kabupaten tampil di modal detail (fix "-")**: data customer tidak pernah menyimpan kabupaten (0 dari 8218), jadi `CustomerRepository` inject computed attribute `wilayah_kabupaten` di `getAll()` & `findById()` via `attachWilayahKabupaten()` — lookup `cabang_wilayah` space-insensitive (`stripRegionSpaces`) dengan key `kecamatan|kelurahan` → `kabupaten_kota`. Frontend `getWilayah(c)` fallback: `kabupaten_kota|kabupaten|kab_kota|kota_kabupaten|kota|wilayah_kabupaten`; `interface Customer` + `wilayah_kabupaten?: string | null`
- **Pemulihan 83 wilayah cabang 43800**: tes round-trip endpoint `update` (kirim hanya 4 Jetis-Bantul) menghapus 83 wilayah milik 43800 karena update bersifat replace-total. Dipulihkan penuh: 71 row Bantul (16 kecamatan) + 16 row Kota Yogyakarta (Kotagede/Mantrijeron/Umbulharjo/Wirobrajan) → total 87 (sama seperti semula; 40200 tetap 207)
- **Proteksi replace**: `CabangWilayahController::update` kini default **merge** (hanya menambah, TIDAK menghapus wilayah lain); full-replace hanya jika `replace: true` dikirim (UI `/admin/kios-wilayah` mengirim `replace: true` karena selalu mengirim set penuh). Verified: payload 1 wilayah tanpa `replace` → count tetap 87+1; dengan `replace: true` → jadi 2 row
- Verified: `composer run test` ✅, `pint` ✅, `tsc --noEmit` ✅, `next build` ✅ (30 routes), `syncCustomerCabang` 8218 / 3 null (alamat kosong)
- Verified: `php artisan migrate` ✅, `composer run test` ✅, `pint` ✅, `tsc --noEmit` ✅, `next build` ✅ (30 routes), endpoint index/update round-trip ✅
- Verified pasca-pemulihan: lookup `wilayah_kabupaten` di `getAll()` benar (`Kec Mantrijeron`→`Kota Yogyakarta`, `Kec Sewon`→`Bantul`, dst), mode merge/replace di endpoint teruji (merge 1 payload → 88 row, replace → 2 row), lalu 43800 dikembalikan ke 87 dan `syncCustomerCabang` 8218/3 null ✅

---

### 2026-07-30 — Cabang Wilayah: arsitektur ulang + frontend exclusivity

**Status: SELESAI ✅**

**Yang sudah dikerjakan:**
- Ganti pendekatan: `kios_wilayah` → `cabang_wilayah` — wilayah ditentukan di level cabang, bukan per kios
- Migration `create_cabang_wilayah_table` — unique `(kecamatan, kelurahan)` mencegah duplikasi antar cabang
- `CabangWilayah.php` model + `CabangWilayahController` (GET all cabang + PUT replace wilayah)
- `CustomerRepository::detectCabangFromData()` — query `cabang_wilayah` langsung dapet `cabang_id`
- Hapus `KiosWilayah.php`, `KiosWilayahController.php`, relasi `wilayah()` di `Kios.php`
- Frontend: halaman `/admin/kios-wilayah` — pilih cabang via kartu modern → checklist semua DIY wilayah
- Eksklusivitas: wilayah milik cabang lain tampil strikethrough + lock + label, tidak bisa dicentang
- Sidebar label: "Wilayah Kios" → "Wilayah Cabang"
- Fix: `composer dump-autoload` (controller not found), import `CabangWilayahController` di routes, undefined guard di toggleKecamatan

---

### 2026-07-29 — AO auto-distribute ke UH (backend + frontend)

**Status: SELESAI — backend endpoint + frontend button di admin customers page ✅**

**Yang sudah dikerjakan:**
- Migration `2026_07_28_000001_add_uh_id_to_customers_table` — kolom `uh_id` nullable FK ke `users`
- `Customer.php` model: `uh_id` di `$fillable`, relasi `uh()` belongsTo User
- `CustomerRepository::distributeToUh()` — ambil unassigned customers, group per kios, distribusi round-robin per NMC/REFI/other ke UH role, batch update per 500
- `AssignmentController::distributeToUh()` — endpoint `POST /api/assignments/distribute-to-uh`
- Route scoping: AO lihat semua kios, non-AO/superadmin scope ke kios sendiri
- Frontend: `customerService.distributeToUh()` + button + modal di admin customers (purple, visible for AO & superadmin)
- Tested: 8221 data terdistribusi ke 1 UH di kios 40200 (NMC 5781, REFI 2440)

---

### 2026-07-28 — PostgreSQL 16 lokal install + backend pgsql migration ✅

**Deadline: 30 Juli 2026 — SELESAI**
**Status: SELESAI — backend running on PostgreSQL**

**Yang sudah dikerjakan:**
- PostgreSQL 16.14 terinstall di Windows (port 5432, user postgres, password admin)
- Worker (.env) sudah pointing ke PostgreSQL ✅
- `backend/.env` switched to `DB_CONNECTION=pgsql` ✅
- Database `fif` + user `fif` dibuat ulang ✅
- Migrations sukses (30 migrations, 0 error) ✅
  - Fix: `2026_07_12_000003` — `DROP CONSTRAINT` instead of `DROP INDEX` for PG
  - Fix: `2026_07_13_000003` — no-op for PG (handled by `2026_07_12`)
- Seeder sukses (5 users + roles + kios + templates) ✅
- Login test sukses via PostgreSQL ✅
- **Fix**: `AuthService.php` login — `strtoupper` hanya untuk `npo_mce_id`, bukan email (PG case-sensitive)

**Referensi koneksi PostgreSQL:**
```
Host: 127.0.0.1
Port: 5432
Database: fif
User: fif
Password: admin
```

### 2026-07-27 — AO role fixes: 9 bugs, login fix, permissions seed

**Belum di-push (lokal)**
- **Login fix**: `api.ts` baseURL `${NEXT_PUBLIC_API_URL}/api` — sebelumnya missing `/api` prefix, CORS preflight gagal
- **M.1: Role AO** — routing, sidebar, layouts, seeder, 30+ backend files (superadmin/UH level)
- **M.1b: AO scope fix** — AO lihat semua kios di CustomerController, BroadcastController, CustomerShareController, AssignmentController, BroadcastService, CustomerRepository, TemplateRepository, NotificationBell
- **M.2: Excel import backend** — migration `excel_configs` + customer columns, `MicrosoftGraphService`, `CloudExcelService`, `CloudExcelController` (5 endpoints), updated `GoogleSheetsService`
- **AO 9 bug audit & fix**:
  1. `UserController.php:29` — AO user list scoped to own kios → now sees ALL kios (like superadmin)
  2. `BroadcastService.php:289` — `cancelPending` scoped AO to kios → now cancels ALL
  3. `admin/worker-monitor/page.tsx` — missing AO description + kios filter
  4. `marketing/worker-monitor/page.tsx` — same as #3
  5. `admin/history/page.tsx` — `isAdmin` excludes AO → added `isAO`
  6. `marketing/history/page.tsx` — same as #5
  7. `admin/dashboard/page.tsx` — `canSeeDetail` excludes AO → added
  8. `admin+broadcast/broadcast/page.tsx` — marketing filter UI only for UH → now also AO
  9. `admin+broadcast/broadcast/page.tsx` — role badge only UH → added AO badge
- **AO permissions seed** — `role_permissions` table: AO punya 10 records (semua feature `enabled=1` kecuali `user_management`)
- **NPO005 AO user** — created in local DB (kios 40200/CRE, password 08996789)
- **NotificationController.php** — wrap cleanup logic dalam try-catch (fix `users_backup` table missing di SQLite)
- **`frontend/src/services/api.ts`** — `baseURL` fix: `${process.env.NEXT_PUBLIC_API_URL || ''}/api`
- **`frontend/src/app/(dashboard)/admin/users/page.tsx`** — tambah AO option di role dropdown + AO badge color
- **`backend/routes/api.php:146`** — users route middleware: `superadmin,UH` → `superadmin,UH,AO`
- **`backend/database/seeders/RolePermissionSeeder.php`** — `user_management` default: `false` → `true` untuk UH & AO
- **`frontend/.env.local`** — `NEXT_PUBLIC_API_URL=http://localhost:8000`

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

### 2026-07-26 — PostgreSQL compatibility audit + Worker migration selesai

**Sudah di-push ✅ (3 commits: 68a0c87, 527710b, b69bceb)**
- Restore password hashes: 9 user (double-hashed oleh Eloquent) → re-hash dari SQLite backup
- Fix ambiguous `created_at` di JOINs: `BroadcastRepository`, `BroadcastService` → qualified `broadcast_histories.created_at`
- Fix SQLite functions: `date('now')`/`datetime('now')` → PHP `now()->startOfDay()` params
- Fix `json_extract()`: 3 lokasi → driver-aware (`->>'key'` untuk PG, `json_extract()` untuk SQLite fallback)
- Fix migrations: `2026_07_13_000003` + `2026_07_12_000003` → `DB::getDriverName()` guard
- **Worker migration: `better-sqlite3` → `pg` (Node.js PostgreSQL client)**
  - `db.js`: PG Pool + async helpers (`query`, `getOne`, `getAll`)
  - `queue-consumer.js`: all SQL async, `$1/$2/$3` params, `NOW()`/`CURRENT_DATE`
  - `socket-server.js`: async `validateToken`/`getWAStatusFromDB`
  - `wa-client.js`: async `getUserProxy`/`saveConnectionStatus`, `ON CONFLICT` upsert
  - `events.js`: async `emitBroadcastGlobalStatus`
  - `broadcast-config.js`: async `loadSettings`
  - `index.js`: stale cleanup + stuck reset via pg pool
- Deploy script: hapus SQLite chmod/chown/ACL references
- Audit selesai: 0 SQLite references di worker, 0 unguarded SQLite functions di backend

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
- `.env` controls: PG_HOST/PG_PORT/PG_DATABASE/PG_USER/PG_PASSWORD, SOCKET_PORT (3001), POLL_INTERVAL_MS, MIN_DELAY_SEC, MAX_DELAY_SEC

## Architecture notes

- **Auth**: Sanctum token + Google OAuth (Socialite). Roles: `superadmin`, `UH`, `AO`, `marketing`
- **Default seed**: `superadmin@crm.test`, `admin@crm.test`, `marketing@crm.test`, `marketing2@crm.test` — all password `password`
- **AO test**: `NPO005` / `08996789` (kios 40200/CRE)
- **API baseURL**: `NEXT_PUBLIC_API_URL` di `.env.local` (dev: `http://localhost:8000`), api.ts appends `/api`
- **DB**: PostgreSQL 16 (`fif` database via TCP 127.0.0.1:5432). Worker reads/writes directly via `pg` (Node.js)
- **Cache/Queue/Session**: Redis 7 (localhost:6379)
- **Queue**: Redis-driven (QUEUE_CONNECTION=redis)
- **Daily limit**: 150 sent messages per user per day
- **Retry**: Worker retries failed messages up to 3x (`retry_count` column)
- **Real-time**: Worker Socket.IO server (port 3001), events `broadcast:status`, `wa:status`, `broadcast:pending_stuck`
- **Pattern**: Repository interfaces in `app/Interfaces/`, impls in `app/Repositories/`
- **Template variables**: `#nomor_contract`, `#nama`, `#motor_dan_tahun`, `#plat`, `#angsuran_kurang`, `#input_angsuran`, `#dinego_jadi`, `#pinjaman`, `#pelunasan`, `#terima`, `#tenor`, `#sisa_angsuran`
- **WA Client**: Baileys `makeWASocket` with `useMultiFileAuthState`
