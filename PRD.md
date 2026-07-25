# Product Requirements Document — FIF Modernization

## Keputusan Teknik
| Keputusan | Alasan |
|-----------|--------|
| Mobile: **Flutter (Dart)** | UI paling cantik & modern, team mau belajar, 1 codebase mobile |
| Web: **React 19 + Vite** (pertahankan, upgrade ke PWA) | Tim sudah mahir, tetap jalan |
| Backend: **Laravel 12** (tidak berubah) | API sama untuk web & mobile |
| Distribusi mobile: **Private APK** | Tidak diupload ke Play Store/App Store |

## Phase 0: Web Modernisasi (Prioritas 1)

### 0.1 — PWA (Progressive Web App)
- Installable di HP sebagai "app" (tanpa browser address bar)
- Offline capability (service worker)
- Splash screen + icons
- Push notification (browser API)

### 0.2 — Mobile-First Redesign
- Responsive layout dari desktop-first
- Touch-friendly UI (button min 44x44px)
- Bottom navigation untuk mobile
- Swipe gestures
- Optimized font sizes (16px+ base)

### 0.3 — Animasi & Micro-interaction
- Page transitions
- Button press feedback
- Skeleton loading screens
- Smooth list animations

---

## Phase 1: API & Backend Preparation

### 1.1 — API Versioning
- Route `/api/v1/*` untuk future-proofing
- `/api/v2/*` saat mobile app membutuhkan endpoint berbeda

### 1.2 — API Rate Limiting
- Tambahan rate limit per endpoint
- 429 response handling

### 1.3 — WebSocket untuk Mobile
- Socket.IO tetap jalan (sama dengan web)
- Mobile app sambung ke socket 3001

---

## Phase 2 — Flutter Mobile App (Private APK)

### 2.1 — Setup Flutter Project
- `flutter create fif_mobile` di folder terpisah (`mobile/`)
- Dart + Flutter SDK
- Shared API layer (mirip endpoint Laravel)
- Folder `shared/` untuk API service & types (copy dari web atau shared docs)

### 2.2 — Auth Flow
- Sama dengan web (Sanctum token via `flutter_secure_storage`)
- Login / Register / Forgot password
- Token refresh otomatis

### 2.3 — Core Screens
- Dashboard (ringkasan)
- Prospect List (data customer)
- Broadcast Form (teks + template variabel)
- Broadcast History (tabel terkirim/gagal/pending)
- WhatsApp Connect (QR Scanner native / Pairing Code)
- Settings (nama panggilan, telepon, dll)
- Kios Management (superadmin)

### 2.4 — Mobile-Specific Features
- Push notification (Firebase Cloud Messaging)
- Haptic feedback
- Camera integration (QR scan native)
- Clipboard access
- Share / Deep link ke screen tertentu
- Offline support (cache data lokal, sync saat reconnect)
- Background message queue (kirim saat online kembali)

### 2.5 — UI Quality (Flutter advantage)
- Material Design 3 (built-in)
- Custom theme warna FIF (brand colors)
- Animated transitions antar screen
- Swipe to dismiss, pull to refresh
- Bottom navigation bar
- Dark mode support (optional)

### 2.6 — Private Distribution (TIDAK PUBLIC)
- Build APK via `flutter build apk --release`
- File APK didownload manual dari VPS/PC
- Distribusi via internal link / file share ke user terpercaya
- Tidak diupload ke Play Store / App Store
- Tidak ada account developer diperlukan
- Update: kirim APK baru via file share saat versi baru

### 2.7 — Build Pipeline (Manual)
- Development: `flutter run` di PC + emulator
- Testing: `flutter test` untuk unit/integration test
- Release build: `flutter build apk --release` (generate APK di `build/app/outputs/`)
- Distribusi: copy APK ke file share / internal server

### 2.8 — Cloud Build (Opsional, Berbayar)
- Codemagic: $24/bulan (gratis 10 build/bulan)
- Firebase App Distribution: gratis (kirim APK via link)
- Bisa skip — build manual sudah cukup untuk private APK

---

## Timeline (Estimasi)

| Phase | Durasi | Status |
|-------|--------|--------|
| 0: Web PWA + Mobile-First | 2-3 minggu | Belum mulai |
| 1: API Prep | 1 minggu | Belum mulai |
| 2: Flutter Mobile App | 4-6 minggu | Belum mulai |
| 3: Advanced (widget Android, deep link, real-time sync) | Flexible | Nanti |

---

## Cost Summary

| Komponen | Biaya |
|----------|-------|
| Flutter SDK | ✅ Gratis |
| Flutter build (lokal) | ✅ Gratis |
| Firebase (push notification) | ✅ Gratis (free tier) |
| Firebase App Distribution | ✅ Gratis |
| Codemagic (cloud build) | ✅ Gratis 10 build/bln, lalu $24/bln |
| Play Store / App Store | ✅ Nggak perlu (private APK) |
| Total | **$0 (gratis)** |

---

## Tech Stack Final

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.2, SQLite |
| API | RESTful JSON |
| Web Frontend | React 19, TypeScript, Vite 8, TailwindCSS 4 |
| Mobile Frontend | Flutter (Dart) |
| Mobile Build | `flutter build apk --release` |
| Mobile Distribusi | Private APK (manual/share) |
| WhatsApp Worker | Node.js, Baileys, Socket.IO |
| AI Assistant | opencode + OpenRouter (free tier) |
| Database | SQLite |
| Deploy | VPS Rumahweb (202.10.42.237), PHP-FPM + nginx |
