# -*- coding: utf-8 -*-
"""补充诊断：失效入口页（404）对搜索流量的吞噬量 + astrology 段历史流量"""
import json, os, ssl, sys, urllib.request, urllib.error
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, TN, CLEAN, RAW, OUT
from datetime import timedelta

D30 = ep(TODAY - timedelta(days=30))
D60 = ep(TODAY - timedelta(days=60))
D7 = ep(TODAY - timedelta(days=7))
REFF = "coalesce(properties.$session_entry_referring_domain,'')"
SEARCH_EXPR = (f"match({REFF}, '(?i)(google|bing|yahoo|duckduckgo|ecosia|yandex|msn[.]|aol[.]"
               "|brave|startpage|qwant|naver|baidu|search[.])')")
AI_EXPR = ("match(concat(coalesce(properties.$session_entry_referring_domain,''),' ',"
           "coalesce(properties.$session_entry_utm_source,'')), "
           "'(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)')")

Q = {}

# A1 全部渠道入口页 TOP（30 天）—— 供线上存活探测
Q["a1_entry_all"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='$pageview') AS pv,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'(空)')) AS entry,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref
  FROM events WHERE {CLEAN} AND properties.$session_id IS NOT NULL
        AND timestamp >= toDateTime({D30}) AND timestamp < toDateTime({TN})
  GROUP BY sid
)
SELECT entry, count() AS sessions, sum(clicks) AS total_clicks,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY entry ORDER BY sessions DESC LIMIT 200
"""

# A2 astrology 段的会话（60 天）
Q["a2_astrology"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref,
         countIf(event='$pageview') AS pv,
         countIf(event='affiliate_link_click') AS clicks,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'?')) AS cc,
         any(coalesce(nullIf(properties.$raw_user_agent,''),'')) AS ua,
         min(timestamp) AS t0
  FROM events WHERE {CLEAN} AND properties.$session_id IS NOT NULL
        AND properties.$session_entry_pathname LIKE '/astrology%'
        AND timestamp >= toDateTime({D60}) AND timestamp < toDateTime({TN})
  GROUP BY sid
)
SELECT toString(toDate(toTimeZone(t0,'Asia/Shanghai'))) AS day, ref, entry, cc, pv, clicks, dur
FROM s ORDER BY t0 DESC LIMIT 200
"""

# A3 搜索流量的 7 日 vs 30 日规模
Q["a3_scale"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm
  FROM events WHERE {CLEAN} AND properties.$session_id IS NOT NULL
        AND timestamp >= toDateTime({D30}) AND timestamp < toDateTime({TN})
  GROUP BY sid
)
SELECT CASE WHEN match(concat(ref,' ',utm),'(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)') THEN 'AI助手'
            WHEN match(ref,'(?i)(google|bing|yahoo|duckduckgo|ecosia|yandex|msn[.]|aol[.]|brave|startpage|qwant|naver|baidu|search[.])') THEN '搜索引擎'
            WHEN ref='$direct' THEN '直接访问' ELSE '外链引荐' END AS channel,
       count() AS sessions, sum(clicks) AS total_clicks,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY channel ORDER BY sessions DESC LIMIT 10
"""

if __name__ == "__main__":
    for n, s in Q.items():
        try:
            j = run(s)
            json.dump({"sql": s, "columns": j["columns"], "results": j["results"]},
                      open(os.path.join(OUT, n + ".json"), "w", encoding="utf-8"),
                      ensure_ascii=False, indent=1)
            print(f"[ok] {n} rows={len(j['results'])}", flush=True)
        except Exception as e:
            print(f"[FAIL] {n}: {e}", flush=True)
