# -*- coding: utf-8 -*-
"""搜索流量质量诊断 · 第二批：渠道质量对比 + 入口页×渠道交叉 + 零点击页清单"""
import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, TN, CLEAN, OUT
from datetime import timedelta

D30 = ep(TODAY - timedelta(days=30))
REFF = "coalesce(properties.$session_entry_referring_domain,'')"
SEARCH_EXPR = (f"match({REFF}, '(?i)(google|bing|yahoo|duckduckgo|ecosia|yandex|msn[.]|aol[.]"
               "|brave|startpage|qwant|naver|baidu|search[.])')")
AI_EXPR = ("match(concat(coalesce(properties.$session_entry_referring_domain,''),' ',"
           "coalesce(properties.$session_entry_utm_source,'')), "
           "'(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)')")
CHAN = f"""CASE WHEN {AI_EXPR} THEN 'AI助手'
             WHEN {SEARCH_EXPR} THEN '搜索引擎'
             WHEN coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')='$direct' THEN '直接访问'
             ELSE '外链引荐' END"""

Q = {}

BASE = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         any(person_id) AS pid,
         min(timestamp) AS t0,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$device_type,''),'')) AS dev,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
         any({CHAN}) AS chan
  FROM events WHERE {CLEAN} AND properties.$session_id IS NOT NULL
        AND timestamp >= toDateTime({D30}) AND timestamp < toDateTime({TN})
  GROUP BY sid
)"""

# B1 渠道级质量对比
Q["b1_chan_quality"] = BASE + """
SELECT chan,
       count() AS sessions,
       round(sum(pv)*1.0/count(),2) AS pv_per_sess,
       round(100.0*countIf(pv=1)/count(),1) AS one_page_pct,
       round(avg(dur),1) AS mean_dur,
       quantile(0.5)(dur) AS median_dur,
       round(100.0*countIf(vit=0)/count(),1) AS no_vitals_pct,
       sum(clicks) AS total_clicks,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY chan ORDER BY sessions DESC LIMIT 10
"""

# B2 入口页 × 渠道 交叉
Q["b2_entry_chan"] = BASE + """
SELECT entry, chan, count() AS sessions, sum(pv) AS pv_total, sum(clicks) AS clicks_total,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct,
       round(avg(dur),1) AS avg_dur
FROM s GROUP BY entry, chan HAVING sessions >= 4
ORDER BY sessions DESC LIMIT 120
"""

# B3 搜索流量的零点击页清单
Q["b3_zero_click"] = BASE + """
SELECT entry, count() AS sessions, sum(pv) AS pv_total,
       round(avg(dur),1) AS avg_dur,
       round(100.0*countIf(pv=1)/count(),1) AS one_page_pct
FROM s WHERE chan='搜索引擎'
GROUP BY entry HAVING sessions >= 4 AND sum(clicks)=0
ORDER BY sessions DESC LIMIT 60
"""

# B4 设备结构：搜索 vs AI
Q["b4_device"] = BASE + """
SELECT chan, dev, count() AS sessions, sum(clicks) AS clicks_total,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct,
       round(avg(dur),1) AS avg_dur
FROM s WHERE chan IN ('搜索引擎','AI助手')
GROUP BY chan, dev ORDER BY chan, sessions DESC LIMIT 20
"""

# B5 页面深度分布：搜索 vs AI
Q["b5_depth"] = BASE + """
SELECT chan,
       countIf(pv=1) AS d1, countIf(pv=2) AS d2, countIf(pv=3) AS d3,
       countIf(pv BETWEEN 4 AND 6) AS d4_6, countIf(pv>=7) AS d7p,
       count() AS total
FROM s WHERE chan IN ('搜索引擎','AI助手','直接访问')
GROUP BY chan ORDER BY total DESC LIMIT 10
"""

# B6 搜索流量的高参与度但零点击页（时长中位数高 + 0 点击 = 内容看了但不跳转）
Q["b6_engaged_no_click"] = BASE + """
SELECT entry, chan, count() AS sessions,
       quantile(0.5)(dur) AS median_dur,
       round(avg(pv),2) AS avg_pv,
       sum(clicks) AS clicks_total
FROM s WHERE clicks=0 AND pv>=2
GROUP BY entry, chan HAVING sessions >= 3
ORDER BY sessions DESC LIMIT 50
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
