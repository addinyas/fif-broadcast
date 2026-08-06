# FIF (Finance Installment Follow-up)

WhatsApp broadcast system: Laravel 12 API backend, React 19 + Next.js 15 frontend, Node.js WhatsApp worker.

## Resume Command

**Untuk melanjutkan pekerjaan yang belum selesai, ketik: lanjut yang tadi**

## Mode Kerja Ponytail (AI memilih full/ultra)

- Default: full -- tangga YAGNI -> stdlib -> native -> satu baris, diff terpendek.
- Saat membuat fitur baru, AI menyesuaikan levelnya sendiri:
  - ultra jika fiturnya rawan over-build: spekulatif, butuh abstraksi/dependensi/file baru, requirement samar -> tantang dulu, hapus sebelum tambah, tawarkan versi minimal sebelum versi penuh.
  - full jika fiturnya jelas dan konkret: bangun lengkap sesuai permintaan, tapi tetap minimal dan pakai yang sudah ada.
  - Sebutkan pilihan level + alasannya (1 baris) di awal jawaban.
- Tugas non-kode (dokumen/riset/desain/eksplanasi) -> full, penjelasan lengkap bila diminta.

## Changelog (Laporan Update)

Format: YYYY-MM-DD -- Judul Singkat -> * aksi-aksi -> status diakhir

> Riwayat lengkap: lihat docs/CHANGELOG.md

---

### 2026-08-06 -- Roadmap fitur + W.1-W.2 warm-up (anti-ban)

Status: W.1 & W.2 SELESAI -- lanjut W.3 (UI tanam nomor)

* `docs/ROADMAP.md`: master plan semua fitur (Warm-up W.1-W.9, Single Data M.3-M.12, Meta WABA, API, Mobile)
* W.1: migration `number_warmup_profiles` + model + `WarmupService` (stage passive/active/mature, batas harian, reset otomatis via `counter_date`)
* W.2: gate di worker `warmup-gate.js` (mirror service) + gate sebelum kirim + jitter jeda per nomor; legacy tanpa profile tidak diblokir
* Test 10 pass (82 assertions) + pint + worker test PASS; W.1 sudah deploy ke VPS

---

### 2026-08-06 -- Audit keamanan PC + rampungkan modernisasi UI

Status: SELESAI (sisa manual: cek router port-forward + aktifkan UAC)

* Audit keamanan PC: tidak ada bukti intrusi; IIS (port 80) dimatikan; PostgreSQL `listen_addresses` -> `127.0.0.1`
* UI: survey 31 halaman -> 0 jadul; tambah SplashScreen untuk loading.tsx & page.tsx
* Build + lint PASS

---

### 2026-08-04 -- Dekomision VPS lama + push semua fitur 27-31 Juli

Status: SELESAI -- deploy ke VPS baru, VPS lama tidak dipakai lagi

* Hapus referensi VPS lama (202.10.42.237/Rumahweb) dari repo
* Hapus fitur proxy per-user WA (wa-client.js, package.json, User.php, frontend settings)
* Push fitur 27-31 Juli ke main: AO roles, Excel import, cabang wilayah, uh_id, redesign UI
* Fix deploy script (reset --hard, safe.directory), verifikasi: git HEAD 61368c7, site 200
* Sisa manual: re-scan WA QR + dekomision VPS lama

---

### 2026-08-04 -- Go-live VPS baru: DNS Cloudflare + SSL + auto-sync

Status: SELESAI

* DNS cutover: A fif-broadcast.net + www -> 43.129.41.36 (Proxied, Cloudflare)
* Auto-sync Cloudflare dari repo: deploy/cloudflare/dns.yaml + sync.py + GH Actions workflow
* Firewall VPS: UFW 80/443 dari range Cloudflare; SSL Lets Encrypt cert expire 2026-11-02
* Verifikasi: HTTP->HTTPS 301, HTTPS 200, API hidup

---

## Directory Ownership

| Dir | Tech | Entrypoint |
|-----|------|------------|
| backend/ | Laravel 12, PHP 8.2, PostgreSQL 16 + Redis 7 | routes/api.php, public/index.php |
| frontend/ | React 19, TS, Next.js 15, TailwindCSS 4 + shadcn/ui | src/app/layout.tsx -> app/(dashboard)/ |
| worker/ | Node.js (CommonJS), Baileys WhatsApp | src/index.js |

## Dev commands

Backend (from backend/): composer run dev, composer run test, php artisan migrate, ./vendor/bin/pint
Frontend (from frontend/): npm run dev (port 5173), npm run build, npm run lint (oxlint)
Worker (from worker/): npm run start -- .env: PG_HOST/PORT/DATABASE/USER/PASSWORD, SOCKET_PORT=3001

## Architecture notes

- Auth: Sanctum token + Google OAuth. Roles: superadmin, UH, AO, marketing
- Default seed: superadmin@crm.test, admin@crm.test, marketing@crm.test -- password: password
- AO test: NPO005 / 08996789 (kios 40200/CRE)
- API: NEXT_PUBLIC_API_URL=http://localhost:8000 (dev), api.ts appends /api
- DB: PostgreSQL 16, fif DB, TCP 127.0.0.1:5432. Worker via pg (Node.js)
- Queue/Cache/Session: Redis 7 localhost:6379; daily limit 150 msg/user; retry 3x
- Real-time: Socket.IO port 3001, events: broadcast:status, wa:status, broadcast:pending_stuck
- Pattern: Repository interfaces app/Interfaces/, impls app/Repositories/
- Template vars: #nomor_contract #nama #motor_dan_tahun #plat #angsuran_kurang #input_angsuran #dinego_jadi #pinjaman #pelunasan #terima #tenor #sisa_angsuran
- WA Client: Baileys makeWASocket + useMultiFileAuthState
- VPS: SumoPod 43.129.41.36, deploy via GitHub Actions -> deploy/deploy-vps.sh
