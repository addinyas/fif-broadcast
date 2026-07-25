# Product Requirements Document — FIF Modernization

## Keputusan Teknik Final
| Layer | Technology | Alasan |
|-------|-----------|--------|
| **Web** | Next.js 15 (React 19) | Modern, SSR, App Router, interactive |
| **Mobile** | React Native (Expo) | 1 ecosystem React, interactive, private APK |
| **Backend** | Laravel 12 (tidak berubah) | API sama untuk web & mobile |
| **WhatsApp Worker** | Node.js, Baileys, Socket.IO | Tetap |
| **AI Assistant** | opencode + OpenRouter (free tier) | Tetap |
| **Database** | PostgreSQL 16 + Redis 7 (migrasi dari SQLite) | Real-time, 6 kios concurrent |
| **Deploy** | VPS Rumahweb (202.10.42.237), PHP-FPM + nginx | Tetap |

---

## Web: Next.js 15 (React 19)

### Kenapa Next.js (bukan Svelte/Flutter)
- React ecosystem — sama dengan yang web sekarang
- Interactive (animasi, gesture, real-time WebSocket)
- SSR + SEO-friendly
- App Router (modern routing)
- Deploy via PHP-FPM atau Vercel

### Web Upgrade Plan (Phase 0)
1. PWA (installable di HP, offline, splash screen)
2. Mobile-first responsive redesign
3. Page transitions & micro-interactions
4. Skeleton loading screens
5. Touch-friendly UI (button 44x44px)
6. Bottom navigation di mobile
7. Optimistic updates (Instant feedback)
8. Bundle splitting via Next.js

---

## Mobile: React Native (Expo)

### Kenapa React Native (bukan Flutter)
- 1 ecosystem (React/TypeScript) — tim sudah mahir React
- Interactive (native gestures, Reanimated, haptic)
- Expo = paling mudah develop + test di HP (Expo Go, scan QR)
- Private APK — gratis, tanpa Play Store

### Mobile Features
- Dashboard ringkasan
- Prospect List (data customer)
- Broadcast Form (template variabel live preview)
- Broadcast History (tabel terkirim/gagal/pending)
- WhatsApp Connect (QR Scanner native + Pairing Code)
- Settings (nama panggilan, telepon, kios)
- Push notification (Firebase)
- Haptic feedback on actions
- Camera for QR scan (native)
- Clipboard & Share
- Offline support (cache + sync)
- Background message queue

### Distribusi
- Private APK via `eas build --platform android`
- Tidak diupload ke Play Store / App Store
- Distribusi manual (file share / internal link)
- Update: kirim APK baru ke user

### Biaya
- Expо SDK: ✅ Gratis
- EAS Build: ✅ Gratis 1 build/bln
- Firebase (push): ✅ Gratis (free tier)
- Total: **$0**

---

## Shared API (Web + Mobile sekaligus)
- Endpoint Laravel `/api/*` — sama untuk kedua platform
- Auth: Sanctum token
- WebSocket: Socket.IO (shared real-time)
- WhatsApp Worker: Node.js backend (sama)

---

## Timeline

| Phase | Durasi | Isi |
|-------|--------|-----|
| 0: Web PWA + Next.js Modernisasi | 3-4 minggu | Web modern, interactive, mobile-friendly |
| 1: API Prep | 1 minggu | Versioning, rate limit |
| 2: React Native Mobile App | 5-6 minggu | Flutter-level interactive, private APK |
| 3: Advanced | Nanti | Widget Android, deep link, real-time sync |

---

## PRD v2 — React + Next.js + React Native
- Keputusan 25 Jul 2026: web → Next.js (React 19), mobile → React Native (Expo), bukan Svelte/flutter
- Semua dalam 1 React ecosystem

## Database Architecture Decision

### PostgreSQL + Redis (Final Decision)

| Parameter | Value |
|-----------|-------|
| Database | PostgreSQL 16 |
| Cache + Real-time broker | Redis 7 |
| Total records (6 kios × 2500 avg) | ~15,000 rows |
| Concurrent users | 6 kios × marketing + UH + superadmin |
| Broadcast worker | 1 (Node.js Baileys) |
| Real-time requirement | <100ms latency |

### Why PostgreSQL + Redis (not SQLite)
- **Concurrent writes** — 6 kios writing simultaneously (SQLite locks entire DB on write)
- **LISTEN/NOTIFY** — PostgreSQL triggers events immediately → Socket.IO → instant push to all clients (no 5s polling)
- **Redis Pub/Sub** — real-time event distribution between Laravel backend, Socket.IO server, and worker
- **Redis cache** — sub-millisecond reads for hot data (dashboard stats, broadcast progress)
- **Scalability** — PostgreSQL handles concurrent reads/writes from multiple kios without lock contention
- **JSONB** — PostgreSQL supports indexed JSON columns (replaces SQLite dynamic_data JSON)

### Architecture
```
Laravel (PHP-FPM) ↔ PostgreSQL (read/write main data)
                      Redis (cache + pub/sub)
                      Socket.IO (Node.js, port 3001) ↔ Redis Pub/Sub ↔ Laravel events
Worker (Node.js) ↔ PostgreSQL (read/write, WAL mode) ↔ Redis (queue/status)
Frontend (Next.js) ↔ Laravel API ↔ PostgreSQL/Redis
Mobile (Flutter via React Native) ↔ Laravel API ↔ PostgreSQL/Redis
```

### Migration Plan
1. Install PostgreSQL + Redis on VPS
2. Laravel: update `.env` (DB_CONNECTION=pgsql, REDIS_HOST)
3. Convert SQLite database → PostgreSQL using `sqlite3 -> psql` migration
4. Update Eloquent models (minor JSONB changes)
5. Add Redis pub/sub for Socket.IO events
6. Remove SQLite-specific optimizations (WAL, busy_timeout)
7. Test all endpoints + WebSocket events
8. Deploy with PostgreSQL + Redis running as systemd services

---

## Modul Baru: Single Data, Hierarki Multi-Level & Live Sync Cloud Excel

### Tujuan Modul
Membangun sistem distribusi data berjenjang (AO → UH → Marketing) dengan eksekusi pesan individual dan live sync laporan Real-time ke file Excel/Google Sheets milik AO tanpa perlu input manual.

### Definisi Peran
| Peran | Fungsi |
|-------|--------|
| **AO (Area Officer)** | Mengatur link laporan Excel, mendistribusikan data mentah ke kios, memantau performa seluruh kios |
| **UH (Unit Head)** | Menerima data dari AO, membagi kuota target harian (20-40 kontak/hari) ke 5 Marketing di bawahnya |
| **Marketing / MCE** | Menautkan WhatsApp via QR Code, membuka To-Do List, mengeksekusi pengiriman pesan satu per satu |

### Alur Pengguna
1. **AO** membuat dokumen Excel (OneDrive/Google Sheets), menyalin link, menempelkan di Dashboard AO, menentukan pemetaan kolom (Status FU → kolom "Status", Waktu → kolom "Waktu")
2. **Marketing** memindai QR Code → menghubungkan WhatsApp ke backend Baileys
3. **Marketing** masuk modul Single Data → melihat kuota target → menekan "Kirim Pesan" pada baris target customer
4. **Backend (Baileys)** mendeteksi pesan keluar (messages.upsert) → mengubah status di database menjadi `sent` + timestamp
5. **Cloud Sync (latar belakang)** menembus API Microsoft Graph / Google Sheets API → mencari baris berdasarkan Nomor WA → menimpa kolom Status & Waktu secara real-time tanpa merusak rumus/format bawaan AO
6. **Marketing** melihat bukti pengiriman terupdate (klasifikasi: Hot Prospect, Follow Up, Reject)

### Kebutuhan Fungsional
#### Adaptasi Modul Single Data (Frontend Next.js)
- Tabel target di panel Marketing mengambil struktur dari menu Broadcast, diubah dengan tombol aksi "Kirim Pesan" per baris kontak
- Kuota harian ditampilkan di dashboard Marketing
- Progress bar: terkirim / total kuota

#### Integrasi Engine Baileys (Worker Node.js)
- QR Code generator untuk login multi-device (sudah ada di FIF)
- Event listener pengiriman pesan (messages.upsert) → deteksi pesan keluar → update status database
- Parser balasan customer → klasifikasi otomatis (Hot Prospect, Follow Up, Reject) berdasarkan keywords
- **Anti-Ban**: delay handler jika Marketing kirim pesan Single Data berturut-turut < 5 detik

#### Modul Cloud Sync Excel (Backend Laravel)
- **Input URL**: Form bagi AO menempelkan link shared URL Excel
- **OAuth Authorization**: Sistem memiliki akses tulis (write access) ke file cloud
- **Row Matching & Update**: Sistem mencari baris berdasarkan parameter "Nomor WhatsApp" di Excel, memperbarui sel Status & Waktu saja (tidak merusak rumus/format)
- **Async Background**: Sync berjalan di background task (queue Laravel) agar tidak mengganggu loading aplikasi Marketing
- **Retry**: Jika API Excel/Microsoft Graph gagal, retry 3x dengan exponential backoff

### Struktur Proyek (Adaptasi FIT Stack)
```
my-whatsapp-app/
├── backend/                          # Laravel 12 (PHP 8.2)
│   ├── app/
│   │   ├── Controllers/Api/
│   │   │   ├── SingleDataController.php   # Distribusi & kuota (AO → UH → MCE)
│   │   │   └── CloudSyncController.php    # Konfigurasi link Excel & column mapping
│   │   ├── Models/
│   │   │   ├── SingleData.php            # Skéma target eksekusi individual
│   │   │   ├── CloudReportConfig.php      # URL Excel & mapping kolom
│   │   │   └── Existing Models...
│   │   ├── Services/
│   │   │   ├── MicrosoftGraphService.php  # Microsoft Excel REST API integration
│   │   │   └── GoogleSheetsService.php    # Google Sheets REST API integration
│   │   └── Jobs/
│   │       └── CloudSyncJob.php           # Background async sync job
│   ├── config/
│   │   └── database.php                  # PostgreSQL config (ganti dari SQLite)
│   ├── routes/
│   │   ├── api.php                        # Routes: /single-data/*, /cloud-sync/*
│   │   └── ...
│   └── database/
│       └── migrations/
│           ├── 2026_07_25_000001_create_single_data_table.php
│           ├── 2026_07_25_000002_create_cloud_report_configs_table.php
│           └── 2026_07_25_000003_add_sync_columns_to_customers.php
│
├── frontend/                         # Next.js 15 (React 19)
│   └── src/
│       ├── pages/
│       │   ├── ao/
│       │   │   ├── dashboard.tsx          # Statistik Real-time (Harian/Mingguan/Bulanan)
│       │   │   └── report-sync.tsx        # Form input link Excel & column mapping
│       │   ├── uh/
│       │   │   └── dashboard.tsx          # Panel UH mengatur kuota
│       │   └── marketing/
│       │       └── single-data.tsx        # To-Do List & tombol "Kirim Pesan"
│       └── ...
│
├── worker/                           # Node.js (Baileys + Socket.IO)
│   ├── src/
│   │   ├── single-data-handler.js        # Listener pesan keluar + classification
│   │   ├── cloud-sync-worker.js          # Background sync Excel/Sheets
│   │   └── ...
│   └── ...
│
└── README.md
```

### Kebutuhan Non-Fungsional
| Requirement | Detail |
|-------------|--------|
| **Zero-Interference** | Cloud sync berjalan async (background queue Laravel), tidak blocking loading aplikasi Marketing |
| **Anti-Ban WhatsApp** | Delay handler: jika Marketing kirim Single Data < 5 detik berturut-turut, sistem delay otomatis |
| **Database** | PostgreSQL (migrasi dari SQLite), Redis untuk cache & pub/sub real-time |
| **Error Handling** | Cloud Sync retry 3x dengan exponential backoff jika API gagal |
| **Security** | OAuth token untuk Microsoft Graph / Google Sheets disimpan encrypted, hanya AO yang bisa konfigurasi link |
| **Performance** | Redis cache untuk data Single Data yang sering diakses (kuota, status) |
