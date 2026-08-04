# Migrasi WhatsApp: Baileys → Meta WhatsApp Business Cloud API

**Status: RENCANA** — belum dieksekusi.

Dokumen ini adalah rencana migrasi sistem broadcast FIF dari Baileys (WhatsApp Web tidak resmi) ke **Meta WhatsApp Business Cloud API** (Graph API resmi via Meta / Facebook Developers).

---

## 1. Ringkasan & Keputusan

| Aspek | Keputusan |
|---|---|
| Transport | Ganti **total** — Baileys dihapus, tanpa fallback |
| Nomor | **Satu WABA, satu nomor per marketing user** (tiap user punya `phone_number_id` sendiri) |
| Jenis pesan | Broadcast = pesan yang diinisiasi bisnis → **wajib template Meta yang sudah disetujui** |
| Template | Disetujui **per WABA** → submit sekali, dipakai semua nomor/user |
| Token | Satu **system user token permanen** per WABA (bukan app token yang expire) |
| Biaya | Broadcast = *marketing conversation* → **berbayar per pesan** |

### Alasan

- Baileys melanggar ToS WhatsApp, risiko ban & diblokir kapan saja.
- Cloud API resmi: lebih stabil, tanpa QR, tanpa proxy per perangkat, status pengiriman granular (sent/delivered/read/failed).
- Tradeoff utama: (1) semua pesan broadcast harus pakai template approved Meta, (2) biaya per pesan, (3) butuh WABA + verifikasi bisnis.

---

## 2. Prasyarat & Setup Meta (Fase 0 — MANUAL, 1–7+ hari)

> Jalur kritis — verifikasi bisnis & approval template **tidak bisa diprogram**. Kerjakan paralel dengan pengembangan kode.

### 2.1 Verifikasi bisnis
1. Daftar di [business.facebook.com](https://business.facebook.com) → buat **Meta Business Manager**.
2. Selesaikan **verifikasi bisnis** — butuh dokumen: NIB, akta, atau KTP pengurus. Verifikasi bisa makan beberapa hari.

### 2.2 Buat WABA + nomor
1. Di Business Manager → WhatsApp → **WhatsApp Manager** → buat **WhatsApp Business Account (WABA)**.
2. Tambahkan **satu nomor per marketing user** (paket nomor khusus API / nomor yang tidak terdaftar di WhatsApp app biasa).
3. Setiap nomor mendapat **`Phone Number ID`** sendiri. WABA punya **`WABA ID`**.

### 2.3 Buat app + token
1. Di [developers.facebook.com](https://developers.facebook.com) → buat app tipe **Business**.
2. Tambahkan produk **WhatsApp**.
3. Buat **System User** di Business Manager → beri akses WABA → buat **permanent access token** (masa aktif panjang/abadi, bukan app token 24 jam).

### 2.4 Submit template
1. WhatsApp Manager → **Message Templates** → buat template per konten yang ada di tabel `templates` backend.
2. Variabel ditulis sebagai **`{{1}}`, `{{2}}`, dst** — urutan angka HARUS dicatat sebagai `variable_order` di mapping (mis. `["nama","plat","angsuran_kurang"]`).
3. Tunggu status **approved** (review bisa 1–3+ hari). Template butuh bahasa + kategori (marketing/utility/authentication).

### 2.5 Subscribe webhook
1. App → WhatsApp → **Configuration** → *Webhook* → set URL `https://<domain>/webhook/whatsapp` + `Verify token` (env `META_WEBHOOK_VERIFY_TOKEN`).
2. Subscribe field **`messages`**.

### Checklist akun
- [ ] Business Manager terverifikasi
- [ ] WABA aktif
- [ ] N nomor ditambahkan (satu per user) + `phone_number_id` tiap nomor
- [ ] System user + permanent token
- [ ] Semua template disubmit + approved
- [ ] Webhook tersubscribe (field `messages`)

---

## 3. Arsitektur Target

```
BroadcastService (backend)
   └─ render template + mapping Meta ──▶ broadcast_histories
                                          ├─ template_name
                                          ├─ template_params (JSON: {{1}}={{nama}}, dst)
                                          └─ wamid (dari webhook)
                                              │
worker ── meta-client.js ──▶ POST graph.facebook.com/v21.0/{phone_number_id}/messages
                                              │
                                    Meta Graph API
                                              │
                        webhook POST /webhook/whatsapp (worker :3001, via nginx)
                                              │
                     statuses[] (sent/delivered/read/failed) ──▶ DB + Socket.IO
```

### Yang berubah vs. yang tetap

| Tetap (tak tersentuh) | Ganti |
|---|---|
| `queue-consumer.js` — poll, claim `pending→processing`, retry, pacing | `wa-client.js` → `meta-client.js` (Graph API REST) |
| `broadcast_histories` (status, retry, error_log) + schema | `whatsapp_connections` → simpan `phone_number_id`/`waba_id`/`access_token` (ganti `qr_code`) |
| `broadcast_settings` + `broadcast-config.js` | Format nomor: buang suffix `@s.whatsapp.net` |
| Semua event Socket.IO + `events.js` (nama event sama, frontend aman) | Gate `BroadcastService::prepare()` — cek `connected` → cek `configured` + template approved |
| `BroadcastController`, daily limit 100 | `templates` → mapping `meta_templates` + status approval |
| | Deps: hapus `baileys`, `socks-proxy-agent`, `https-proxy-agent` |
| | UI connect: hapus QR / pairing code |

---

## 4. Perubahan Backend (Fase 1)

### 4.1 Migration `whatsapp_connections`
Tambah kolom:
- `phone_number_id` (nullable, string)
- `waba_id` (nullable, string)
- `access_token` (text, **di-encrypt** dengan app key — jangan plaintext)
- `qr_code` jadi tidak terpakai (bisa di-drop di migrasi bersih)

Status baru: `unconfigured → configured → error`. Semantik "connected" (socket Baileys) tidak berlaku lagi.

### 4.2 Migration `broadcast_histories`
- `template_name` (nullable, string)
- `template_params` (nullable, JSON — array parameter berurutan `{{1}}`, `{{2}}`, ...)
- `wamid` (nullable, string — untuk mapping status webhook)

### 4.3 Tabel `meta_templates`
- `id`, `template_id` (FK ke `templates`)
- `meta_template_name` (string)
- `language` (string, default `id`)
- `status` (`pending` / `approved` / `rejected`)
- `variable_order` (JSON — urutan key variabel, mis. `["nama","plat","angsuran_kurang"]`)
- timestamps

### 4.4 Endpoint & service
- `WhatsappConnectionController` — endpoint set/lihat konfigurasi WABA per user.
- `BroadcastService::prepare()` — saat render, tulis `template_name` + `template_params` ke `broadcast_histories`; **gate**: template harus `approved`, kalau tidak → tolak dengan pesan jelas.
- Mapping variabel: `#nama` → `{{1}}` dst sesuai `variable_order`.

---

## 5. Perubahan Worker (Fase 2)

### 5.1 `wa-client.js` → `meta-client.js`
- Hapus: `makeWASocket`, `useMultiFileAuthState`, `auth_info/`, QR, `requestPairingCode`, `sendPresenceUpdate` (typing anti-ban), reconnect/backoff (`DisconnectReason`), proxy agent.
- Ganti dengan kirim langsung:
  ```
  POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
  Authorization: Bearer {access_token}
  {
    "messaging_product": "whatsapp",
    "to": "628xxx",
    "type": "template",
    "template": {
      "name": "<meta_template_name>",
      "language": { "code": "id" },
      "components": [{ "type": "body", "parameters": [ { "type": "text", "text": "..." } ] }]
    }
  }
  ```
- `getConnectedUsers()` / `isConnectedForUser` → cek status `configured` + token valid (bisa cek via Graph API ping/`debug_token`).
- Token dibaca per user dari DB (cache 30 s, pola sama seperti `broadcast-config.js`).

### 5.2 `queue-consumer.js`
- Line 151: buang suffix `@s.whatsapp.net` → kirim `to: "628xxx"` (normalisasi `08xx → 628xx` tetap).
- Panggil `sendTemplateMessage(userId, to, templateName, params)` menggantikan `sendMessage(userId, jid, text)`.
- Status sukses antrian: `pending→processing→sent` tetap, tapi konfirmasi `sent` final sebaiknya datang dari webhook (`wamid`).
- Pacing anti-ban (delay 6–12 s, sesi, istirahat) **dipertahankan** sebagai pengaman rate limit Cloud API.

### 5.3 `index.js`
- Hapus stale cleanup `auth_info/` (8 jam). Startup: tandai semua `processing` → `pending` (tetap).

---

## 6. Webhook Status (Fase 3)

### 6.1 Route di worker (HTTP server port 3001)
- `GET /webhook/whatsapp` — handshake: terima `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge` → balas `hub.challenge` bila token cocok (env `META_WEBHOOK_VERIFY_TOKEN`).
- `POST /webhook/whatsapp` — event JSON `entry[].changes[].value`:
  - `messages[]` → inbound (log / abaikan untuk sekarang).
  - `statuses[]` → `{ wamid, status, errors[] }` dengan `status` ∈ `sent | delivered | read | failed`.

### 6.2 Mapping status → DB
- `wamid` → cari `broadcast_histories.wamid` → update:
  - `sent`/`delivered` → `sent` (jika masih `processing`) + `sent_at`.
  - `failed` → `failed` + `error_log` (kode error).
- Error penting:
  - `131026` — message undeliverable
  - `131047` / `470` — re-engagement message blocked (waktu window 24 jam habis)
  - `131056` — nomor tidak di WhatsApp
- Setelah update → emit event Socket.IO yang sama: `broadcast:status`, `broadcast:progress`, `broadcast:global_status`.

### 6.3 Publikasi
- Nginx VPS: `location /webhook/whatsapp { proxy_pass http://127.0.0.1:3001; }`.
- Perlu verifikasi config deploy (`deploy/deploy-vps.sh`) — Webhook hanya butuh path tertentu, Socket.IO tetap via port 3001.

---

## 7. Mapping Template (Fase 4)

- UI admin: daftar `templates` + status approval Meta, preview, isi `variable_order`.
- Rendering: ganti variabel bernama (`#nama`, `#plat`, `#angsuran_kurang`, dst) dengan parameter berurutan `{{1}}`, `{{2}}`, ... sesuai `variable_order`.
- Gate broadcast: `template.status === 'approved'`, jika `pending`/`rejected` → blokir kirim dengan pesan jelas.
- Setelah template edit di Meta, admin perbarui status di UI.

---

## 8. Frontend & Cleanup (Fase 5)

- Halaman connect (`admin/connect`, `marketing/connect`): hapus QR & pairing code → admin isi `phone_number_id`/`waba_id`/token; marketing lihat status `configured`.
- `admin/wa-monitor`: tampilkan status WABA per user (bukan QR).
- Gate `BroadcastService::prepare()`: ganti cek `whatsapp_connections.status === 'connected'` → `status === 'configured'` (+ template approved).
- Hapus dependensi: `baileys`, `socks-proxy-agent`, `https-proxy-agent`; hapus folder `worker/auth_info/`; hapus kode QR/pairing/reconnect.
- Verifikasi: `composer run test` ✅, `pint` ✅, `npx tsc --noEmit` ✅, `npm run build` ✅ (30 routes).

---

## 9. Biaya & Rate Limit

- Broadcast = **marketing conversation** → berbayar per pesan (tarif per negara tujuan; Indonesia ≈ IDR 1.100-an/pesan tergantung tier volume).
- Ada **1.000 service conversation gratis/bulan** (bukan marketing) — broadcast TIDAK tercakup.
- Bisnis **unverified**: throughput dibatasi ±1.000 conversation/hari; verifikasi membuka kuota lebih tinggi.
- Setiap nomor punya batas throughput sendiri (messages/detik) — pacing 6–12 s tetap masuk akal.

---

## 10. Sekuens & Timeline

| Fase | Isi | Durasi | Bergantung |
|---|---|---|---|
| **0** | Setup Meta (verifikasi, WABA, nomor, template, webhook) | 1–7+ hari | Manual / eksternal |
| **1** | Backend: migration + config WABA + mapping template | ~1 hari | — |
| **2** | Worker: `meta-client.js` + queue-consumer | ~1 hari | — |
| **3** | Webhook status + nginx | ~0,5–1 hari | Fase 0 (webhook subscribe) |
| **4** | UI mapping template + gate | ~0,5 hari | Fase 1 |
| **5** | Frontend connect, cleanup, testing | ~0,5–1 hari | Fase 2–4 |

Fase 1–2 bisa jalan paralel dengan Fase 0; Fase 3–5 butuh akun siap (token, nomor, template approved).

---

## Referensi

- Meta for Developers — WhatsApp Business Platform: https://developers.facebook.com/docs/whatsapp
- Graph API `messages` endpoint: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
- Webhooks: https://developers.facebook.com/docs/graph-api/webhooks
- Error codes: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
