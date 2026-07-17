# Panduan Setup Termux SSH Tunnel untuk WhatsApp Proxy

> **Panduan ini untuk orang awam.** Setiap langkah dijelaskan dari nol.

---

## Kenapa Pakai Ini?

VPS FIF punya IP datacenter yang diblokir WhatsApp. Tunnel dari HP membuat koneksi WhatsApp **keluar dari HP Anda** (WiFi/paket data), jadi WhatsApp tidak blokir.

---

## SETUP SEKALI SAJA

Ikuti langkah ini **hanya sekali** di awal.

### 1. Install F-Droid

1. Buka browser HP → ketik **f-droid.org**
2. Tekan **Download** → install APK-nya
3. Jika diminta "Install from unknown sources" → izinkan → Install

### 2. Install Termux

1. Buka **F-Droid** (icon robot hijau)
2. Cari **Termux** → Install
3. **Jangan dari Play Store!** Versi Play Store tidak bisa dipakai.

### 3. Buka FIF → Copy Command → Paste ke Termux

1. Login ke **FIF Broadcast** → buka **Settings** (ikon ⚙️)
2. Scroll ke bawah → bagian **WhatsApp Tunnel**
3. Klik tombol **Salin** di sebelah **Setup Command**
4. Buka **Termux** di HP → **paste** command yang tadi → tekan **Enter**
5. Tunggu sampai selesai (1-2 menit). Jika muncul `[Y/n]`, ketik `y` + Enter.
6. Kembali ke FIF → klik **Simpan** (proxy address sudah otomatis benar)

**Selesai!** Sekarang:
- Tutup Termux → buka lagi → tunnel **auto-start otomatis**!

---

## SETIAP HARI (Mau Connect WA)

1. Buka **Termux** di HP → tunnel **auto-start otomatis**
2. Buka FIF → **WhatsApp** → Connect (Pairing Code / QR)
3. Selesai!

**Tidak perlu ketik apapun.** Cuma buka Termux → buka FIF → connect.

### Termux:Boot (HP Restart Juga Auto-Start)

Agar tunnel tetap jalan walau HP di-restart:

1. Install **Termux:Boot** dari F-Droid
2. Buka **Termux:Boot** sekali → izinkan autostart
3. Buka Termux → copy-paste ini:

```bash
PORT=$(grep -o 'socks5://127.0.0.1:\([0-9]*\)' ~/.termux/boot/fif-tunnel.sh 2>/dev/null | grep -o '[0-9]*$' || echo "1080")
cat > ~/.termux/boot/fif-tunnel.sh << EOF
#!/bin/bash
nohup sshd > /dev/null 2>&1
nohup autossh -M 0 -R ${PORT}:localhost:8022 root@202.10.42.237 -N -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" > /dev/null 2>&1 &
EOF
chmod +x ~/.termux/boot/fif-tunnel.sh
```

**Selesai!** HP restart → Termux auto-start → tunnel auto-connect. Tidak perlu buka Termux sama sekali.

---

## SETELAH BROADCAST SELESAI

| Yang dilakukan | Cara |
|----------------|------|
| **Biarkan saja** | WA auto-disconnect setelah 8 jam (otomatis dari server). Tunnel idle. |
| **Stop sekarang** | Disconnect WA dari FIF → buka Termux → tekan `Ctrl+C` |

> **Tidak perlu menutup Termux.** Tunnel tetap jalan tapi idle. Begitu mau connect lagi, tinggal buka FIF → Connect.

---

## Pakai Paket Data

Tidak ada WiFi? Bisa pakai kuota HP:

1. Matikan WiFi di HP
2. Buka Termux → ketik `fif`
3. Tunnel jalan pakai pakai data HP

> Yang penting HP tetap online (WiFi atau data).

---

## Cek Tunnel Sudah Aktif

Ketik di Termux:

```
fif
```

Jika sudah jalan, akan muncul:
```
[FIF] Tunnel sudah aktif! Langsung connect WA di FIF.
```

---

## Mencegah HP Matikan Termux

Android suka matikan app di background. Matikan battery optimization:

**Semua HP:**
Settings → Apps → Termux → Battery → **Unrestricted**

**Xiaomi/Redmi/POCO:**
Settings → Apps → Manage apps → Termux → Battery saver → **No restrictions**
Settings → Additional settings → Battery → Background autostart → aktifkan Termux

**Samsung:**
Settings → Device care → Battery → Termux → Disable background limiter

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `[FIF] Gagal menjalankan tunnel` | Cek password (`r8I3%PL1KOA#4X`) & koneksi internet |
| Tunnel mati beberapa menit | Matikan battery optimization (lihat di atas) |
| WhatsApp tetap diblokir | Tunnel belum jalan — ketik `fif`, cek pesan |
| Tidak bisa ketik di Termux | Tap layar → jika tidak muncul, close → buka Termux lagi |
| Termux tulisan kecil | Pinch to zoom (2 jari) |

---

## Ringkasan: Kapan Perlu Buka Termux?

| Situasi | Buka Termux? |
|---------|-------------|
| Pertama kali setup | ✅ Copy-paste command dari FIF Settings (sekali saja) |
| Mau connect WA | ✅ Buka Termux → auto-start → selesai |
| WA sudah connected | ❌ Biarkan saja |
| Broadcast selesai | ❌ WA auto-disconnect 8 jam (otomatis). Tunnel idle. |
| HP restart | ❌ Auto-start (kalau sudah setup Termux:Boot) |

---

## Ringkasan Perintah

### Sekali Saja (Setup)
Copy-paste command dari **FIF Settings → WhatsApp Tunnel → Setup Command**.

### Setiap Hari
Buka Termux → tunnel auto-start → buka FIF → connect WA.

### Stop Tunnel
Ctrl+C di Termux (opsional — biarkan saja juga tidak apa).
