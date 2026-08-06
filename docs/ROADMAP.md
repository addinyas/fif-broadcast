# ROADMAP Fitur FIF Broadcast — Master Plan

> Sumber: `PRD.md` + `docs/nomor-warming-anti-ban.md` + `docs/meta-waba-migration.md` + `docs/ui-ux-modernization-plan.md`.
> Dokumen ini satu-satunya daftar fitur yang akan dibangun. Status diperbarui di sini setiap selesai satu fitur.

**Legend:** `✅ DONE` | `🔜 NEXT` (fitur berikutnya yang dikerjakan) | `⬜ TODO`

---

## Ringkasan Status

| Modul | Total | DONE | TODO | Prioritas |
|---|---|---|---|---|
| A. WA Warming & Anti-Ban (W.1–W.9) | 9 | 0 | 9 | **DEADLINE 10 Ags** — W.1–W.4 wajib |
| B. Single Data (M.3–M.12) | 10 | 0 | 10 | PRIORITAS UTAMA setelah 10 Ags |
| C. Meta Cloud API Migration | 6 fase | 0 | 6 | Opsional (anti-ban permanen) |
| D. API Preparation (1.1–1.2) | 2 | 0 | 2 | Bisa paralel |
| E. Web Modernization (0.1–0.7) | 7 | ~6 | ~1 | Sebagian besar selesai |
| F. Mobile App (2.1–2.8) | 8 | 0 | 8 | Setelah E |

---

## A. Modul WA Warming & Anti-Ban (DEADLINE 10 Agustus 2026)

> Desain lengkap: `docs/nomor-warming-anti-ban.md`. Tujuan: nomor baru ditanam bertahap (inactive → passive → active → mature) agar tidak kena banned. **Catatan jujur:** pengurang risiko, bukan penjamin bebas ban.

| # | Fitur | Scope | Status | Langkah |
|---|-------|-------|--------|---------|
| W.1 | Warm-up profile: migration `number_warmup_profiles` + model + `WarmupService` | Backend/Laravel | ✅ DONE | Migration (stage, started_at, stage_started_at, daily_outbound_limit, messages_sent_today, counter_date, last_send_at, consecutive_active_days, health json, flags json) + `WarmupService` (kalkulasi stage, batas harian, progress) + test |
| W.2 | Warm-up gate di worker (`queue-consumer` + `wa-manager`) | Worker/Node.js | ⬜ TODO | Stage `passive` = tolak semua outbound; limit harian per stage; jitter jeda **bervariasi per nomor** (bukan interval identik) |
| W.3 | UI "Tanam nomor baru" + progress warm-up | Web/Next.js | ⬜ TODO | Halaman `/admin/connect`: tombol tanam nomor → QR → masuk stage passive; badge stage, hari ke-, sisa kuota, progress bar (`passive 3/7`) |
| W.4 | Health monitoring + auto-pause | Backend + Worker | ⬜ TODO | KPI delivery <85% / reply <10% → pause antrian nomor; event Socket.IO `warmup:progress` |
| W.5 | Consent management (OPT_IN/OUT + honor "STOP") | Backend/Laravel | ⬜ TODO | Tabel `consent` + gate broadcast (`BroadcastService::prepare()`) + handler balasan "STOP" |
| W.6 | Team Inbox: `conversations` + `conversation_messages` + chat 2 arah | Backend + Worker + Web | ⬜ TODO | Capture inbound ke DB; halaman inbox per user (balasan lewat aplikasi) |
| W.7 | Auto-reply / quick replies (rule-based) | Worker + Backend | ⬜ TODO | Balas otomatis inbound sederhana ("STOP", "sudah lunas", dll) |
| W.8 | Analytics response rate per campaign | Backend + Web | ⬜ TODO | Metrik reply/read/delivery agregat per `broadcast_histories` |
| W.9 | Audit log (login, kirim, setting) | Backend + Web | ⬜ TODO | Tabel `audit_logs` + middleware/observer + halaman audit |

**Prioritas:** W.1–W.4 **WAJIB** sebelum 10 Ags → W.5–W.6 high → W.7–W.9 stretch.

### Milestone (dari PRD)
| Tanggal | Deliverable |
|---|---|
| 6 Ags | W.1 migration + WarmupService |
| 7 Ags | W.2 gate worker + W.4 health monitor & auto_pause |
| 8 Ags | W.3 UI tanam nomor + progress |
| 9 Ags | W.5 consent + W.6 Team Inbox |
| 10 Ags | Test end-to-end + deploy |

---

## B. Modul Single Data (PRIORITAS UTAMA — setelah 10 Ags)

> Konsep: hierarki AO → UH → Marketing, kirim pesan individual via To-Do List, klasifikasi AI 25/50/75/100%, sync real-time ke Excel.

| # | Fitur | Scope | Status | Langkah |
|---|-------|-------|--------|---------|
| M.1 | Role AO — login + dashboard | Backend + Web | ✅ DONE | Sudah ter-deploy |
| M.2 | Excel import (Google Sheets + OneDrive) | Backend/Laravel | ✅ DONE | Sudah ter-deploy |
| M.3 | Excel column mapping UI | Web/Next.js | ⬜ TODO | Komponen mapping kolom (drag-drop) |
| M.4 | Assignment engine (distribusi merata) | Backend/Laravel | ⬜ TODO | `AssignmentController` + fair-split (NMC/REFI/angsuran balance) |
| M.5 | To-Do List UI (marketing individual) | Web/Next.js | ⬜ TODO | Halaman To-Do List: per-row "Kirim Pesan" + status buttons |
| M.6 | AI WhatsApp Classifier (Python service) | AI/Python | ⬜ TODO | `ai-classifier/` FastAPI + OpenRouter free |
| M.7 | Chat history capture | Worker/Node.js | ⬜ TODO | Tangkap pesan WA masuk → `chat_histories` |
| M.8 | AI classification engine | AI/Python | ⬜ TODO | Klasifikasi 4 level 25/50/75/100% + confidence |
| M.9 | Real-time Excel sync (Google + Microsoft) | Backend/Laravel | ⬜ TODO | `CloudSyncController` + queue write-back |
| M.10 | Audit trail & reporting | Backend + Web | ⬜ TODO | Log klasifikasi, export CSV/Excel |
| M.11 | Prospect status dashboard | Web/Next.js | ⬜ TODO | Pie chart 25/50/75/100%, per-marketing |
| M.12 | Mobile To-Do List (React Native) | Mobile | ⬜ TODO | Layar To-Do List di app mobile |

### Tabel DB baru modul B
- `chat_histories`, `message_classifications`, `excel_sync_logs`, `excel_configs` (sudah ada), `data_assignments`
- Kolom baru: `customers.prospect_score` (25/50/75/100), `customers.nmc_refi_flag`

---

## C. Migrasi Meta WhatsApp Cloud API (Opsi B — gateway api.co.id)

> Desain lengkap: `docs/meta-waba-migration.md`. Jalur resmi anti-ban permanen (Baileys tetap melanggar ToS). **Rekomendasi PRD: Opsi B (api.co.id)** — kerja lebih kecil.

| # | Fase | Isi | Status |
|---|------|-----|--------|
| C.0 | Setup akun api.co.id | Daftar, sewa nomor, buat API key, template via API | ⬜ TODO (manual/eksternal) |
| C.1 | Backend: config WABA + mapping template | Migration `whatsapp_connections` (api_key encrypted, phone_number_id), `broadcast_histories` (template_name, template_params, wamid), tabel `meta_templates` + endpoint set/lihat config | ⬜ TODO |
| C.2 | Worker: HTTP client api.co.id | Ganti `wa-client.js` → `POST /messages/send` (text/interactive) + `/broadcast/send` (template, components flat object); `queue-consumer.js` buang suffix `@s.whatsapp.net` | ⬜ TODO |
| C.3 | Webhook status | Route `/webhook/whatsapp` di worker (verifikasi HMAC-SHA256 `X-Webhook-Signature`), mapping status sent/delivered/read/failed + error code, emit Socket.IO | ⬜ TODO |
| C.4 | UI mapping template + gate | Status approval template (pending/approved/rejected), gate broadcast | ⬜ TODO |
| C.5 | Frontend connect + cleanup | Hapus QR/pairing, status `configured`, hapus baileys deps | ⬜ TODO |

**Biaya:** Rp100rb/nomor/bulan + per pesan template (±Rp300–450/pesan).

---

## D. API Preparation (Laravel)

| # | Fitur | Status | Langkah |
|---|-------|--------|---------|
| 1.1 | API versioning `/api/v1/*` | ⬜ TODO | Struktur `routes/api/v1/` |
| 1.2 | Rate limiting per endpoint | ⬜ TODO | Per-endpoint limit + 429 handling |
| 1.3 | WebSocket shared (Socket.IO + Redis adapter) | ✅ DONE | Sudah |

---

## E. Web Modernization (Next.js 15)

> Desain lengkap: `docs/ui-ux-modernization-plan.md` (40 UI surfaces). Survey 2026-08-06: **0 halaman jadul** — semua halaman sudah dark theme + lucide + shadcn/ui.

| # | Fitur | Status | Catatan |
|---|-------|--------|---------|
| 0.1 | PWA (installable, offline) | ✅ DONE | Serwist + Capacitor 8 |
| 0.2 | Mobile-first responsive redesign | ✅ DONE | AndroidBottomNav + MobileNavBar |
| 0.3 | Page transitions & animations | ✅ DONE | framer-motion di layout |
| 0.4 | Skeleton loading screens | ✅ DONE | `Skeleton` component + SplashScreen |
| 0.5 | Touch-friendly UI (44x44px) | ✅ DONE | MobileNavBar touch targets |
| 0.6 | Bottom navigation (mobile) | ✅ DONE | `AndroidBottomNav.tsx` |
| 0.7 | Optimistic updates (React Query) | ⬜ TODO | Belum pakai React Query |

---

## F. Mobile App React Native (Private APK)

> `npx create-expo-app fif_mobile` di folder `mobile/`. Distribusi manual (EAS build), tidak ke Play Store.

| # | Fitur | Status | Langkah |
|---|-------|--------|---------|
| 2.1 | Expo project setup | ⬜ TODO | `create-expo-app` + TS + shared API layer |
| 2.2 | Auth flow | ⬜ TODO | SecureStore + token refresh |
| 2.3 | Dashboard + Prospect List | ⬜ TODO | Dashboard screen + FlatList |
| 2.4 | Broadcast Form + History | ⬜ TODO | Template preview + history table |
| 2.5 | WhatsApp Connect (QR Scanner) | ⬜ TODO | `expo-camera` QR scan + pairing |
| 2.6 | Push notification (Firebase) | ⬜ TODO | `expo-notifications` + Firebase |
| 2.7 | Offline support (cache + sync) | ⬜ TODO | AsyncStorage + sync queue |
| 2.8 | Private APK distribution | ⬜ TODO | `eas build --platform android` |

---

## Urutan Pengerjaan (diusulkan)

1. **A. WA Warming (W.1 → W.2 → W.3 → W.4)** — deadline 10 Ags, wajib inti dulu
2. **A. W.5 consent + W.7 auto-reply STOP** — kepatuhan, kecil, nilai tinggi
3. **A. W.6 Team Inbox → W.8 analytics → W.9 audit log**
4. **B. Single Data: M.3 → M.4 → M.5 → M.7 → M.8 → M.6 → M.9 → M.10 → M.11**
5. **D. API versioning + rate limiting** (paralel)
6. **C. Meta migration** (butuh akun api.co.id berbayar)
7. **F. Mobile app** (setelah E & B stabil)
8. **E.0.7 Optimistic updates** (kapan saja)

---

## Keputusan dari pengguna (catatan)

- Semua fitur dari daftar ini akan dikerjakan bertahap.
- Setiap fitur dikerjakan → status di tabel diubah ke `✅ DONE` + update `docs/CHANGELOG.md` + `AGENTS.md`.
