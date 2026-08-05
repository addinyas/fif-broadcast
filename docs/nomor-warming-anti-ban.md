# Nomor WhatsApp FIF: Pemanasan (Warming) + Anti-Ban

**Status: DESAIN** — fitur belum diimplementasikan.

Dokumen ini berisi (1) pola & fitur aplikasi **api.co.id** yang ingin ditiru ke FIF (tanpa pindah backend), dan (2) desain **fitur pemanas nomor** agar nomor baru yang ditanam di aplikasi tidak kena banned. Disusun dari riset referensi eksternal (Wapisimo, Whapi, Replai, Qontak, WAWarmer, baileys-antiban, docs watzap.id, dll).

---

## 1. Pola & Fitur api.co.id yang Ditiru ke FIF

> Sumber: halaman produk `api.co.id/whatsapp-api-gateway` + docs developer. Tujuan: meniru **pola alur & fitur**, BUKAN memakai api.co.id sebagai backend.

### 1.1 Alur on-boarding (3 langkah)

1. Daftar akun (email/Google, tanpa kartu kredit).
2. **Connect nomor** — Embedded Signup, ±2 menit.
3. Generate API key → panggil REST API.

**Adaptasi ke FIF:** user buka `/connect` → scan QR (Baileys) → status `connected` → tiap user punya nomor sendiri (sudah ada di `whatsapp_connections`). Ditambah langkah **warm-up wajib sebelum bisa broadcast** (lihat seksi 2).

### 1.2 Fitur yang ada di api.co.id vs FIF

| Fitur api.co.id | Status di FIF | Rencana |
|---|---|---|
| Broadcast campaign + track delivery/read/response | ✅ Ada (status sent/delivered/read/failed) | Tambah metrik **response rate** per campaign |
| Template management (buat → submit → approved) | ⚠️ Ada tabel `templates`, tanpa status approval | Tambah status `pending/approved/rejected` |
| Multi-number, 1 akun (tiap nomor = user) | ⚠️ Konsep ada (`whatsapp_connections` per user) | Pertahankan; tiap nomor baru harus lewat warm-up |
| RBAC 4 level (Admin, Business Owner, Agent, Team Member) | ✅ superadmin/UH/AO/marketing | Tetap |
| CRM: customer, custom fields, **tags, auto-tagging, pipeline, lead scoring** | ⚠️ customers + dynamic_data ada; tags/pipeline belum | Tahap 2: tags + auto-tagging |
| **Team Inbox** (1 nomor, banyak operator, assignment) | ❌ Tidak ada (broadcast 1 arah) | Tahap 2: inbox percakapan per user |
| Chatbot / auto-reply via webhook | ❌ Tidak ada | Tahap 2: auto-reply inbound |
| **Consent management** (OPT_IN/OUT, kepatuhan) | ❌ Tidak ada | Tahap 1: tabel consent + gate broadcast |
| Analytics dashboard | ⚠️ History ada | Tahap 2: agregat per campaign |
| Audit log | ❌ Tidak ada | Tahap 1: log aksi user |
| Import/Export bulk | ✅ Excel import ada | Tetap |
| Interactive buttons / list menu / media | ⚠️ Baileys bisa, UI belum | Tahap 2 |

### 1.3 Pola alur menarik yang ditiru

- **"Satu dashboard, banyak channel"** → FIF: semua nomor user terpusat di satu dashboard (bukan per-app).
- **"5 team member per nomor"** → assignment percakapan otomatis/manual ke agent.
- **Idempotent & reliable** → unique message ID + retry-safe (FIF sudah retry 3x).

---

## 2. Desain Fitur Pemanas Nomor (Warm-up)

### 2.1 Latar belakang & prinsip (dari riset)

Ban WhatsApp didorong **ML heuristik**, bukan jumlah pesan. Sinyal utama:

1. **Contact-graph** — kirim ke orang asing / bukan kontak tersimpan = sinyal terkuat.
2. **Reply ratio** — pesan 1 arah yang tak dibalas (curiga di bawah ~10–20%) = spam.
3. **Pola temporal** — interval tetap robotik (tiap 10 detik persis) terdeteksi.
4. **Block/report rate** — laporan spam & blokir menurunkan reputasi cepat.
5. **Fingerprint protokol** — klien reverse-engineer (Baileys) terdeteksi di lapisan jaringan — **volume rendah pun tetap kena** jika salah pola.

> Konsekuensi penting: warming mengurangi risiko perilaku (lapisan 2–3), TAPI Baileys tetap melanggar ToS (lapisan 1). Jadi fitur ini = **pengurang risiko, bukan penjamin bebas ban**. Jalan bebas ban 100% hanya Cloud API resmi.

### 2.2 Tahapan warm-up (ringkasan lintas referensi)

| Hari | Aktivitas | Batas |
|---|---|---|
| **0** | Jangan scan QR langsung setelah daftar; isi profil (foto, nama), simpan ≥20–50 kontak | — |
| **1–3** | **Pasif** — hanya terima & balas pesan masuk (0 kirim aktif) | 0 outbound |
| **4–7** | Balas semua inbound; chat 3–6 kontak dikenal; tukar media/stiker; jaga 3–5 putaran | 3–5 kontak/hari |
| **8–14** | Naik ke 10–15 chat; mulai semi-promosi terpersonalisasi; ikut grup | 30–50 pesan/hari |
| **15–21** | 80–100 orang, pesan bervariasi + personalisasi; kecilkan broadcast | ~1 broadcast kecil |
| **22–60** | **Pematangan** — mulai volume normal | 50–80 pesan/hari, broadcast 1×/minggu |
| **60+** | **Mature** — volume penuh | 100–200/hari, broadcast 2–3×/minggu |

Aturan pacing umum (lintas sumber):
- ≤2 pesan/menit, ≤6 jam aktivitas/hari, jangan 3 hari berturut-turut di minggu pertama.
- Jeda **acak 3–8 menit** (bukan interval tetap); jam bulat dihindari.
- Jam per jam ≤20% dari batas harian.
- Delivery rate dipantau 30 menit pasca kirim; **jeda jika <85%**.
- KPI kesehatan: reply rate ≥20% (sehat), report ≤0,1% (waspada), block ≤0,5% (waspada).

### 2.3 Rancangan teknis di FIF

#### Migration `number_warmup_profiles`
```
id
user_id (FK users)
stage (enum: 'inactive' | 'passive' | 'active' | 'mature')
started_at (kapan nomor mulai warm-up)
stage_started_at
daily_outbound_limit (int, dihitung dari stage)
messages_sent_today (int)
last_send_at (timestamp — untuk pola acak/anti-interval-tetap)
consecutive_active_days (int)
health (json: { reply_rate, report_count, block_count })
flags (json: { allow_broadcast: bool, auto_pause: bool })
```

#### Blokir/izin kirim di worker
- `queue-consumer.js`: sebelum kirim, cek `warmup.daily_outbound_limit` & `stage`. Stage `passive` → **tolak semua outbound broadcast** (hanya balasan inbound via chat).
- Pace: gunakan jitter acak (reuse pola `randomBetween` di `broadcast-config.js`) dengan **variasi per nomor** — jangan jeda identik antar nomor.
- `auto_pause`: jika delivery rate turun <85% atau reply <10% → hentikan antrian nomor itu, tandai perlu review.

#### Fitur "nomor baru ditanam"
- Halaman `/admin/connect` → tombol **"Tanam nomor baru"** → alur: input nomor → scan QR → nomor masuk stage `passive` → **auto-lock broadcast** sampai selesai warm-up.
- UI menampilkan: stage saat ini, hari ke-, sisa kuota hari ini, progress bar (mis. `passive 3/7 hari`).

#### Database inbox & consent (fondasi fitur tahap 2)
- `conversations`, `conversation_messages` (inbound/outbound per nomor-user) — untuk Team Inbox & reply.
- `consent` table (OPT_IN/OPT_OUT per customer+nomor) — gate broadcast & auto-honor "STOP".

### 2.4 Integrasi dengan arsitektur FIF

```
/connect (tanam nomor baru → QR)
   └─ whatsapp_connections.status = 'warming'  (stage passive)
        └─ number_warmup_profiles
             ├─ queue-consumer.js: gate kirim (limit, stage, auto_pause)
             ├─ wa-client.js: jitter variasi per nomor
             └─ Socket.IO: event warmup:progress → UI progress bar
```

### 2.5 Checklist penerapan

- [ ] Migration `number_warmup_profiles` + `consent`
- [ ] Worker: gate stage/limit di `queue-consumer.js` + jitter variasi per nomor
- [ ] UI connect: tombol tanam nomor + progress warm-up
- [ ] Health monitoring (delivery/reply/report/block) + auto_pause
- [ ] Uji: nomor baru `passive` tidak bisa broadcast sampai selesai

---

## 3. Referensi Riset

- Wapisimo — *How to Warm Up a WhatsApp Number*: https://wapisimo.dev/blog/en/how-to-warm-up-a-phone-number (site: wapisimo.dev/blog/en/how-to-warm-up-a-whatsapp-number)
- Whapi — *Warming up new numbers*: https://support.whapi.cloud/help-desk/blocking/warming-up-new-phone-numbers-for-whatsapp-api
- Replai — *Will WhatsApp ban your number?*: https://replai.pm/blog/will-whatsapp-ban-your-number
- Qontak — *Kirim Pesan Massal Anti-Banned*: https://qontak.com/blog/cara-mengirim-pesan-massal-di-whatsapp-anti-banned/
- WAWarmer — *WhatsApp New Account Warmup* (ID): https://warmer.wadesk.io/id/blog/whatsapp-new-account-warmup
- WAWarmer — *Bulk Sending Safety Guide*: https://warmer.wadesk.io/id/blog/whatsapp-bulk-sending-safety
- Bablast — *Warming up nomor lama*: https://www.bablast.id/artikel/pentingnya-warming-up-whatsapp-bukan-cuma-nomor-baru-nomor-lama-juga-perlu
- Watzap — *Tips Anti-Banned*: https://docs.watzap.id/help/connect-to-whatsapp/tips-anti-banned-whatsapp
- baileys-antiban (npm/GitHub): https://github.com/kobie3717/baileys-antiban
- Kraya — *WhatsApp Automation Ban Risk*: https://blog.kraya-ai.com/whatsapp-automation-ban-risk
- GitHub issue WhiskeySockets/Baileys #2131 — *number getting banned*
