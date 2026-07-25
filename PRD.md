# Product Requirements Document — FIF Mobile & Web Modernization

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
- Page transitions (React Transition Group / Framer Motion)
- Button press feedback
- Skeleton loading screens
- Smooth list animations (Reanimated)

### 0.4 — Performance
- Lazy loading components
- Image optimization
- Virtualized lists (large tables)
- Bundle splitting (Vite sudah ada)

### 0.5 — State Management Upgrade
- Zustand/React Query untuk server state
- Context untuk client state
- Optimistic updates

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

## Phase 2 — React Native (Expo) Mobile App

### 2.1 — Setup Expo Project
- `npx create-expo-app` di folder terpisah (`mobile/`)
- TypeScript, Shared API layer dengan web frontend
- Folder `shared/` untuk API service & types

### 2.2 — Auth Flow
- Sama dengan web (Sanctum token via `react-native-expo-secure-store`)
- Login / Register / Forgot password

### 2.3 — Core Screens
- Dashboard (ringkasan)
- Prospect List
- Broadcast Form
- Broadcast History
- Connect WhatsApp (QR Scanner / Pairing Code)
- Settings

### 2.4 — Mobile-Specific Features
- Push notification (Expo Notifications)
- Haptic feedback
- Camera integration (QR scan native)
- Clipboard access
- Share / Deep link

### 2.5 — Offline Support
- AsyncStorage untuk cache data
- Sync data saat reconnect
- Queue messages offline → kirim saat online

### 2.6 — Private Distribution
- Build APK via `eas build --platform android`
- File APK didownload manual (tidak diupload ke Play Store)
- Distribusi via internal link / file share
- Tidak ada App Store / Play Store

### 2.7 — Auto-Updates (Opsi)
- EAS Update untuk push update tanpa rebuild store
- Opsi: notifikasi "Update available, download new version"

---

## Phase 3 — Advanced (Masa Depan)

### 3.1 — Real-time Sync mobile ↔ Web
- Shared database view
- User buka web & mobile bersamaan, data sinkron

### 3.2 — Widget Android
- Widget ringkas di homescreen (pending broadcast count)
- Quick action: start broadcast, view stats

### 3.3 — React Native Share
- Shared navigation state antar app
- Deep link ke screen tertentu

---

## Timeline (Estimasi)

| Phase | Durasi | Status |
|-------|--------|--------|
| 0: Web PWA + Mobile-First | 2-3 minggu | Belum mulai |
| 1: API Prep | 1 minggu | Belum mulai |
| 2: React Native Mobile | 3-4 minggu | Belum mulai |
| 3: Advanced | Flexible | Nanti |

---

## Tech Stack Decision

| Keputusan | Alasan |
|-----------|--------|
| React Native + Expo | Sama ecosystem TypeScript dengan web, tim sudah paham |
| Flutter/Dart (Ditolak) | Belum ada di stack, extra learning curve, tidak efisien untuk proyek ini |
| Private APK | Tidak perlu Play Store/app store, distribusi internal |
| EAS Build | CI/CD otomatis untuk APK build |
