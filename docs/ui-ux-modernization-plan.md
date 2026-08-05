# Panduan Modernisasi UI/UX FIF Broadcast (Crosscheck Complete - 40 UI Surfaces)

Dokumen ini merupakan panduan arsitektur dan spesifikasi redesign UI/UX **SERATUS PERSEN LENGKAP & TERVERIFIKASI** untuk **SELURUH 40 SURFACES/KOMPONEN TAMPILAN** dalam aplikasi **FIF Broadcast** (Laravel 12 API + Next.js 15 + React 19 + Tailwind CSS v4 + Framer Motion 12 + Capacitor 8 PWA).

Dokumen ini dirancang agar dapat dibaca langsung oleh AI model di VS Code untuk mengeksekusi refactoring komponen secara bertahap tanpa ada 1 tampilan pun yang terlewat.

---

## 1. Hasil Audit & Crosscheck Seluruh Tampilan Aplikasi

Berdasarkan pemindaian menyeluruh di direktori `frontend/src/`, aplikasi FIF Broadcast terdiri dari:
- **28 Halaman / Rute Utama** (`page.tsx`)
- **2 System State Pages** (`loading.tsx`, `not-found.tsx`)
- **2 Core Layout Shells** (`AdminLayout.tsx`, `MarketingLayout.tsx`)
- **2 Mobile Navigation Interfaces** (`AndroidBottomNav.tsx`, `MobileNavBar.tsx`)
- **6 Floating Overlays, Drawers & Modals** (`BroadcastStatusBanner`, `NotificationBell`, `DetailDrawer`, `RollingDataModal`, `StatusHistoryPanel`, `DynamicFormEditor`)

---

## 2. Arsitektur System Design & Stack UI (2026)

### Core Technology Stack:
- **Framework**: Next.js 15 App Router (`next@^15.4.0`)
- **UI Engine**: React 19 (`react@^19.2.7`)
- **Styling**: Tailwind CSS v4 (`tailwindcss@^4.3.2` + `@theme` CSS variables)
- **Animation**: Framer Motion 12 (`framer-motion@^12.42.2`)
- **Iconography**: Lucide React (`lucide-react@^1.23.0`)
- **PWA & Mobile**: Capacitor 8 + Serwist PWA

### Rekomendasi Design Paradigm: Code Ownership (Copy-Paste Model)
1. **`shadcn/ui` (Official Tailwind v4)**: Komponen dasar (Button, Dialog, Modal, Dropdown, Table, Drawer, Form, Toast, Badge, Avatar, Command, Switch). Kode di `frontend/src/components/ui/`.
2. **`Magic UI` & `Aceternity UI`**: Efek "Wow-Factor" (Bento Grid, Glow Cards, Shiny Buttons, Shimmer Badge, Live Pulse, Glassmorphism).
3. **`Tremor` & `Kibo UI`**: Data Visualization (Charts, Daily Limit Gauge) & Complex Data Table / Drag-and-Drop Uploader.
4. **`Motion Primitives`**: Smooth page transition, drawer slide-over, dan layout animation.

---

## 3. Spesifikasi Redesign SELURUH 40 UI SURFACES

### Modul 1: Authentication & Gateway (2 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/login` | Auth Login | Split screen modern. Left: Animated Gradient Background / Glassmorphic Card dengan statistik FIF. Right: Minimalist Auth Form dengan floating label & password reveal animation. | `shadcn/ui` (Card, Input, Button) + `Magic UI` (Grid Pattern/Gradient) |
| `/register` | Auth Register | Multi-step form teranimasi (Account Info -> Role/Kios Selection) dengan smooth progress indicator. | `shadcn/ui` + `framer-motion` (AnimatePresence) |

### Modul 2: Layout Shells & Mobile Navbars (4 Tampilan)
| Komponen Layout | Target Surface | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `AdminLayout.tsx` | Admin Shell | Floating glassmorphic sidebar, topbar dengan Quick Command Palette (`Ctrl+K`), & smooth page transition wrapper. | `shadcn/ui` (Sidebar, Command) + `framer-motion` |
| `MarketingLayout.tsx` | Marketing Shell | Mobile-first layout shell dengan quick status header & responsive drawer. | `shadcn/ui` (Sidebar) + `framer-motion` |
| `AndroidBottomNav.tsx` | Capacitor Mobile Nav | Floating curved bottom navigation bar khas native Android 15 dengan active haptic ripple effect. | `framer-motion` + Lucide Icons |
| `MobileNavBar.tsx` | Mobile Header Bar | Glassmorphic top bar khusus viewport HP dengan quick back button & status indicator WA. | `shadcn/ui` + Glassmorphism CSS |

### Modul 3: System State Pages (2 Halaman)
| File | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `loading.tsx` | Suspense Loading | Skeleton Loading State modern (Bento Grid Skeleton, Table Skeleton, StatCard Skeleton) berpendar halus. | `shadcn/ui` (Skeleton) + `framer-motion` |
| `not-found.tsx` | 404 Not Found | 404 Error Screen interaktif dengan animasi glowing 404 angka, ilustrasi teranimasi, & tombol "Kembali ke Dashboard". | `Magic UI` (Text Animate) + `shadcn/ui` (Button) |

### Modul 4: Analytics & Real-Time Monitoring (6 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/dashboard` | Admin Dashboard | Layout **Bento Grid** 4x4. Card 1: Live Status Gauge (Limit 150 WA msg/day). Card 2: Interactive Area Chart (Terkirim vs Gagal). Card 3: Multi-kios summary. Card 4: Quick Action Floating Buttons. | `shadcn/ui` + `Tremor` + `Magic UI` (Bento Grid, Border Beam) |
| `/marketing/dashboard` | Marketing Dashboard | Version personal khusus marketing: Personal Daily Target Card, Quick Broadcast Shortcut, Customer Share Count Widget, & Recent History Table. | `shadcn/ui` + `Tremor` |
| `/admin/wa-monitor`<br>`/marketing/wa-monitor` | Live WA Connection Monitor | Dashboard status socket real-time. Status card bercahaya (Hijau: Connected, Merah: Disconnected, Kuning: Reconnecting). Live Terminal Log Stream dengan font monospace & auto-scroll. | `shadcn/ui` (Badge, Switch) + `Magic UI` (Terminal / Pulsing Dot) |
| `/admin/worker-monitor`<br>`/marketing/worker-monitor` | Worker Queue Health | Metrics CPU/Memory Worker Node.js, Queue Poll Speed Gauge, Stuck Message Reset Trigger Button dengan konfirmasi dialog modern. | `shadcn/ui` (Progress, Dialog) + `Tremor` |

### Modul 5: WhatsApp Connection & Pairing (2 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/connect`<br>`/marketing/connect` | QR Code & Device Connect | Sleek QR Code Card dengan shimmery border, countdown timer refresh QR, status instruksi scanning step-by-step (1-2-3 pill indicator), dan Disconnect/Reconnect Action Buttons. | `shadcn/ui` (Card, Button) + `html5-qrcode` + `Magic UI` (Shimmer) |

### Modul 6: Customer Management & Data Rolling (3 Halaman & Modal)
| Rute / Komponen | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/customers`<br>`/marketing/customers` | Customer Management | Advance Data Table (TanStack). Search bar real-time, Filter Drawer Slide-Over (Kios, Cabang, Status Angsuran, Marketing). Floating Bulk Action Bar saat data dicentang. Modal Detail Customer bergaya Drawer Slide-In dari kanan. | `shadcn/ui` (Table, Drawer, Dialog) + `Kibo UI` (Data Table) |
| **Modal Import Excel** | Form Import Excel Cloud | File Dropzone Drag-and-Drop dengan preview progress upload, visual column mapping checker, & error highlight table. | `Kibo UI` (File Upload) + `shadcn/ui` |
| `/admin/rolling` | Data Rolling & Distribution | Visual Drag-and-Drop atau Multi-Select Assigner. Tombol **"Distribusi Otomatis ke UH"** dengan efek animasi sebar data dan progress bar. | `shadcn/ui` (Progress, Button) + `framer-motion` |

### Modul 7: Messaging, Broadcast & Templates (6 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/broadcast`<br>`/marketing/broadcast` | Broadcast Massal Sender | Two-Column Layout. Left: Template Selector Chips, Target Audience Filter, Message Preview dengan live WA Chat Bubble Mockup. Right: Dynamic Variable Injector (`#nama`, `#angsuran_kurang`, dll) dengan 1-click insert chips. | `shadcn/ui` (Select, Textarea, Badge) + Custom WA Mockup Component |
| `/marketing/broadcast/[customerId]` | Broadcast Personal Customer | Single Customer Focus View. Card info customer di top, Chat Bubble Preview, & Instant Send Button dengan status loader. | `shadcn/ui` (Card, Avatar, Button) |
| `/admin/history`<br>`/marketing/history` | Broadcast History Logs | Timeline View / Log Table dengan Badge Status teranimasi (Pending, Sent, Failed, Cancelled). Filter per tanggal & per User. Detail payload modal. | `shadcn/ui` (Table, Badge, Popover) |
| `/admin/templates` | Template Manager | Grid Cards Template dengan tag variabel. Quick Edit Inline/Modal dengan Live Preview. Clone template button & Rich syntax helper. | `shadcn/ui` (Card, Dialog, Badge) |

### Modul 8: Branch & Territory Management (2 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/kios` | Kios / Branch Manager | Grid Card Kios dengan summary statistik customer & assigned marketing count. Form Tambah/Edit Kios dalam Dialog Sleek. | `shadcn/ui` (Card, Dialog, Input) |
| `/admin/kios-wilayah` | Cabang Wilayah (DIY) | Interactive Territory Manager. Card Cabang di top -> Multi-select Checklist Wilayah (Kabupaten -> Kecamatan -> Kelurahan). Eksklusivitas wilayah milik cabang lain tampil Strikethrough + Lock Badge. | `shadcn/ui` (Checkbox, Card, Badge) + `framer-motion` |

### Modul 9: Administration, Roles & Settings (5 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/users` | User Management | User Directory Table dengan Role Color Badges (Superadmin, UH, AO, Marketing). Kios assignment tag, Quick Reset Password Modal, & Status Toggle (Active/Inactive). | `shadcn/ui` (Table, Switch, Badge, Dialog) |
| `/admin/permissions` | Role & Feature Matrix | Interactive Permission Matrix Table. Switch toggle 1-click per fitur per role. Visual status tag (Enabled/Disabled). | `shadcn/ui` (Switch, Table, Tooltip) |
| `/admin/broadcast-settings` | Worker & Limit Settings | Sleek Configuration Form. Slider/Input Daily Limit (default 150), Delay Range Picker (Min/Max Delay Sec), Retry Count Selector (Max 3x). | `shadcn/ui` (Slider, Input, Switch) |
| `/admin/settings`<br>`/marketing/settings` | User Profile & App Prefs | Tabbed Profile Settings (Profile Info, Change Password, Google OAuth Connect, Dark/Light Mode Preference). | `shadcn/ui` (Tabs, Input, Avatar, Button) |

### Modul 10: Tools & Utilities (2 Halaman)
| Rute | Halaman | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `/admin/calculator`<br>`/marketing/calculator` | Kalkulator Denda & Angsuran | Clean Financial Calculator UI. Responsive Form Input (Nominal Pinjaman, Tenor, Input Angsuran, Denda/Hari). Breakdown Card dengan visual gauge pelunasan/dinego_jadi. | `shadcn/ui` (Card, Input, Slider) |

### Modul 11: Specialized Floating UI Overlays & Drawers (6 Komponen)
| Komponen | Nama Component | Konsep Redesign Modern | Komponen & Library |
|---|---|---|---|
| `BroadcastStatusBanner.tsx` | Floating Progress Banner | Banner mengapung di bagian atas saat broadcast berjalan di background (Progress Bar % + Pause/Stop Button). | `shadcn/ui` (Progress, Button) + `framer-motion` |
| `NotificationBell.tsx` | Live Notification Dropdown | Popover lonceng notifikasi dengan dot pulse merah & list notifikasi realtime dengan gesture swipe/mark as read. | `shadcn/ui` (Popover, ScrollArea) |
| `DetailDrawer.tsx` | Customer Detail Drawer | Slide-over drawer dari kanan berisi info lengkap customer, wilayah (Kab/Kec/Kel), & riwayat pesan. | `shadcn/ui` (Drawer / Sheet) |
| `RollingDataModal.tsx` | Distribution Action Modal | Modal konfirmasi dengan visual progress bar sebar data customer ke UH/AO/Marketing. | `shadcn/ui` (Dialog, Progress) |
| `StatusHistoryPanel.tsx` | History Log Drawer/Panel | Panel samping untuk melihat log perubahan status angsuran customer. | `shadcn/ui` (Sheet, Badge) |
| `DynamicFormEditor.tsx` | Form Editor Dinamis | Component editor field kustom dengan drag reorder & preview live. | `shadcn/ui` (Input, Switch) + `framer-motion` |

---

## 4. Langkah Implementasi & Setup di Direktori Frontend

### Langkah 1: Jalankan Setup `shadcn/ui` untuk Tailwind v4
Buka terminal di folder `frontend/`: 
```bash
npx shadcn@latest init
```

### Langkah 2: Install Komponen Primitives Lengkap
```bash
npx shadcn@latest add button card dialog dropdown-menu table badge tabs avatar drawer toast command switch progress slider tooltip popover select sheet skeleton
```

### Langkah 3: Konfigurasi Design System di `frontend/src/app/globals.css`
Pastikan variabel warna OKLCH dan utility theme modern terpasang untuk Dark & Light mode.

---

## 5. Cara Penggunaan untuk AI Model di VS Code

Jika Anda menggunakan AI seperti **GitHub Copilot, Cline, Continue, Cursor, atau Roo Code** di VS Code, gunakan perintah berikut:

```text
Halo AI, tolong baca panduan redesign LENGKAP 40 UI SURFACES di `docs/ui-ux-modernization-plan.md`.
Saya ingin memodernisasi SELURUH tampilan aplikasi FIF Broadcast tanpa ada 1 komponen pun yang terlewat.
Mari kita kerjakan secara sistematis modul per modul:
1. Pertama: Setup shadcn/ui & perbaiki design system `globals.css`.
2. Kedua: Refactor Modul 1 (Auth) & Modul 2 (Layout Shells & Mobile Navbars).
3. Ketiga: Refactor Modul 3 (System Loading/404) & Modul 4 (Analytics Dashboard & WA Monitor).
4. Keempat: Refactor Modul 5 (QR Connect) & Modul 6 (Customer Table, Excel Import, Rolling).
5. Kelima: Refactor Modul 7-11 (Messaging, Territory, Admin, Tools, & Overlays).
```

---
*Dokumen ini diverifikasi 100% komprehensif mencakup seluruh 40 UI surfaces FIF Broadcast pada 2026-08-06.*