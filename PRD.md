# Product Requirements Document — FIF Modernization
## Status: Active
## Date: 2026-07-26

---

## Pitstop Board (Scrum-style Tracking)

Legend: `TODO` | `DOING` | `DONE` — update status per step

| # | Pitstop | Scope | Status | PRD Section |
|---|---------|-------|--------|-------------|
| 0.1 | PWA (installable, offline) | Web / Next.js | `TODO` | Phase 0 |
| 0.2 | Mobile-first responsive redesign | Web / Next.js | `TODO` | Phase 0 |
| 0.3 | Page transitions & animations | Web / Next.js | `TODO` | Phase 0 |
| 0.4 | Skeleton loading screens | Web / Next.js | `TODO` | Phase 0 |
| 0.5 | Touch-friendly UI (44x44px) | Web / Next.js | `TODO` | Phase 0 |
| 0.6 | Bottom navigation (mobile) | Web / Next.js | `TODO` | Phase 0 |
| 0.7 | Optimistic updates | Web / Next.js | `TODO` | Phase 0 |
| 1.1 | API versioning `/api/v1/*` | Backend/Laravel | `TODO` | Phase 1 |
| 1.2 | Rate limiting per endpoint | Backend/Laravel | `TODO` | Phase 1 |
| 1.3 | WebSocket shared (Socket.IO) | Backend/Laravel | `TODO` | Phase 1 |
| 2.1 | Expo project setup (`mobile/`) | Mobile/React Native | `TODO` | Phase 2 |
| 2.2 | Auth flow (shared API) | Mobile/React Native | `TODO` | Phase 2 |
| 2.3 | Dashboard + Prospect List | Mobile/React Native | `TODO` | Phase 2 |
| 2.4 | Broadcast Form + History | Mobile/React Native | `TODO` | Phase 2 |
| 2.5 | WhatsApp Connect (QR Scanner) | Mobile/React Native | `TODO` | Phase 2 |
| 2.6 | Push notification (Firebase) | Mobile/React Native | `TODO` | Phase 2 |
| 2.7 | Offline support (cache + sync) | Mobile/React Native | `TODO` | Phase 2 |
| 2.8 | Private APK distribution | Mobile/React Native | `TODO` | Phase 2 |
| M | Single Data module (AO→UH→Marketing + Live Sync Excel) | Backend + Web + Mobile | `TODO` (PRD added) | Modul Baru |
| D | Migrate SQLite → PostgreSQL + Redis | Backend/Laravel | `TODO` | Database Architecture |
| A | AI failover (OpenRouter free models) | opencode config | `DONE` | Config updated |
| V | VPS health check script | deploy script | `DONE` | commit a1c4252 |

---

## Keputusan Teknik Final (Frozen)

| Layer | Technology | Alasan |
|-------|-----------|--------|
| **Web** | Next.js 15 (React 19) | Modern, SSR, App Router, interactive |
| **Mobile** | React Native (Expo) | 1 ecosystem React, private APK |
| **Backend** | Laravel 12 (tidak berubah) | API sama untuk web & mobile |
| **Database** | PostgreSQL 16 + Redis 7 (migrasi dari SQLite) | Real-time, 6 kios concurrent |
| **WhatsApp Worker** | Node.js, Baileys, Socket.IO | Tetap |
| **AI Assistant** | opencode + OpenRouter (free tier) | Ling Flash 124B MoE, unlimited |
| **Deploy** | VPS Rumahweb → nanti migrasi ke Hostingan.id/Kencang.id (4GB RAM, NVMe) | Budget <100rb/bulan |

---

## Phase 0: Web Modernisasi (Next.js 15)
**Estimasi: 3–4 minggu | Status: `TODO`**

### 0.1 PWA (Progressive Web App)
- Installable di HP tanpa browser address bar
- Offline capability (service worker)
- Splash screen + icons
- Push notification (browser API)

### 0.2 Mobile-First Responsive Design
- Breakpoints: 320px / 375px / 414px / 768px / 1024px
- Touch target min 44x44px (WCAG 2.1 AA)
- Font size min 16px (prevent iOS auto-zoom)
- Safe area inset untuk notch iPhone + Android
- Responsive layout desktop + mobile

### 0.3 Animasi & Micro-interaction
- Page transitions (Framer Motion / React Transition)
- Button press feedback
- Skeleton loading screens
- Smooth list animations

### 0.4 Performance
- Lazy loading components
- Bundle splitting (Next.js built-in)
- Image optimization
- Virtualized lists

---

## Phase 1: API & Backend Preparation (Laravel 12)
**Estimasi: 1 minggu | Status: `TODO`**

### 1.1 API Versioning
- Route `/api/v1/*` / `/api/v2/*`

### 1.2 Rate Limiting
- Per-endpoint limit + 429 response handling

### 1.3 WebSocket (Shared)
- Socket.IO port 3001 (sama untuk web & mobile)
- Redis Pub/Sub adapter (setelah PostgreSQL + Redis terpasang)

---

## Phase 2: React Native Mobile App (Private APK)
**Estimasi: 5–6 minggu | Status: `TODO`**

### 2.1 Setup
- `npx create-expo-app fif_mobile` di folder `mobile/`
- TypeScript + shared API layer

### 2.2 Screens
- Dashboard ringkasan
- Prospect List
- Broadcast Form (live template preview)
- Broadcast History
- WhatsApp Connect (QR Scanner native)
- Settings

### 2.3 Mobile Features
- Push notification (Firebase)
- Haptic feedback
- Camera (QR scan)
- Clipboard & Share
- Offline cache + sync
- Background queue

### 2.4 Distribusi
- Private APK via `eas build --platform android`
- Tidak diupload Play Store / App Store
- Distribusi manual via file share

---

## Modul Baru: Single Data, Hierarki Multi-Level & Live Sync Cloud Excel
**Status: `TODO` (PRD ditambahkan, belum dieksekusi)**

### Deskripsi
Sistem distribusi data berjenjang AO → UH → Marketing dengan eksekusi pesan individual dan live sync laporan Real-time ke Excel/Google Sheets AO.

### Peran
| Peran | Fungsi |
|-------|--------|
| AO (Area Officer) | Mengatur link Excel, mendistribusikan data, memantau semua kios |
| UH (Unit Head) | Menerima data AO, membagi kuota 20-40 kontak/hari ke 5 Marketing |
| Marketing / MCE | Menautkan WhatsApp QR, eksekusi kirim pesan satu per satu |

### Alur
1. AO buat Excel (OneDrive/Google Sheets) → paste link di Dashboard AO → mapping kolom
2. Marketing scan QR → hubungkan WhatsApp ke backend Baileys
3. Marketing lihat To-Do List → tekan "Kirim Pesan" per baris target
4. Backend Baileys deteksi pesan keluar → update status DB → `sent` + timestamp
5. Cloud Sync (background) → cari baris WA di Excel via Microsoft Graph / Google Sheets API → update Status & Waktu
6. Marketing lihat bukti: Hot Prospect / Follow Up / Reject

### Fitur Teknis
- Anti-Ban: delay handler < 5 detik consecutive sends
- Zero-Interference: cloud sync async (background queue Laravel)
- Retry: 3x exponential backoff saat API gagal
- OAuth token encrypted (hanya AO bisa konfigurasi link)

---

## Database Architecture (PostgreSQL 16 + Redis 7)
**Status: `TODO` (migrasi belum dieksekusi)**

### Alasan Migrasi dari SQLite
- 6 kios × 2000-3000 records = 12.000-18.000 rows concurrent
- SQLite lock entire DB on write → bottleneck
- PostgreSQL LISTEN/NOTIFY → real-time <100ms (bukan polling 5s)
- Redis Pub/Sub → event distribution antar service
- Redis cache → sub-millisecond reads untuk hot data

### Arsitektur
```
Laravel (PHP-FPM) ↔ PostgreSQL (main DB) ↔ Redis (cache + pub/sub)
                                                    ↕
Socket.IO (port 3001) ← Redis Pub/Sub → Laravel events
Worker (Node.js/Baileys) ↔ PostgreSQL + Redis
Frontend (Next.js) ↔ Laravel API ↔ PostgreSQL/Redis
Mobile (React Native) ↔ Laravel API ↔ PostgreSQL/Redis
```

### Migrasi Guide
Lihat: `deploy/migrate-sqlite-to-postgres.md` (13 steps, rollback plan included)

---

## VPS Migration (Rumahweb → Hostingan.id / Kencang.id)
**Status: `TODO`**

### Target Provider
| Provider | Harga | RAM | Storage | Zone |
|----------|-------|-----|---------|------|
| Hostinger KVM 2 | 116.900/bln | 4GB | 50GB NVMe | Indonesia |
| Hostingan.id NVMe | 100rb/bln | 4GB | 25GB NVMe | Indonesia |
| Kencang.id RDP-2 | 99.9rb/bln | 4GB | 40GB SSD | Indonesia |

### Catatan
- Tetap pakai Rumahweb sampai VPS baru ready
- WARP proxy (Docker) tetap jalan di VPS baru
- Domain DNS arahkan ke IP baru (1-24 jam propagation)
- SSL re-generate via Let's Encrypt (auto)

---

## Timeline (Updated)

| Pitstop | Phase | Durasi | Status Terakhir |
|---------|-------|--------|-----------------|
| 0.1–0.7 | Web Modernisasi | 3-4 minggu | `TODO` |
| 1.1–1.3 | API Prep | 1 minggu | `TODO` |
| 2.1–2.8 | React Native Mobile | 5-6 minggu | `TODO` |
| M | Single Data module | 3-4 minggu | `TODO` |
| D | DB migration SQLite→PostgreSQL | 1 hari | `TODO` |
| V | VPS migration | 1 hari | `TODO` |

---

## Cost Summary

| Komponen | Biaya | Catatan |
|----------|-------|---------|
| Hostingan.id / Kencang.id | 90–116rb/bulan | 4GB RAM, NVMe |
| Domain .cloud (free) | ✅ | Dengan paket Hostingan.id |
| SSL (Let's Encrypt) | ✅ Gratis | Auto via Certbot |
| opencode AI (OpenRouter free) | ✅ Gratis | Ling Flash, Gemma 4, Laguna M.1 |
| React Native Expo | ✅ Gratis | Open source |
| Fireb
