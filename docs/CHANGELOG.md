# FIF Broadcast - Changelog Lengkap

Riwayat perubahan lengkap. File ini hanya dibaca saat dibutuhkan.
AGENTS.md hanya menyimpan 2 entri terbaru sebagai konteks aktif.

---

### 2026-08-06 - Audit keamanan PC + rampungkan modernisasi UI

Status: SELESAI (sisa manual: cek router port-forward, aktifkan UAC)

* Audit keamanan PC Windows: tidak ada bukti intrusi (RDP mati, 5 gagal-login lokal, tanpa IP asing, task/startup bersih, AV aktif McAfee + Reason Cybersecurity)
* Hardening: matikan IIS Default Web Site (port 80) + auto-start off; PostgreSQL `listen_addresses` -> `127.0.0.1` (backup postgresql.conf.bak), restart service
* DriverPack/Thunder/Nox ternyata sudah tidak terpasang (hanya sisa aturan firewall)
* UI: survey seluruh 31 halaman -> 0 jadul, semua sudah modern (dark + lucide + shadcn)
* UI: tambah `SplashScreen` (logo + ring conic animasi) dipakai di `loading.tsx` dan `page.tsx` (redirect root)
* Build PASS + lint PASS (warning lama tidak bertambah)

---

### 2026-08-04 - Dekomision VPS lama + hapus fitur proxy WA + push fitur 27-31 Juli

Status: SELESAI - deploy ke VPS baru (push 1 + push 2), VPS lama tidak dipakai lagi

* Hapus referensi VPS lama (202.10.42.237/Rumahweb): deploy/migrate-sqlite-to-postgres.md dihapus, deploy/vps-setup-postgres-redis.sh dihapus, PRD.md diupdate, Secret GitHub VPS_USERNAME dihapus
* Hapus fitur proxy per-user WA: wa-client.js (hapus WA_PROXY_FALLBACK, getUserProxy, resolveProxyAgent), worker/package.json (hapus socks-proxy-agent, https-proxy-agent), User.php, ProfileController.php, migration drop_wa_proxy, frontend settings, profileService.ts, docs/termux-setup.md dihapus
* Push fitur 27-31 Juli: AO roles, Excel import, cabang wilayah/kabupaten, uh_id, redesign UI -- semua di main + ter-deploy ke VPS baru
* Fix deploy script: sw.js block git pull -> ganti reset --hard; dubious ownership -> safe.directory di script
* Verifikasi: git HEAD 61368c7, semua migration Ran (batch 3), wa_proxy COLUMN_GONE, wa-client.js 0 proxy refs, semua service active, site 200, API hidup, Socket.IO OK
* Akses SSH: public key laptop didaftarkan ke /home/fif/.ssh/authorized_keys via workflow temp
* Sisa manual: re-scan WA QR, dekomision VPS lama

---

### 2026-08-04 - Go-live VPS baru: DNS Cloudflare + SSL + auto-sync Cloudflare dari repo

Status: SELESAI (sisa: SSL mode strict opsional + re-scan WA QR)

* DNS cutover: Cloudflare A fif-broadcast.net + www -> 43.129.41.36 (Proxied, orange cloud)
* Auto-sync Cloudflare dari repo: deploy/cloudflare/dns.yaml (source of truth), sync.py (reconciliation), sync.sh (wrapper), .github/workflows/cloudflare-sync.yml
* Firewall VPS: UFW 80/443 HANYA dari 22 range Cloudflare (15 v4 + 7 v6); SSH 22 tetap open
* SSH hardening: PermitRootLogin no + PasswordAuthentication no, key-only
* SSL Lets Encrypt: certbot --nginx, cert valid expire 2026-11-02, auto-renew via systemd timer; nginx listen 80+443, HTTP->HTTPS 301
* Verifikasi: HTTP 301->HTTPS, HTTPS 200 via Cloudflare, API /api/auth/login 401 (hidup)
* Catatan: CF_API_TOKEN tidak punya Zone Settings:Edit -> SSL mode tetap full (bukan strict)

---

### 2026-08-03 - Migrasi VPS: SumoPod (Tencent) 43.129.41.36 + autodeploy GitHub Actions

Status: SELESAI

* VPS baru: SumoPod/Tencent Cloud, 43.129.41.36, Ubuntu Server 24.04 LTS, 2 vCPU / 4GB / 60GB
* deploy/setup-ubuntu.sh (baru): bootstrap Ubuntu -- PHP 8.3, Node 22 LTS, PG 16, Redis, swap 2GB, UFW, user fif
* deploy/deploy-vps.sh (baru): multi-distro, deteksi web user, FPM socket/service, systemd fif-queue/fif-worker/fif-frontend, nginx conf
* .github/workflows/deploy.yml: push main -> SSH -> sudo bash deploy/deploy-vps.sh; teruji end-to-end (41s)
* Key SSH: fif_actions (GH->VPS) + fif_server_github (VPS->GitHub, Deploy key read-only)
* Migrasi data: pg_dump old PG10 -> new PG16, 8224 customers bersih; storage/app 1.2MB via tar-stream
* Deploy pertama: 32 migration, build Next.js, nginx + systemd aktif, HTTP 200, login API OK
* Fix: git safe.directory, set -o pipefail + grep SIGPIPE -> tampung output dulu
* Worker: Socket.io 3001, queue poll 5s; WA perlu re-scan QR (auth_info belum ada)

---

### 2026-07-31 - Cabang Wilayah: kolom kabupaten/kota + deteksi cabang diperbaiki

Status: SELESAI

* Migration add_kabupaten_kota_to_cabang_wilayah: kolom kabupaten_kota, backfill 291 row (Bantul 71, Kota Yogyakarta 46, Kulon Progo 88, Sleman 86), unique index (kabupaten_kota, kecamatan, kelurahan)
* Kecamatan Jetis terpisah: Kota Yogyakarta vs Bantul
* CabangWilayahController::update terima dan simpan kabupaten_kota
* CustomerRepository::detectCabangFromData: normalisasi prefix, match space-insensitive via REPLACE, alias typo (Wukir Sari->Wukisari, Kepuh Harjo->Kepuharjo), skip ambigu 9 kelurahan
* Hapus orphan kec-level Jetis (id 27): record Kota Yogyakarta::Jetis kelurahan NULL yang bikin customer Jetis-Bantul salah assign ke 40200
* Sync ulang syncCustomerCabang: 8218 customer ter-assign; Jetis Kota->40200 (154), Jetis Bantul->43800 (204); 3 null (alamat kosong)
* Cleanup dead code: CabangDetectionService, SyncCustomerCabang, CabangMappingController, CabangRegionMappingSeeder, cabangService.ts
* Fix bug tampilan Jetis tidak menampilkan isi: duplikasi React key -- KABUPATEN_GROUPS skip Jetis, key per kabupaten, expandedKec scope per kabupaten+kecamatan
* CustomerRepository::create/update hitung cabang_id dari dynamic_data otomatis
* CabangWilayahController::update default merge (tidak hapus wilayah lain); full-replace jika replace:true
* Modal detail customer menampilkan Wilayah blok (Kabupaten/Kecamatan/Kelurahan)
* attachWilayahKabupaten() inject computed wilayah_kabupaten di getAll() dan findById()
* Pemulihan 83 wilayah cabang 43800 (71 Bantul + 16 Kota Yogyakarta)
* Verified: compose test, pint, tsc, next build (30 routes), syncCustomerCabang 8218/3 null

---

### 2026-07-30 - Cabang Wilayah: arsitektur ulang + frontend exclusivity

Status: SELESAI

* Ganti: kios_wilayah -> cabang_wilayah (wilayah di level cabang, bukan per kios)
* Migration create_cabang_wilayah_table: unique (kecamatan, kelurahan)
* CabangWilayah.php model + CabangWilayahController (GET all cabang + PUT replace wilayah)
* CustomerRepository::detectCabangFromData() query cabang_wilayah -> cabang_id
* Hapus KiosWilayah.php, KiosWilayahController.php, relasi wilayah() di Kios.php
* Frontend /admin/kios-wilayah: pilih cabang via kartu -> checklist semua DIY wilayah; eksklusivitas wilayah milik cabang lain (strikethrough+lock+label)
* Sidebar: Wilayah Kios -> Wilayah Cabang

---

### 2026-07-29 - AO auto-distribute ke UH

Status: SELESAI

* Migration add_uh_id_to_customers: kolom uh_id nullable FK ke users
* Customer.php: uh_id di fillable, relasi uh() belongsTo User
* CustomerRepository::distributeToUh(): ambil unassigned, group per kios, round-robin per NMC/REFI/other ke UH role, batch update per 500
* AssignmentController::distributeToUh(): endpoint POST /api/assignments/distribute-to-uh
* Frontend: customerService.distributeToUh() + button + modal di admin customers (purple, AO dan superadmin)
* Tested: 8221 data terdistribusi ke 1 UH di kios 40200 (NMC 5781, REFI 2440)

---

### 2026-07-28 - PostgreSQL 16 lokal install + backend pgsql migration

Status: SELESAI

* PostgreSQL 16.14 terinstall di Windows (port 5432, user postgres)
* backend/.env switched to DB_CONNECTION=pgsql
* Database fif + user fif dibuat, migrations sukses (30 migrations, 0 error), seeder sukses
* Fix: 2026_07_12_000003 DROP CONSTRAINT instead of DROP INDEX for PG
* Fix: 2026_07_13_000003 no-op for PG (handled by 2026_07_12)
* Fix: AuthService.php login -- strtoupper hanya untuk npo_mce_id, bukan email (PG case-sensitive)
* Koneksi: Host 127.0.0.1 / Port 5432 / DB fif / User fif / Pass admin

---

### 2026-07-27 - AO role fixes: 9 bugs, login fix, permissions seed

Status: SELESAI (lokal -> push 2026-08-04)

* Login fix: api.ts baseURL missing /api prefix, CORS preflight gagal
* Role AO: routing, sidebar, layouts, seeder, 30+ backend files (superadmin/UH level)
* AO scope fix: CustomerController, BroadcastController, CustomerShareController, AssignmentController, BroadcastService, CustomerRepository, TemplateRepository, NotificationBell
* Excel import backend: migration excel_configs + customer columns, MicrosoftGraphService, CloudExcelService, CloudExcelController (5 endpoints), updated GoogleSheetsService
* AO 9 bug fixes: UserController scope, BroadcastService cancelPending, worker-monitor descriptions, history isAO, dashboard canSeeDetail, broadcast filter UI, role badges
* AO permissions seed: 10 records di role_permissions (semua enabled kecuali user_management)
* NPO005 AO user created (kios 40200/CRE, password 08996789)

---

### 2026-07-26 - PostgreSQL compatibility audit + Worker migration selesai

Status: SELESAI (3 commits: 68a0c87, 527710b, b69bceb)

* Worker: better-sqlite3 -> pg (Node.js PG client); db.js PG Pool + async helpers; semua file async (queue-consumer, socket-server, wa-client, events, broadcast-config, index)
* Fix: ambiguous created_at di JOINs (BroadcastRepository, BroadcastService)
* Fix: date/datetime now() -> PHP now()->startOfDay() params
* Fix: json_extract() -> driver-aware (->>'key' PG, json_extract() SQLite fallback)
* Fix migrations: 2026_07_13_000003 + 2026_07_12_000003 DB::getDriverName() guard
* Restore password hashes: 9 user (double-hashed) -> re-hash dari SQLite backup
* Migrasi data ke PG16: 9578 rows (customers 8224, broadcast_histories 101, dst)
* Redis adapter Socket.IO: @socket.io/redis-adapter + redis client
* opencode.json: OpenRouter provider, model Ling 3.0 Flash (124B MoE, free)
* deploy/vps-health-check.sh: script monitoring VPS

---

### 2026-07-13-14 - Bug fixes: Connect race condition, UH cleanup, broadcast lock, anti-ban

* socket-server.js: wa:request_status handler (fix QR expired), await disconnect sebelum reconnect
* QRScannerPage.tsx: reconnect handler (keep status, dont restart WA)
* CustomerController.php: UH delete cleanup (customer_shares + CustomerSentMark + Notification)
* CustomerShareController.php: data_rolling permission seed ke DB
* CalculatorPage.tsx: autoComplete + inputMode text (fix HP nopol keyboard)
* Broadcast lock: WA connection gating (3 layer protection)
* Worker: reconnect loop fix (timedOut detection), browser identity WhatsApp/Chrome/120.0.0.0
* Worker: WARP proxy support, warmup delay, connectTimeoutMs 30s, keepAlive 180-300s
* Frontend: phone input 08xxx->628xxx

---

### 2026-07-12-13 - Full codebase audit round 1 (24 fixes) + round 2 (31 fixes)

Detail di commit history: git log --oneline

---

### 2026-07-10-11 - Broadcast reliability + connection safety + kalkulator denda

* Retry mechanism (max 3x), optimized ORDER BY RANDOM(), pending stuck event
* Daily limit 200->150
* SQLite fix, smart deploy, performance, kalkulator denda

Detail di commit history: git log --oneline