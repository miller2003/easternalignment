"""PostHog 2026-09 月度业绩分析取数 —— easternalignment.com
窗口:2026-09-01 00:00 ~ 2026-10-01 00:00(东八区)
口径全部照抄 skill ea-posthog-traffic-analysis;转化查询去 host 条件。
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
os.makedirs(OUT, exist_ok=True)
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
CONV = f"""coalesce(properties.$geoip_country_code,'') != 'CN'
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

BJ = timezone(timedelta(hours=8))
M0 = datetime(2026, 9, 1, tzinfo=BJ)
M1 = datetime(2026, 10, 1, tzinfo=BJ)
T0, T1 = int(M0.timestamp()), int(M1.timestamp())
# 对比窗:8 月(用于环比)
A0 = int(datetime(2026, 8, 1, tzinfo=BJ).timestamp())

CHAN = """CASE
  WHEN match(concat(coalesce(properties.$session_entry_referring_domain,''),' ',coalesce(properties.utm_source,'')),
             '(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)') THEN 'AI助手'
  WHEN match(coalesce(properties.$session_entry_referring_domain,''),
             '(?i)(google|bing|yahoo|duckduckgo|yandex|ecosia)') THEN '搜索引擎'
  WHEN coalesce(properties.$session_entry_referring_domain,'') IN ('$direct','') THEN '直接访问'
  ELSE '外链引荐' END"""

Q = {}

# ① 逐日核心指标(干净口径)
Q["sep_daily"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS d,
       count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       countIf(event='$pageview') AS views,
       countIf(event='$web_vitals') AS vitals,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY d ORDER BY d LIMIT 40
"""

# ② 逐日薄会话(1 pageview + 0 vitals + 时长≤2s 的会话)
Q["sep_thin_daily"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         min(timestamp) AS t0,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS wv,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur
  FROM events
  WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
  GROUP BY sid
)
SELECT toDate(toTimeZone(t0,'Asia/Shanghai')) AS d, count() AS total_sessions,
       countIf(pv=1 AND wv=0 AND dur<=2) AS thin_sessions,
       countIf(wv=0) AS no_vitals_sessions
FROM s GROUP BY d ORDER BY d LIMIT 40
"""

# ③ 月度总量(干净 vs 未过滤对照)
Q["sep_totals"] = f"""
SELECT count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       countIf(event='$pageview') AS views,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
LIMIT 5
"""
Q["sep_totals_raw"] = f"""
SELECT count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       countIf(event='$pageview') AS views,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND coalesce(properties.$host,'') = 'easternalignment.com'
LIMIT 5
"""

# ④ 8 月对照(环比)
Q["aug_totals"] = f"""
SELECT count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       countIf(event='$pageview') AS views,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({A0}) AND timestamp < toDateTime({T0}) AND {CLEAN}
LIMIT 5
"""

# ⑤ 渠道结构(事件层分桶):会话/用户/点击/点击者
Q["sep_channel"] = f"""
SELECT {CHAN} AS chan,
       count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY chan ORDER BY sessions DESC LIMIT 10
"""

# ⑥ 分周×渠道趋势(事件层直接分桶,防跨周错分)
Q["sep_weekly_channel"] = f"""
SELECT toStartOfWeek(toTimeZone(timestamp,'Asia/Shanghai'),1) AS wk,
       {CHAN} AS chan,
       count(DISTINCT properties.$session_id) AS sessions,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks
FROM events
WHERE timestamp >= toDateTime({A0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY wk, chan ORDER BY wk, chan LIMIT 60
"""

# ⑦ 渠道细分:referrer 明细(TOP 25)
Q["sep_referrers"] = f"""
SELECT coalesce(nullIf(properties.$session_entry_referring_domain,''),'(direct)') AS ref,
       coalesce(nullIf(properties.utm_source,''),'-') AS utm,
       count(DISTINCT properties.$session_id) AS sessions,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY ref, utm ORDER BY sessions DESC LIMIT 25
"""

# ⑧ 入口页:会话/用户/点击(事件层,按入口页分桶)
Q["sep_entry"] = f"""
SELECT replaceRegexpAll(coalesce(properties.$session_entry_url,''), '^https?[:][/]+[^/]+', '') AS entry,
       count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY entry HAVING sessions >= 3 ORDER BY sessions DESC LIMIT 40
"""

# ⑨ 点击页(location):点击/去重人/页型
Q["sep_click_pages"] = f"""
SELECT coalesce(nullIf(toString(properties.location),''),'(unknown)') AS loc,
       coalesce(nullIf(toString(properties.page_type),''),'-') AS ptype,
       uniqExact(toString(properties.$insert_id)) AS clicks,
       count(DISTINCT person_id) AS clickers,
       round(avg(toFloatOrZero(toString(properties.time_on_page_ms)))/1000, 1) AS avg_decision_s
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='affiliate_link_click' AND {CLEAN}
GROUP BY loc, ptype ORDER BY clicks DESC LIMIT 50
"""

# ⑩ CTA 位置效率:点击/去重人
Q["sep_click_cta"] = f"""
SELECT coalesce(nullIf(toString(properties.ctaSource),''),'(unknown)') AS cta,
       uniqExact(toString(properties.$insert_id)) AS clicks,
       count(DISTINCT person_id) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='affiliate_link_click' AND {CLEAN}
GROUP BY cta ORDER BY clicks DESC LIMIT 20
"""

# ⑪ 点击明细(归因母表):token/页/CTA/slug/决策时长/来源/国家/设备
Q["sep_click_details"] = f"""
SELECT timestamp,
       toString(person_id) AS person,
       toString(properties.$session_id) AS sid,
       toString(properties.click_token) AS token,
       toString(properties.location) AS loc,
       toString(properties.ctaSource) AS cta,
       toString(properties.slug) AS slug,
       toString(properties.page_type) AS ptype,
       toString(properties.time_on_page_ms) AS decision_ms,
       toString(properties.pages_before_click) AS pages_before,
       toString(properties.click_seq) AS click_seq,
       toString(properties.is_first_click) AS first_click,
       coalesce(properties.$session_entry_referring_domain,'') AS ref,
       coalesce(properties.utm_source,'') AS utm,
       coalesce(properties.$geoip_country_code,'') AS cc,
       coalesce(properties.$device_type,'') AS device,
       replaceRegexpAll(coalesce(properties.$session_entry_url,''), '^https?[:][/]+[^/]+', '') AS entry
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='affiliate_link_click' AND {CLEAN}
ORDER BY timestamp LIMIT 600
"""

# ⑫ 转化事件(去 host;CN+SELF 口径;剔占位测试:distinct_id 恒为 UUID)
Q["sep_conversions"] = f"""
SELECT timestamp,
       toString(distinct_id) AS did,
       toString(properties.transaction_id) AS txn,
       toString(properties.conversion_type) AS ctype,
       toString(properties.revenue) AS revenue,
       toString(properties.platform) AS platform,
       toString(properties.click_token) AS token,
       toString(properties.sub_id) AS sub_id,
       toString(properties.type_inference) AS infer,
       toString(properties.is_reversal) AS reversal
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='Order_Converted' AND {CONV}
  AND match(toString(distinct_id), '^[0-9a-fA-F]{{8}}-[0-9a-fA-F]{{4}}-')
  AND toString(properties.transaction_id) NOT LIKE 'SELFTEST-%'
ORDER BY timestamp LIMIT 200
"""

# ⑫b 孤儿回传
Q["sep_orphan"] = f"""
SELECT count() AS n, min(timestamp) AS first, max(timestamp) AS last
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event='Postback_Orphan'
LIMIT 5
"""

# ⑬ 地域/设备
Q["sep_geo"] = f"""
SELECT coalesce(properties.$geoip_country_code,'') AS cc,
       count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY cc ORDER BY sessions DESC LIMIT 20
"""
Q["sep_device"] = f"""
SELECT coalesce(properties.$device_type,'(unknown)') AS device,
       count(DISTINCT properties.$session_id) AS sessions,
       uniqExactIf(toString(properties.$insert_id), event='affiliate_link_click') AS clicks,
       count(DISTINCT IF(event='affiliate_link_click', person_id, NULL)) AS clickers
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
GROUP BY device ORDER BY sessions DESC LIMIT 10
"""

# ⑭ /go 链路健康(去 host)
Q["sep_go_health"] = f"""
SELECT countIf(event='affiliate_link_click') AS clicks,
       countIf(event='aff_go_hit') AS go_hits
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event IN ('affiliate_link_click','aff_go_hit') AND {CONV}
LIMIT 5
"""

# ⑮ match 测验 9 月使用(事件带 host,可套 CLEAN)
Q["sep_match"] = f"""
SELECT event, count() AS n, count(DISTINCT person_id) AS users
FROM events
WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1})
  AND event LIKE 'match%' AND {CLEAN}
GROUP BY event ORDER BY n DESC LIMIT 20
"""

# ⑯ 会话深度/时长分布(剔薄用)
Q["sep_depth"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS wv,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         maxIf(1, event='affiliate_link_click') AS clicked
  FROM events
  WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({T1}) AND {CLEAN}
  GROUP BY sid
)
SELECT countIf(pv=1 AND wv=0 AND dur<=2) AS thin,
       countIf(NOT (pv=1 AND wv=0 AND dur<=2)) AS thick,
       countIf(NOT (pv=1 AND wv=0 AND dur<=2) AND clicked=1) AS thick_clicked
FROM s LIMIT 5
"""

names = sys.argv[1:] or list(Q.keys())
for n in names:
    save(n, Q[n])
print("done", flush=True)
