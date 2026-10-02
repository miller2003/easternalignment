"""逐页流量:列出 /guides 全部文章 + 每页 PostHog 流量(含零流量页)。
口径照抄 skill ea-posthog-traffic-analysis(CLEAN)。
用法:python guides_traffic.py
产出:results/gt_list.json(源清单) / gt_pages_all.json(全期) / gt_pages_sep.json(9月)
"""
import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
GUIDES = os.path.join(WS, "src", "content", "guides")
README = r"C:\Users\samja\Desktop\EA资料\posthog-query\README.md"
PROJECT = 532954
API = f"https://us.posthog.com/api/projects/{PROJECT}/query/"

SELF_IDS = (
    "8435b8d5-16b6-5f4b-9b71-f5d4d196ad00",
    "83b89204-633d-56fa-9e65-202e62d839ff",
    "259d7d34-120f-50a6-a260-3e7fa192ae79",
    "8b444548-d415-5d49-88b2-f717feaba288",
    "b7575d9c-8453-5600-874a-47188ad98ec8",
    "01a0b5bc-770d-7c62-b34d-5416ccb6f386",
)
DEV = "('localhost:4321','127.0.0.1:8188','127.0.0.1:8765','localhost:8765','127.0.0.1:8931')"
SELF = "AND (person_id IS NULL OR toString(person_id) NOT IN (" + ",".join(
    f"'{i}'" for i in SELF_IDS) + "))"
CLEAN = f"""coalesce(properties.$host,'') = 'easternalignment.com'
  AND coalesce(properties.$geoip_country_code,'') != 'CN'
  AND coalesce(properties.$session_entry_referring_domain,'') NOT IN {DEV}
  {SELF}"""


def api_key():
    txt = open(README, "r", encoding="utf-8", errors="replace").read()
    m = re.search(r"(phx_[A-Za-z0-9]+)", txt)
    if not m:
        sys.exit("no key found")
    return m.group(1)


KEY = api_key()


def run(sql, tries=4):
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": sql}}).encode()
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(
                API, data=body,
                headers={"Authorization": f"Bearer {KEY}",
                         "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read().decode())
            if j.get("error"):
                raise RuntimeError(str(j["error"]))
            return j
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:800]
            last = f"HTTP {e.code}: {detail}"
            print(f"  [retry {i+1}] {last}", flush=True)
            time.sleep(3)
        except Exception as e:  # noqa
            last = e
            print(f"  [retry {i+1}] {e}", flush=True)
            time.sleep(3)
    raise RuntimeError(f"query failed after {tries}: {last}")


def save(name, sql):
    j = run(sql)
    p = os.path.join(OUT, name + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"sql": sql, "columns": j["columns"], "results": j["results"],
                   "hasMore": j.get("hasMore")}, f, ensure_ascii=False, indent=1)
    print(f"[ok] {name}  rows={len(j['results'])} hasMore={j.get('hasMore')}", flush=True)
    return j


# ---------- ① 源清单 ----------
def parse_frontmatter(path):
    txt = open(path, "r", encoding="utf-8", errors="replace").read()
    m = re.match(r"^---\s*\n(.*?)\n---", txt, re.S)
    fm = {}
    if m:
        for line in m.group(1).split("\n"):
            mm = re.match(r"^([A-Za-z0-9_]+)\s*:\s*(.*)$", line)
            if mm:
                k, v = mm.group(1), mm.group(2).strip()
                fm[k] = v.strip('"').strip("'")
    # 词数
    body = txt[m.end():] if m else txt
    body = re.sub(r"<[^>]+>", " ", body)
    words = len(re.findall(r"[A-Za-z0-9']+", body))
    fm["_words"] = words
    return fm


items = []
for fn in sorted(os.listdir(GUIDES)):
    if not fn.endswith(".md"):
        continue
    slug = fn[:-3]
    fm = parse_frontmatter(os.path.join(GUIDES, fn))
    items.append({
        "slug": slug,
        "path": f"/guides/{slug}/",
        "title": fm.get("title", ""),
        "category": fm.get("category", ""),
        "platform": fm.get("platform", ""),
        "publishDate": fm.get("publishDate", ""),
        "updatedDate": fm.get("updatedDate", ""),
        "noCta": fm.get("noCta", ""),
        "words": fm.get("_words", 0),
    })
with open(os.path.join(OUT, "gt_list.json"), "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=1)
print(f"[ok] gt_list.json  guides={len(items)}", flush=True)

# ---------- ② 逐页流量 ----------
BJ = timezone(timedelta(hours=8))
S0 = int(datetime(2026, 9, 1, tzinfo=BJ).timestamp())
S1 = int(datetime(2026, 10, 1, tzinfo=BJ).timestamp())

PAGE_SQL = f"""
SELECT coalesce(properties.$pathname,'') AS path,
       countIf(event='$pageview') AS views,
       count(DISTINCT IF(event='$pageview', properties.$session_id, NULL)) AS pv_sessions,
       count(DISTINCT IF(event='$pageview', person_id, NULL)) AS pv_users,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers,
       countIf(event='$web_vitals') AS vitals
FROM events
WHERE {{WIN}} AND {{CLEAN}}
  AND coalesce(properties.$pathname,'') LIKE '/guides/%'
GROUP BY path ORDER BY views DESC LIMIT 500
"""

save("gt_pages_all", PAGE_SQL.format(
    WIN="timestamp >= toDateTime(0)", CLEAN=CLEAN))
save("gt_pages_sep", PAGE_SQL.format(
    WIN=f"timestamp >= toDateTime({S0}) AND timestamp < toDateTime({S1})", CLEAN=CLEAN))

# 全站对照:总量时间范围
save("gt_span", f"""
SELECT min(timestamp) AS first_evt, max(timestamp) AS last_evt,
       count(DISTINCT properties.$session_id) AS sessions_all,
       count() AS events_all
FROM events WHERE {CLEAN} LIMIT 5
""")

save("gt_guide_totals", f"""
SELECT countIf(event='$pageview') AS guide_views,
       count(DISTINCT IF(event='$pageview', properties.$session_id, NULL)) AS guide_sessions,
       count(DISTINCT IF(event='$pageview', person_id, NULL)) AS guide_users
FROM events
WHERE timestamp >= toDateTime(0) AND {CLEAN}
  AND coalesce(properties.$pathname,'') LIKE '/guides/%' LIMIT 5
""")

print("done", flush=True)
