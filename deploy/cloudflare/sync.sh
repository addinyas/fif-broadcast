#!/usr/bin/env bash
set -euo pipefail
# Jalankan manual:  CF_API_TOKEN=<token> bash deploy/cloudflare/sync.sh [path-ke-dns.yaml]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/sync.py" "${1:-$SCRIPT_DIR/dns.yaml}"
