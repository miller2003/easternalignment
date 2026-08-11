#!/usr/bin/env python3
# Check every reader-specific deep link in affiliateLinks.ts against the live platform.
import re, urllib.parse, urllib.request, ssl, json, sys, time

SRC = r"C:\Users\samja\Desktop\site\easternalignment\src\data\affiliateLinks.ts"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1) parse slug -> full affiliate URL
entries = {}
with open(SRC, encoding="utf-8") as f:
    for line in f:
        m = re.search(r'"([^"]+)"\s*:\s*"([^"]*)"', line)
        if not m:
            continue
        slug, url = m.group(1), m.group(2)
        entries[slug] = url

# 2) extract the platform deep-link (url= param), stripped of tracking query
def deep_link(aff_url):
    idx = aff_url.find("&url=")
    if idx == -1:
        return None
    enc = aff_url[idx+5:]
    # the encoded value may itself contain & (encoded as %26). decode fully.
    dec = urllib.parse.unquote(enc)
    return dec.split("?")[0]

rows = []
for slug, aff in entries.items():
    dl = deep_link(aff)
    if not dl:
        rows.append((slug, "GENERIC_OFFER", None, "no url= param (platform homepage/offer) — always live", None))
        continue
    host = urllib.parse.urlparse(dl).netloc
    rows.append((slug, host, dl, None, None))

# 3) probe each deep link
def probe(url):
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
            data = r.read(200000).decode("utf-8", "ignore")
            return r.status, r.geturl(), data
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception as e:
        return "ERR:"+type(e).__name__, url, str(e)[:200]

print("=== READER-SPECIFIC DEEP LINK HEALTH CHECK ===\n")
dead, uncertain, generic, alive = [], [], [], []
for slug, host, dl, note, _ in rows:
    if dl is None:
        generic.append((slug, note))
        continue
    status, final, data = probe(dl)
    # heuristic for soft-404 / "not found" pages that still return 200
    low = (data or "").lower()
    soft404 = any(k in low for k in [
        "page not found", "reader not found", "psychic not found",
        "no longer available", "could not be found", "this profile",
        "is not available", "we couldn't find", "does not exist",
        "has been removed", "no longer exists"
    ])
    line = f"[{slug}] {dl}\n    status={status} final={final[:90]}"
    if status in (404, 410) or soft404:
        dead.append((slug, host, dl, status, soft404))
        line += "  --> DEAD"
    elif isinstance(status, int) and 200 <= status < 400:
        alive.append(slug)
        line += "  --> OK"
    else:
        uncertain.append((slug, host, dl, status))
        line += "  --> UNCERTAIN (bot-blocked?)"
    print(line)
    time.sleep(0.4)

print("\n=== SUMMARY ===")
print(f"Generic (always-live) offers : {len(generic)}")
print(f"Reader links probed          : {len(dead)+len(alive)+len(uncertain)}")
print(f"  ALIVE  : {len(alive)}")
print(f"  DEAD   : {len(dead)}")
print(f"  UNCERTAIN (needs manual) : {len(uncertain)}")

if dead:
    print("\nDEAD READER LINKS (fix these):")
    for slug, host, dl, status, soft in dead:
        print(f"  - {slug} ({host}) status={status} soft404={soft}")
if uncertain:
    print("\nUNCERTAIN (bot-blocked, verify in a real browser):")
    for slug, host, dl, status in uncertain:
        print(f"  - {slug} ({host}) status={status} -> {dl}")

# dump machine-readable
out = {"generic": [s for s,_ in generic],
       "dead": [{"slug":s,"host":h,"url":u,"status":st} for s,h,u,st,_ in dead],
       "uncertain": [{"slug":s,"host":h,"url":u,"status":str(st)} for s,h,u,st in uncertain],
       "alive": alive}
with open(r"C:\Users\samja\Desktop\site\easternalignment\scratch\link_health.json","w") as f:
    json.dump(out, f, indent=2)
print("\nWrote scratch/link_health.json")
