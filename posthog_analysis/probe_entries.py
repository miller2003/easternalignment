# -*- coding: utf-8 -*-
"""对入口页 TOP N 做线上存活探测，量化「404 入口页吞掉的会话量」"""
import json, os, ssl, urllib.request, urllib.error, concurrent.futures as cf

OUT = r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis\results"
BASE = "https://easternalignment.com"
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE


def probe(path):
    url = BASE + (path if path.startswith("/") else "/" + path)
    for method in ("HEAD", "GET"):
        try:
            r = urllib.request.Request(url, method=method,
                                       headers={"User-Agent": "Mozilla/5.0 (compatible; EAprobe/1.0)"})
            with urllib.request.urlopen(r, timeout=45, context=ctx) as x:
                return path, x.status, x.geturl()
        except urllib.error.HTTPError as e:
            if method == "GET":
                return path, e.code, url
        except Exception as e:
            if method == "GET":
                return path, "ERR:" + type(e).__name__, url
    return path, "?", url


rows = json.load(open(os.path.join(OUT, "a1_entry_all.json"), encoding="utf-8"))["results"]
rows = [r for r in rows if r[0] and r[0] != "(空)"]
TOPN = int(os.sys.argv[1]) if len(os.sys.argv) > 1 else 80
rows = rows[:TOPN]

res = {}
with cf.ThreadPoolExecutor(max_workers=8) as ex:
    for path, status, final in ex.map(probe, [r[0] for r in rows]):
        res[path] = (status, final)

out = []
for entry, sessions, clicks, csess, cvr in rows:
    st, fin = res.get(entry, ("?", ""))
    out.append({"entry": entry, "sessions": sessions, "clicks": clicks,
                "click_sessions": csess, "cvr": cvr, "status": st, "final": fin})

json.dump(out, open(os.path.join(OUT, "a4_entry_status.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

bad = [o for o in out if o["status"] != 200]
print(f"探测 {len(out)} 个入口页；非 200 共 {len(bad)} 个")
tot_bad_sess = sum(o["sessions"] for o in bad)
tot = sum(o["sessions"] for o in out)
print(f"非 200 入口页承载会话 {tot_bad_sess} / TOP{TOPN} 总 {tot}  →  {100.0*tot_bad_sess/tot:.1f}%")
for o in sorted(bad, key=lambda x: -x["sessions"]):
    print(f'  {o["status"]}  {o["sessions"]:>4} 会话  {o["clicks"]} 点击  {o["entry"]}')
