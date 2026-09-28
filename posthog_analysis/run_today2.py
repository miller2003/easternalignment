import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, NOW, TN, CLEAN, CONV, RAW, OUT
from datetime import timedelta

P = "5d320aa9-39cc-5b64-9997-e9c373fc0649"

Q = {}

# A 今日主力用户全史
Q["p_main"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       event,
       coalesce(nullIf(properties.$pathname,''),'') AS path,
       coalesce(nullIf(properties.$session_entry_utm_source,''),'') AS utm,
       coalesce(nullIf(properties.$geoip_country_code,''),'') AS cc,
       coalesce(nullIf(properties.$raw_user_agent,''),'') AS ua
FROM events WHERE toString(person_id) = '{P}'
ORDER BY timestamp LIMIT 400
"""

# B 近 7 天 vs 前 7 天（干净口径，整日）
a0, a1 = ep(TODAY - timedelta(days=7)), ep(TODAY)
b0, b1 = ep(TODAY - timedelta(days=14)), ep(TODAY - timedelta(days=7))
Q["week_cmp"] = f"""
SELECT 'last7' AS seg, count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users, countIf(event='$pageview') AS pv,
       countIf(event='affiliate_link_click') AS clicks
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({a0}) AND timestamp < toDateTime({a1})
UNION ALL
SELECT 'prev7', count(DISTINCT properties.$session_id), count(DISTINCT person_id),
       countIf(event='$pageview'), countIf(event='affiliate_link_click')
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({b0}) AND timestamp < toDateTime({b1})
"""

# C 近 7 天渠道矩阵
Q["chan_7d"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({a0}) AND timestamp < toDateTime({a1})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT CASE
    WHEN match(concat(coalesce(ref,''),' ',coalesce(utm,'')), '(?i)(chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok)') THEN 'AI助手'
    WHEN match(coalesce(ref,''), '(?i)(google|bing|yahoo|duckduckgo|yandex|ecosia)') THEN '搜索引擎'
    WHEN ref = '$direct' OR coalesce(ref,'') = '' THEN '直接访问'
    ELSE '外链引荐' END AS channel,
  count() AS sessions, sum(clicks) AS total_clicks,
  round(100.0*countIf(clicks>0)/count(),1) AS cvr_pct
FROM s GROUP BY channel ORDER BY sessions DESC LIMIT 20
"""

# D 转化明细（raw_params 里的 click_id）
Q["conv_detail"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, event,
       coalesce(nullIf(toString(properties.raw_params),''),'') AS raw_params,
       toString(properties) AS props
FROM events WHERE {CONV} AND timestamp >= toDateTime({ep(TODAY - timedelta(days=20))})
  AND (event='Order_Converted' OR event LIKE '%Postback%')
ORDER BY timestamp DESC LIMIT 60
"""

# E 今日按小时分布（干净口径）
Q["today_hourly"] = f"""
SELECT toHour(toTimeZone(timestamp,'Asia/Shanghai')) AS h,
       countIf(event='$pageview') AS pv,
       countIf(event='affiliate_link_click') AS clicks,
       count(DISTINCT properties.$session_id) AS sessions
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({ep(TODAY)}) AND timestamp < toDateTime({TN})
GROUP BY h ORDER BY h LIMIT 24
"""

# F 今日 raw（含污染、含 mysticdo）总量，用于披露口径差
Q["today_raw_all"] = f"""
SELECT coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='$pageview') AS pv,
       countIf(event='affiliate_link_click') AS clicks
FROM events WHERE timestamp >= toDateTime({ep(TODAY)}) AND timestamp < toDateTime({TN})
GROUP BY host ORDER BY sessions DESC LIMIT 20
"""

# G 今日匿名/新客判定
Q["newish"] = f"""
SELECT toString(person_id) AS pid,
       toString(min(toTimeZone(timestamp,'Asia/Shanghai'))) AS first_ts,
       count(DISTINCT properties.$session_id) AS sessions
FROM events
WHERE person_id IS NOT NULL AND timestamp >= toDateTime({ep(TODAY - timedelta(days=60))})
GROUP BY pid HAVING sessions > 0 ORDER BY first_ts DESC LIMIT 200
"""

if __name__ == "__main__":
    for name, sql in Q.items():
        try:
            j = run(sql)
            with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
                json.dump({"sql": sql, "columns": j["columns"], "results": j["results"]},
                          f, ensure_ascii=False, indent=1)
            print(f"[ok] {name} rows={len(j['results'])}", flush=True)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
