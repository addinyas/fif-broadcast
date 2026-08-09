#!/usr/bin/env bash
#
# Setup Cloudflare WARP sebagai SOCKS5 proxy lokal (127.0.0.1:40000).
# Idempoten — aman dijalankan ulang.
#
# Setelah ini, isi WA_PROXY di env worker:
#   WA_PROXY=socks5://127.0.0.1:40000
# Lalu verifikasi egress IP berubah ke jaringan Cloudflare (langkah terakhir).
#
# Penggunaan: sudo bash deploy/setup-warp.sh

set -euo pipefail

echo "==> Memeriksa distribusi"
if [ ! -f /etc/debian_version ]; then
  echo "Script ini untuk Debian/Ubuntu saja." >&2
  exit 1
fi
CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
CODENAME="${CODENAME:-bookworm}"

echo "==> Menambahkan repo cloudflare-warp ($CODENAME)"
if [ ! -f /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg ]; then
  curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg \
    | gpg --dearmor \
    > /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
fi
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $CODENAME main" \
  > /etc/apt/sources.list.d/cloudflare-client.list

echo "==> Menginstal cloudflare-warp"
apt-get update -qq
if ! command -v warp-cli >/dev/null 2>&1; then
  apt-get install -y cloudflare-warp
fi

echo "==> Registrasi (jika belum)"
if ! sudo warp-cli --accept-tos account 2>/dev/null | grep -qi 'reg'; then
  sudo warp-cli --accept-tos registration new
fi

echo "==> Mode SOCKS5 proxy"
sudo warp-cli --accept-tos mode proxy >/dev/null 2>&1 || true

echo "==> Menghubungkan"
sudo warp-cli --accept-tos connect >/dev/null 2>&1 || true

sleep 2
echo "==> Status:"
sudo warp-cli --accept-tos status || true

echo
echo "==> IP keluar sekarang (harus berbeda dari IP VPS asli, milik Cloudflare):"
curl -s --socks5-hostname 127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace | grep -E '^(ip|loc|colo)=' || \
  curl -s --socks5-hostname 127.0.0.1:40000 https://api.ipify.org || true

echo
echo "==> Selesai. Tambahkan WA_PROXY=socks5://127.0.0.1:40000 ke env worker."
