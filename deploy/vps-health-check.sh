#!/bin/bash
# FIF VPS Health Check Script
# Jalankan: ssh root@<VPS_IP> "bash /var/www/fif/deploy/vps-health-check.sh"
set -euo pipefail
echo "========================================="
echo "  FIF VPS Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""
echo "=== 1. System Uptime ==="
uptime
echo ""
echo "=== 2. Memory ==="
free -h
echo ""
echo "=== 3. Disk ==="
df -h / /var/www/fif/backend/database
echo ""
echo "=== 4. CPU Load ==="
nproc; cat /proc/loadavg
echo ""
echo "=== 5. Services ==="
systemctl is-active fif-worker fif-queue nginx 2>&1 || true
echo ""
echo "=== 6. Docker (WARP proxy) ==="
docker ps --filter name=warp --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"
echo ""
echo "=== 7. Network Ports ==="
ss -tlnp | grep -E ":8000|:3001|:80|:443" 2>/dev/null || echo "No services listening"
echo ""
echo "=== 8. opencode process ==="
pgrep -a opencode > /dev/null && echo "opencode: RUNNING (PID $(pgrep -x opencode))" || echo "opencode: NOT RUNNING"
echo ""
echo "=== 9. Last errors (opencode.log) ==="
tail -20 /tmp/opencode_failover.log 2>/dev/null || echo "No failover log yet"
echo ""
echo "=== 10. Backend health ==="
curl -s -m 5 http://127.0.0.1:8000/api/health 2>/dev/null && echo "" || echo "Backend unreachable"
echo ""
echo "========================================="
echo "  Check complete"
echo "========================================="
