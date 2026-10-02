"""解读师评测页(/reviews/)专项分析:流量、点击、切换行为、点击后行为。2026-09 窗口。"""
import json
import os
import re
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
README = r"C:\Users\samja\Desktop\EA资料\posthog-query\README.md"
API = "https://us.posthog.com/api/projects/532954/query/"

SELF_IDS = (
    "8435b8d5-16b6-5f4b-9b71-f5d4d196ad00", "83b89204-633d-56fa-9e65-202e62d839ff",
    "259d7d34-120f-50a6-a260-3e7fa192ae79", "8b444548-d415-5d49-88b2-f717feaba288",
    "b7575d9c-8453-5600-874a-47188ad98ec8", "01a0b5bc-770d-7c62-b34d-5416ccb6f386",
)
DEV = "('localhost:4321','127.0.0.1:8188','127.0.0.1:8765','localhost:8765','127.0.0.1:8931')"
SELF = "AND (person_id IS NULL OR toString(person_id) NOT IN (" + ",".join(
    f"'{i}'" for i in SELF_IDS) + "))"
CLEAN = f"""coalesce(properties.$host,'') = 'easternalignment.com'
  AND coalesce(properties.$geoip_country_code,'') != 'CN'
  AND coalesce(properties.$session_entry_referring_domain,'') NOT IN {DEV}
  {SELF}"""
CONV = f"""coalesce(properties.$geoip_country_code,'') != 'CN'
  {SELF}"""

def api_key():
    return re.search(r"(phx_[A-Za-z0-9]+)",
                     open(README, encoding="utf-8", errors="replace").read()).group(1)

KEY = api_key()

def run(sql, tries=4):
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": sql}}).encode()
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(API, data=body, headers={
                "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read().decode())
            if j.get("error"):
                raise RuntimeError(str(j["error"]))
            return j
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read().decode(errors='replace')[:600]}"
            print(f"  [retry {i+1}] {last}", flush=True)
            time.sleep(3)
        except Exception as e:
            last = e
            print(f"  [retry {i+1}] {e}", flush=True)
            time.sleep(3)
    raise RuntimeError(f"failed: {last}")

def save(name, sql):
    j = run(sql)
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump({"sql": sql, "columns": j["columns"], "results": j["results"],
                   "hasMore": j.get("hasMore")}, f, ensure_ascii=False, indent=1)
    print(f"[ok] {name} rows={len(j['results'])} hasMore={j.get('hasMore')}", flush=True)

BJ = timezone(timedelta(hours=8))
T0 = int(datetime(2026, 9, 1, tzinfo=BJ).timestamp())
T1 = int(datetime(2026, 10, 1, tzinfo=BJ).timestamp())

Q = {}

# ① 评测页作为入口:会话/点击(有流量的评测页全覆盖)
Q["rd_entry"] = f"""
SELECT replaceRegexpAll(coalesce(properties.$session_entry_url,''), '^https?[:][/]+[^/]+', '') AS entry,
       count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
  AND match(coalesce(properties.$session_entry_url,''), '/reviews[/]')
GROUP BY entry ORDER BY sessions DESC LIMIT 80
"""

# ② 评测页点击明细(全量,带 token/人/会话/决策时长)
Q["rd_clicks"] = f"""
SELECT timestamp,
       toString(person_id) AS person,
       toString(properties.$session_id) AS sid,
       toString(properties.click_token) AS token,
       toString(properties.location) AS loc,
       toString(properties.ctaSource) AS cta,
       toString(properties.slug) AS slug,
       toString(properties.time_on_page_ms) AS decision_ms,
       toString(properties.click_seq) AS click_seq,
       coalesce(properties.$geoip_country_code,'') AS cc,
       coalesce(properties.$device_type,'') AS device,
       coalesce(properties.$session_entry_referring_domain,'') AS ref,
       coalesce(properties.utm_source,'') AS utm
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='affiliate_link_click' AND {CLEAN}
  AND match(toString(properties.location), '/reviews[/]')
ORDER BY timestamp LIMIT 400
"""

# ③ 点击后站内行为:每会话 点击 vs 最后一次浏览
Q["rd_postclick"] = f"""
WITH s AS (
  SELECT toString(properties.$session_id) AS sid,
         countIf(event='affiliate_link_click') AS clicks,
         maxIf(timestamp, event='affiliate_link_click') AS last_click,
         maxIf(timestamp, event='$pageview') AS last_pv,
         countIf(event='$pageview') AS pv
  FROM events
  WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
  GROUP BY sid
)
SELECT countIf(clicks>0) AS clicked_sessions,
       countIf(clicks>0 AND pv=0) AS clicked_no_pv,
       countIf(clicks>0 AND last_pv > last_click) AS browsed_after_click,
       countIf(clicks>0 AND last_pv > last_click
               AND dateDiff('second', last_click, last_pv) <= 60) AS browse_0_60s,
       countIf(clicks>0 AND last_pv > last_click
               AND dateDiff('second', last_click, last_pv) > 60) AS browse_gt60s,
       countIf(clicks>1) AS multiclick_sessions
FROM s LIMIT 5
"""

# ④ 点击用户的会话深度:是否多点多次访问(点击后回访)
Q["rd_person_sessions"] = f"""
SELECT toString(person_id) AS p,
       uniqExact(toString(properties.$session_id)) AS sessions,
       uniqExactIf(toString(properties.$session_id), event='affiliate_link_click') AS clicked_sess,
       uniqExact(toString(properties.$insert_id)) AS clicks
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY p
HAVING clicked_sess > 0
ORDER BY sessions DESC LIMIT 120
"""

# ⑤ 全站评测页点击总况(不分页)
Q["rd_review_summary"] = f"""
SELECT uniqExact(toString(properties.location)) AS review_pages_clicked,
       uniqExact(toString(properties.$insert_id)) AS clicks,
       count(DISTINCT person_id) AS clickers,
       round(avg(toFloatOrZero(toString(properties.time_on_page_ms)))/1000, 1) AS avg_decision_s
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='affiliate_link_click' AND {CLEAN}
  AND match(toString(properties.location), '/reviews[/]')
LIMIT 5
"""

# ⑥ 评测页会话总况(入口 or 会话内浏览过评测页)
Q["rd_visit_summary"] = f"""
SELECT count(DISTINCT IF(match(coalesce(properties.$pathname,''), '/reviews[/]'),
                         properties.$session_id, NULL)) AS sessions_touching_reviews,
       count(DISTINCT IF(match(coalesce(properties.$session_entry_url,''), '/reviews[/]'),
                         properties.$session_id, NULL)) AS sessions_entering_reviews,
       countIf(event='$pageview' AND match(coalesce(properties.$pathname,''), '/reviews[/]')) AS review_pvs
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
LIMIT 5
"""

for n in (sys.argv[1:] or list(Q.keys())):
    save(n, Q[n])
print("done", flush=True)
