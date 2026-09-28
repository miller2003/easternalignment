# -*- coding: utf-8 -*-
"""搜索引擎流量质量深度诊断 —— easternalignment.com
口径：A 段干净口径（站点隔离 + 排 CN + 排开发来源 + 排自测身份）
注意：CTE 内不能把 SELECT 的聚合别名用在同层 WHERE；跨 CTE 使用的时间列必须先导出。
"""
import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, NOW, TN, CLEAN, OUT
from datetime import timedelta

D30 = ep(TODAY - timedelta(days=30))
D60 = ep(TODAY - timedelta(days=60))
D14 = ep(TODAY - timedelta(days=14))
D7 = ep(TODAY - timedelta(days=7))

REFF = "coalesce(properties.$session_entry_referring_domain,'')"
SEARCH = r"(?i)(google|bing|yahoo|duckduckgo|ecosia|yandex|msn[.]|aol[.]|brave|startpage|qwant|naver|baidu|search[.])"
SEARCH_EXPR = f"match({REFF}, '{SEARCH}')"
AI_EXPR = ("match(concat(coalesce(properties.$session_entry_referring_domain,''),' ',"
           "coalesce(properties.$session_entry_utm_source,'')), "
           "'(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)')")

ENGINE = """CASE
  WHEN match(ref,'(?i)google')      THEN 'Google 系'
  WHEN match(ref,'(?i)bing|msn[.]') THEN 'Bing / MSN'
  WHEN match(ref,'(?i)yahoo')       THEN 'Yahoo'
  WHEN match(ref,'(?i)duckduckgo')  THEN 'DuckDuckGo'
  WHEN match(ref,'(?i)ecosia')      THEN 'Ecosia'
  WHEN match(ref,'(?i)yandex')      THEN 'Yandex'
  ELSE '其他搜索' END"""

PTYPE = """CASE
  WHEN entry LIKE '/guides/%'      THEN 'guides 指南'
  WHEN entry LIKE '/reviews/%'     THEN 'reviews 评测'
  WHEN entry LIKE '/comparisons/%' THEN 'comparisons 对比'
  WHEN entry LIKE '/astrology/%'   THEN 'astrology 星座'
  WHEN entry = '/' OR entry = ''   THEN '首页'
  ELSE '其他' END"""

Q = {}

def sess_cte(where, t0=D30, t1=TN):
    return f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         any(person_id) AS pid,
         min(timestamp) AS t0,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'(?)')) AS cc,
         any(coalesce(properties.$device_type,'')) AS dev,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry
  FROM events WHERE {CLEAN} AND properties.$session_id IS NOT NULL
        AND timestamp >= toDateTime({t0}) AND timestamp < toDateTime({t1})
        AND ({where})
  GROUP BY sid
)"""

# S1 分引擎质量矩阵（30 天）
Q["s1_engine"] = sess_cte(SEARCH_EXPR) + f"""
SELECT {ENGINE} AS engine,
       count() AS sessions, count(DISTINCT pid) AS users,
       round(sum(pv)*1.0/count(),2) AS pv_per_sess,
       round(avg(dur),1) AS avg_dur,
       round(100.0*countIf(pv<=1)/count(),1) AS bounce_pct,
       sum(clicks) AS total_clicks, countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct,
       countIf(pv=1 AND vit=0 AND dur<=2) AS thin
FROM s GROUP BY engine ORDER BY sessions DESC LIMIT 20
"""

# S2 搜索流量逐日（30 天）
Q["s2_daily"] = sess_cte(SEARCH_EXPR) + """
SELECT toDate(toTimeZone(t0,'Asia/Shanghai')) AS day,
       count() AS sessions, sum(pv) AS pv_total, sum(clicks) AS clicks_total,
       countIf(clicks>0) AS click_sessions,
       countIf(pv=1 AND vit=0 AND dur<=2) AS thin
FROM s GROUP BY day ORDER BY day DESC LIMIT 32
"""

# S3 搜索 × 页面类型（30 天）
Q["s3_ptype"] = sess_cte(SEARCH_EXPR) + f"""
SELECT {PTYPE} AS ptype, count() AS sessions, sum(pv) AS pv_total,
       sum(clicks) AS total_clicks, countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct,
       round(avg(dur),1) AS avg_dur,
       round(100.0*countIf(pv<=1)/count(),1) AS bounce_pct
FROM s GROUP BY ptype ORDER BY sessions DESC LIMIT 20
"""

# S4 搜索流量入口页 TOP（30 天）
Q["s4_entry"] = sess_cte(SEARCH_EXPR) + """
SELECT ref, entry, count() AS sessions, sum(pv) AS pv_total, sum(clicks) AS clicks_total,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct,
       round(avg(dur),1) AS avg_dur,
       countIf(pv=1 AND vit=0 AND dur<=2) AS thin
FROM s GROUP BY ref, entry ORDER BY sessions DESC LIMIT 120
"""

# S5 搜索流量地域 × 设备（30 天）
Q["s5_geo"] = sess_cte(SEARCH_EXPR) + """
SELECT cc, dev, count() AS sessions, sum(clicks) AS clicks_total,
       round(avg(dur),1) AS avg_dur,
       round(100.0*countIf(pv<=1)/count(),1) AS bounce_pct
FROM s GROUP BY cc, dev ORDER BY sessions DESC LIMIT 40
"""

# S6 分周渠道演进（近 9 周，事件级分桶）
CH = f"CASE WHEN {AI_EXPR} THEN 'AI助手' WHEN {SEARCH_EXPR} THEN '搜索引擎' " \
     "WHEN coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct') = '$direct' " \
     "THEN '直接访问' ELSE '外链引荐' END"
Q["s6_weekly"] = f"""
SELECT toMonday(toDate(toTimeZone(timestamp,'Asia/Shanghai'))) AS wk,
       {CH} AS channel,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='affiliate_link_click') AS clicks,
       count(DISTINCT if(event='affiliate_link_click', properties.$session_id, NULL)) AS click_sessions
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({D60})
GROUP BY wk, channel ORDER BY wk DESC, sessions DESC LIMIT 90
"""

# S7 页面深度分布（30 天）
Q["s7_depth"] = sess_cte(SEARCH_EXPR) + """
SELECT CASE WHEN pv=1 THEN '1 页' WHEN pv<=3 THEN '2-3 页'
            WHEN pv<=6 THEN '4-6 页' ELSE '7 页以上' END AS depth,
       count() AS sessions, sum(clicks) AS clicks_total,
       countIf(clicks>0) AS click_sessions,
       round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY depth ORDER BY sessions DESC LIMIT 10
"""

# S8 渲染信号（30 天）
Q["s8_vitals"] = sess_cte(SEARCH_EXPR) + """
SELECT if(vit=0,'无 $web_vitals（疑似机器）','有 $web_vitals（真实浏览器）') AS sig,
       count() AS sessions, sum(clicks) AS clicks_total,
       round(avg(dur),1) AS avg_dur, round(avg(pv),2) AS avg_pv
FROM s GROUP BY sig ORDER BY sessions DESC LIMIT 10
"""

# S9 近 7 vs 前 7（搜索 vs AI）
Q["s9_wow"] = f"""
SELECT if(timestamp >= toDateTime({D7}),'近 7 日(09-21~09-27)','前 7 日(09-14~09-20)') AS seg,
       {CH} AS channel,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='affiliate_link_click') AS clicks,
       count(DISTINCT if(event='affiliate_link_click', properties.$session_id, NULL)) AS click_sessions
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({D14})
GROUP BY seg, channel ORDER BY seg DESC, sessions DESC LIMIT 30
"""

# S10 近 20 天成交回传（去 host）
Q["s10_conv"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(toString(properties.raw_params),''),'') AS raw
FROM events
WHERE coalesce(properties.$geoip_country_code,'') != 'CN'
  AND (person_id IS NULL OR toString(person_id) NOT IN (
      '8435b8d5-16b6-5f4b-9b71-f5d4d196ad00','83b89204-633d-56fa-9e65-202e62d839ff',
      '259d7d34-120f-50a6-a260-3e7fa192ae79','8b444548-d415-5d49-88b2-f717feaba288',
      'b7575d9c-8453-5600-874a-47188ad98ec8','01a0b5bc-770d-7c62-b34d-5416ccb6f386'))
  AND event='Order_Converted' AND timestamp >= toDateTime({ep(TODAY - timedelta(days=20))})
ORDER BY timestamp DESC LIMIT 50
"""

# S10b 近 20 天全部点击（含令牌与页面）
Q["s10b_clicks"] = f"""
SELECT coalesce(nullIf(toString(properties.click_token),''),'(无)') AS token,
       coalesce(nullIf(toString(properties.location),''),'(空)') AS page,
       coalesce(nullIf(toString(properties.slug),''),'(无)') AS slug,
       toString(properties.time_on_page_ms) AS tms,
       toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       toString(properties.$session_id) AS sid,
       toString(properties.click_id) AS cid
FROM events WHERE {CLEAN} AND event='affiliate_link_click'
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=20))})
ORDER BY timestamp DESC LIMIT 200
"""

# S10c 近 20 天会话来源表（供按 sid 连接）
Q["s10c_sess_src"] = f"""
SELECT toString(properties.$session_id) AS sid,
       any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref,
       any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
       any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
       any(coalesce(nullIf(properties.$geoip_country_code,''),'')) AS cc,
       countIf(event='$pageview') AS pv,
       toString(min(toTimeZone(timestamp,'Asia/Shanghai'))) AS t0
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({ep(TODAY - timedelta(days=20))})
      AND properties.$session_id IS NOT NULL
GROUP BY sid ORDER BY t0 DESC LIMIT 400
"""

# S11 Google 子域细分（30 天）
Q["s11_google_sub"] = sess_cte(f"match({REFF}, 'google')") + """
SELECT ref, count() AS sessions, sum(clicks) AS clicks_total,
       round(avg(dur),1) AS avg_dur,
       round(100.0*countIf(pv<=1)/count(),1) AS bounce_pct,
       countIf(pv=1 AND vit=0 AND dur<=2) AS thin
FROM s GROUP BY ref ORDER BY sessions DESC LIMIT 25
"""

# S12 utm 标注情况
Q["s12_utm"] = sess_cte(SEARCH_EXPR) + """
SELECT if(utm='','(无 utm)',utm) AS utm_source, count() AS sessions, sum(clicks) AS clicks_total
FROM s GROUP BY utm_source ORDER BY sessions DESC LIMIT 20
"""

# S13 搜索流量中「多次回访」的用户（留存 vs 一次性）
Q["s13_return"] = sess_cte(SEARCH_EXPR) + """
SELECT s2.cnt AS sessions_per_user, count() AS users,
       sum(s2.clicks) AS clicks, countIf(s2.clicks>0) AS users_with_click
FROM (SELECT pid, count() AS cnt, sum(clicks) AS clicks_total FROM s GROUP BY pid) AS s2
GROUP BY sessions_per_user ORDER BY sessions_per_user LIMIT 12
"""

# S14 Bing / 其他引擎的入口页（判断是否被低质页面拉低）
Q["s14_bing"] = sess_cte(f"match({REFF}, '(?i)bing|msn[.]')") + """
SELECT entry, count() AS sessions, sum(pv) AS pv_total, sum(clicks) AS clicks_total,
       round(avg(dur),1) AS avg_dur,
       countIf(pv=1 AND vit=0 AND dur<=2) AS thin
FROM s GROUP BY entry ORDER BY sessions DESC LIMIT 40
"""

if __name__ == "__main__":
    only = sys.argv[1:] or None
    for n, s in Q.items():
        if only and n not in only:
            continue
        try:
            j = run(s)
            json.dump({"sql": s, "columns": j["columns"], "results": j["results"]},
                      open(os.path.join(OUT, n + ".json"), "w", encoding="utf-8"),
                      ensure_ascii=False, indent=1)
            print(f"[ok] {n} rows={len(j['results'])}", flush=True)
        except Exception as e:
            print(f"[FAIL] {n}: {e}", flush=True)
