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
