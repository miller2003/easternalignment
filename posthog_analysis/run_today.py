"""PostHog 查询器 —— easternalignment.com 今日流量分析

凭据在运行时从本地手册读取，不落盘、不回显。
口径常量全部照抄 skill `ea-posthog-traffic-analysis` 与手册 §5/§5.12。
"""
import json
import os
import re
import ssl
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

RAW = "coalesce(properties.$host,'') = 'easternalignment.com'"


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
                raise RuntimeError(j["error"])
            return j
        except Exception as e:  # noqa
            last = e
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


# ---------- 时间窗口（东八区，幂等整数） ----------
BJ = timezone(timedelta(hours=8))
# 动态取「今天 00:00（北京时间）」。2026-09-29 改为动态：此前这一行写死成某个日期，
# 隔天再跑就会静默分析旧日期（查询照常返回、hasMore 正常，看不出错）。
TODAY = datetime.now(BJ).replace(hour=0, minute=0, second=0, microsecond=0)
NOW = datetime.now(BJ)
ELAPSED = NOW - TODAY
print("BJ now:", NOW.isoformat(), "| elapsed today:", ELAPSED, flush=True)

def ep(dt):
    return int(dt.timestamp())

T0, TN = ep(TODAY), ep(NOW)

QUERIES = {}

# ① 新开发端口 / host 枚举（近 30 天）
QUERIES["host_scan"] = f"""
SELECT coalesce(nullIf(properties.$session_entry_referring_domain,''),'(empty)') AS ref,
       coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       count(DISTINCT properties.$session_id) AS sessions
FROM events
WHERE timestamp >= toDateTime({ep(TODAY - timedelta(days=30))})
GROUP BY ref, host ORDER BY sessions DESC LIMIT 60
"""

# ② 事件清单（近 7 天，raw host）
QUERIES["events_7d"] = f"""
SELECT event, count() AS n, count(DISTINCT properties.$session_id) AS sessions
FROM events
WHERE timestamp >= toDateTime({ep(TODAY - timedelta(days=7))}) AND {RAW}
GROUP BY event ORDER BY n DESC LIMIT 80
"""

# ③ 逐日核心指标（干净口径 近 14 天）
QUERIES["daily_clean"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       count(DISTINCT person_id) AS users,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='$pageview') AS pageviews,
       countIf(event='affiliate_link_click') AS aff_clicks,
       countIf(event='affiliate_link_click' AND properties.$insert_id IS NOT NULL) AS clicks_raw
FROM events WHERE {CLEAN}
GROUP BY day ORDER BY day DESC LIMIT 20
"""

# ③b 逐日核心指标（未过滤，用于量化污染）
QUERIES["daily_raw"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       count(DISTINCT person_id) AS users,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='$pageview') AS pageviews,
       countIf(event='affiliate_link_click') AS aff_clicks
FROM events WHERE timestamp >= toDateTime({ep(TODAY - timedelta(days=14))})
GROUP BY day ORDER BY day DESC LIMIT 20
"""

# ④ 今日 会话级明细（干净口径）
QUERIES["today_sessions"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         any(toString(person_id)) AS pid,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'(?)')) AS country,
         any(coalesce(properties.$device_type,'')) AS dev,
         any(coalesce(properties.$browser,'')) AS br,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
         any(coalesce(nullIf(properties.$raw_user_agent,''),'')) AS ua,
         min(toTimeZone(timestamp,'Asia/Shanghai')) AS first_ts
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT toString(first_ts) AS t, country, dev, br, ref, utm, entry, pv, vit, dur, clicks, pid, ua
FROM s ORDER BY first_ts LIMIT 200
"""

# ⑤ 今日总量（含/剔薄）
QUERIES["today_summary"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT count() AS sessions,
       countIf(pv=1 AND vit=0 AND dur<=2) AS thin,
       countIf(vit=0) AS zero_vitals,
       sum(pv) AS pageviews
FROM s
"""

# ⑥ 等长窗口对比：今日 00:00~现在 vs 前 7 天同一时段
for off in range(1, 8):
    d0 = ep(TODAY - timedelta(days=off))
    d1 = ep(TODAY - timedelta(days=off) + ELAPSED)
    QUERIES[f"win_d{off}"] = f"""
SELECT count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users,
       countIf(event='$pageview') AS pageviews,
       countIf(event='affiliate_link_click') AS aff_clicks
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({d0}) AND timestamp < toDateTime({d1})
"""

# ⑦ 今日渠道矩阵
QUERIES["today_channels"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         countIf(event='$pageview') AS pv,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT CASE
    WHEN match(concat(coalesce(ref,''),' ',coalesce(utm,'')), '(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)') THEN 'AI助手'
    WHEN match(coalesce(ref,''), '(?i)(google|bing|yahoo|duckduckgo|yandex|ecosia)') THEN '搜索引擎'
    WHEN ref = '$direct' OR coalesce(ref,'') = '' THEN '直接访问'
    ELSE '外链引荐' END AS channel,
  count() AS sessions, round(avg(dur),1) AS avg_dur,
  round(100.0*countIf(pv<=1)/count(),1) AS bounce_pct,
  sum(clicks) AS total_clicks, round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY channel ORDER BY sessions DESC LIMIT 20
"""

# ⑧ 今日国家 / 设备
QUERIES["today_geo"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'(?)')) AS country,
         any(coalesce(properties.$device_type,'')) AS dev
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT country, dev, count() AS sessions, sum(clicks) AS clicks
FROM s GROUP BY country, dev ORDER BY sessions DESC LIMIT 40
"""

# ⑨ 今日入口页
QUERIES["today_entry"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'(空)')) AS entry,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT entry, ref, count() AS sessions, sum(clicks) AS total_clicks,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY entry, ref ORDER BY sessions DESC LIMIT 40
"""

# ⑩ 近 14 天点击明细（去重 $insert_id）
QUERIES["clicks_14d"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       coalesce(nullIf(toString(properties.location),''),'(空)') AS page,
       coalesce(nullIf(toString(properties.ctaSource),''),'(无)') AS pos,
       coalesce(nullIf(toString(properties.slug),''),'(无)') AS slug,
       coalesce(nullIf(toString(properties.click_token),''),'(无)') AS token,
       coalesce(nullIf(toString(properties.time_on_page_ms),''),'') AS tms,
       toString(properties.$insert_id) AS iid,
       toString(properties.$session_id) AS sid,
       coalesce(nullIf(toString(properties.$geoip_country_code),''),'(?)') AS cc
FROM events WHERE {CLEAN} AND event='affiliate_link_click'
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=14))}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 300
"""

# ⑪ 转化事件（去 host，CN+SELF 口径）
QUERIES["conversions_14d"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       coalesce(nullIf(event,''),'') AS ev,
       toString(properties) AS props,
       toString(timestamp) AS ts
FROM events WHERE {CONV} AND (event='Order_Converted' OR event LIKE '%Postback%'
       OR event LIKE '%Converted%' OR event LIKE '%aff_go_hit%' OR event LIKE '%aff_go_blocked%')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=14))}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 200
"""

# ⑫ /go 链路健康（去 host）
QUERIES["go_health"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day, event, count() AS n
FROM events WHERE {CONV} AND event IN ('aff_go_hit','aff_go_blocked','affiliate_link_click')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=14))}) AND timestamp < toDateTime({TN})
GROUP BY day, event ORDER BY day DESC LIMIT 60
"""

# ⑬ 近 7 天逐日 会话 + 薄会话（基线对照）
QUERIES["thin_7d"] = f"""
WITH s AS (
  SELECT toDate(toTimeZone(min(timestamp),'Asia/Shanghai')) AS day,
         properties.$session_id AS sid,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS v,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({ep(TODAY - timedelta(days=7))})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT day, count() AS sessions, countIf(pv=1 AND v=0 AND dur<=2) AS thin,
       countIf(v=0) AS zero_vitals
FROM s GROUP BY day ORDER BY day DESC LIMIT 20
"""

# ⑭ 今日全部事件（含点击/测验），供叙事
QUERIES["today_events"] = f"""
SELECT event, count() AS n, count(DISTINCT properties.$session_id) AS sessions
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
GROUP BY event ORDER BY n DESC LIMIT 40
"""

# ⑮ 今日 affiliate_link_click 明细
QUERIES["today_clicks"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(toString(properties.location),''),'(空)') AS page,
       coalesce(nullIf(toString(properties.ctaSource),''),'(无)') AS pos,
       coalesce(nullIf(toString(properties.slug),''),'(无)') AS slug,
       coalesce(nullIf(toString(properties.click_token),''),'(无)') AS token,
       coalesce(nullIf(toString(properties.text),''),'(无)') AS txt,
       toString(properties.time_on_page_ms) AS tms,
       toString(properties.is_first_click) AS first_click,
       toString(properties.click_seq) AS seq,
       toString(properties.$insert_id) AS iid,
       toString(properties.$session_id) AS sid
FROM events WHERE {CLEAN} AND event='affiliate_link_click'
  AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 100
"""

if __name__ == "__main__":
    only = sys.argv[1:] or None
    for name, sql in QUERIES.items():
        if only and name not in only:
            continue
        try:
            save(name, sql)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
