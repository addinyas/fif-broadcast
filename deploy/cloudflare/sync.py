#!/usr/bin/env python3
"""FIF Cloudflare DNS sync - desired-state reconciliation."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML belum terinstall. Jalankan: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

API = "https://api.cloudflare.com/client/v4"
TOKEN = os.environ.get("CF_API_TOKEN", "")


def req(method, path, data=None):
    url = API + path
    body = json.dumps(data).encode() if data is not None else None
    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request) as resp:
            return json.load(resp), None
    except urllib.error.HTTPError as e:
        try:
            payload = json.load(e)
        except Exception:
            payload = {}
        return payload, "HTTP %s %s" % (e.code, e.reason)


def report(action, rec, detail=""):
    print("  %-6s %-6s %-22s %-16s %s" % (action, rec.get("type", "-"),
                                          rec.get("name", "-"),
                                          rec.get("content", "-"), detail))


def main():
    if not TOKEN:
        print("ERROR: CF_API_TOKEN belum di-set (secret GitHub / env).")
        sys.exit(1)

    base = os.path.dirname(os.path.abspath(__file__))
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(base, "dns.yaml")
    if not os.path.exists(cfg_path):
        print("ERROR: config tidak ditemukan: %s" % cfg_path)
        sys.exit(1)

    with open(cfg_path, encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}

    zone = cfg.get("zone", "")
    if not zone:
        print("ERROR: field 'zone' kosong di config.")
        sys.exit(1)

    print("=== FIF Cloudflare DNS sync ===")
    print("Zone  : %s" % zone)
    print("Config: %s" % cfg_path)

    resp, err = req("GET", "/zones?name=" + urllib.parse.quote(zone))
    if err or not resp.get("success"):
        print("ERROR: gagal ambil zone id (%s): %s" % (err, resp))
        sys.exit(1)
    zones = resp.get("result") or []
    if not zones:
        print("ERROR: zone '%s' tidak ditemukan (cek token & scope)." % zone)
        sys.exit(1)
    zone_id = zones[0]["id"]
    print("Zone ID: %s" % zone_id)

    managed = {}
    for rec in cfg.get("records", []):
        name = zone if rec.get("name") in ("@", "") else rec.get("name", zone)
        desired = {
            "name": name,
            "type": rec.get("type", "A").upper(),
            "content": str(rec.get("content", "")),
            "proxied": bool(rec.get("proxied", True)),
            "ttl": 1 if rec.get("proxied", True) else int(rec.get("ttl", 1)),
        }
        managed[(desired["name"], desired["type"])] = desired

    print("--- Reconcile DNS records ---")
    for (name, rtype), desired in sorted(managed.items()):
        path = "/zones/%s/dns_records?name=%s&type=%s" % (
            zone_id, urllib.parse.quote(name), rtype)
        resp, _ = req("GET", path)
        existing = (resp.get("result") or []) if resp.get("success") else []
        same = [r for r in existing
                if r.get("content") == desired["content"] and r.get("proxied") == desired["proxied"]]
        if same:
            for r in same[1:]:
                req("DELETE", "/zones/%s/dns_records/%s" % (zone_id, r["id"]))
                report("DELETE", r, "(duplikat)")
            report("SKIP", desired)
        elif existing:
            target = existing[0]
            for r in existing[1:]:
                req("DELETE", "/zones/%s/dns_records/%s" % (zone_id, r["id"]))
                report("DELETE", r, "(duplikat)")
            body = {k: desired[k] for k in ("content", "proxied", "ttl")}
            resp2, err2 = req("PATCH", "/zones/%s/dns_records/%s" % (zone_id, target["id"]), body)
            if resp2.get("success"):
                report("UPDATE", desired, "id=%s" % target["id"])
            else:
                report("UPDATE", desired, "GAGAL %s %s" % (err2, resp2))
        else:
            resp2, err2 = req("POST", "/zones/%s/dns_records" % zone_id, dict(desired))
            if resp2.get("success"):
                report("CREATE", desired)
            else:
                report("CREATE", desired, "GAGAL %s %s" % (err2, resp2))

    print("--- Cleanup record lama (content tak sesuai config) ---")
    for (name, rtype), desired in sorted(managed.items()):
        path = "/zones/%s/dns_records?name=%s&type=%s&per_page=100" % (
            zone_id, urllib.parse.quote(name), rtype)
        resp, _ = req("GET", path)
        for r in (resp.get("result") or []):
            if r.get("content") != desired["content"]:
                req("DELETE", "/zones/%s/dns_records/%s" % (zone_id, r["id"]))
                report("DELETE", r, "(content tidak sesuai config)")

    ssl_mode = cfg.get("ssl_mode")
    if ssl_mode:
        print("--- SSL mode ---")
        resp, _ = req("GET", "/zones/%s/settings/ssl" % zone_id)
        current = (resp.get("result") or {}).get("value")
        if current and current != ssl_mode:
            resp2, err2 = req("PATCH", "/zones/%s/settings/ssl" % zone_id, {"value": ssl_mode})
            if resp2.get("success"):
                print("  UPDATE ssl mode: %s -> %s" % (current, ssl_mode))
            else:
                print("  UPDATE ssl mode GAGAL: %s %s" % (err2, resp2))
        elif current:
            print("  SKIP ssl mode (sudah %s)" % current)
        else:
            print("  GAGAL ambil ssl mode saat ini")

    print("=== Audit: record yang bisa membocorkan IP origin ===")
    resp, err = req("GET", "/zones/%s/dns_records?per_page=100" % zone_id)
    if not resp.get("success"):
        print("  GAGAL list record: %s %s" % (err, resp))
    else:
        records = resp.get("result") or []
        leaks = [r for r in records
                 if r.get("type") in ("A", "AAAA") and r.get("proxied") is False]
        print("  Total record DNS: %d" % len(records))
        if not leaks:
            print("  OK — tidak ada A/AAAA record yang 'DNS only' (semua ter-proxy) ✅")
        else:
            for r in leaks:
                print("  !! LEAK: %s %s -> %s (DNS only, IP origin terekspos)" % (
                    r.get("name"), r.get("type"), r.get("content")))

    print("=== Selesai ===")


if __name__ == "__main__":
    main()
