# Product Requirements Document — FIF Modernization

## Keputusan Teknik Final
| Layer | Technology | Alasan |
|-------|-----------|--------|
| **Web** | Next.js 15 (React 19) | Modern, SSR, App Router, interactive |
| **Mobile** | React Native (Expo) | 1 ecosystem React, interactive, private APK |
| **Backend** | Laravel 12 (tidak berubah) | API sama untuk web & mobile |
| **WhatsApp Worker** | Node.js, Baileys, Socket.IO | Tetap |
| **AI Assistant** | opencode + OpenRouter (free tier) | Tetap |
| **Database** | SQLite + WAL | Tetap |
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
