"""追踪今日 PG 转化的疑似用户 + 历史转化滞后实证。"""
import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, NOW, TN, T0, CLEAN, CONV, OUT
from datetime import timedelta

P1 = "5d320aa9-39cc-5b64-9997-e9c373fc0649"   # US / iPhone / chatgpt / 全天点 PG
P2 = "03b26245-b83a-592d-8ac7-7ae647d7d3af"   # GB / desktop / google / 18:55 点 Kasamba

Q = {}

# ① P1 全史（全部事件，含属性摘要）
for tag, pid in (("p1", P1), ("p2", P2)):
    Q[f"trace_{tag}"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       event,
       coalesce(nullIf(properties.$pathname,''),'') AS path,
       coalesce(nullIf(properties.$session_id,''),'') AS sid,
       coalesce(nullIf(properties.$session_entry_referring_domain,''),'') AS ref,
       coalesce(nullIf(properties.$session_entry_utm_source,''),'') AS utm,
       coalesce(nullIf(properties.$session_entry_pathname,''),'') AS entry,
       coalesce(nullIf(toString(properties.slug),''),'') AS slug,
       coalesce(nullIf(toString(properties.ctaSource),''),'') AS cta,
       coalesce(nullIf(toString(properties.click_token),''),'') AS token,
       coalesce(nullIf(toString(properties.sub_id),''),'') AS sub_id,
       coalesce(nullIf(toString(properties.href),''),'') AS href,
       toString(properties.time_on_page_ms) AS tms,
       coalesce(nullIf(properties.$geoip_country_code,''),'') AS cc,
       coalesce(nullIf(properties.$device_type,''),'') AS dev,
       coalesce(nullIf(properties.$browser,''),'') AS br,
       coalesce(nullIf(properties.$os,''),'') AS os,
       coalesce(nullIf(properties.$timezone,''),'') AS tz,
       coalesce(nullIf(properties.$referrer,''),'') AS referrer,
       coalesce(nullIf(properties.$pathname,''),'') AS _p,
       toString(properties.$session_id) AS _s
FROM events WHERE toString(person_id) = '{pid}'
ORDER BY timestamp LIMIT 1200
"""

# ② P1 会话聚合
Q["p1_sessions"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         min(toTimeZone(timestamp,'Asia/Shanghai')) AS t0,
         max(toTimeZone(timestamp,'Asia/Shanghai')) AS t1,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         countIf(event='affiliate_link_click') AS clicks,
         countIf(event='aff_go_hit') AS gohits,
         countIf(event LIKE 'match%') AS quiz,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'')) AS cc,
         any(coalesce(nullIf(properties.$device_type,''),'')) AS dev
  FROM events WHERE toString(person_id) = '{P1}' AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT toString(t0) AS t0, toString(t1) AS t1, dur, pv, vit, clicks, gohits, quiz, entry, ref, utm, cc, dev, sid
FROM s ORDER BY t0 LIMIT 100
"""

# ③ 近 30 天全部 Order_Converted（判是否有 payout=0 的注册回传）
Q["conv_30d"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       event,
       coalesce(nullIf(toString(properties.raw_params),''),'') AS raw_params,
       toString(properties.$source) AS src,
       toString(properties.advertiser_name) AS advertiser
FROM events WHERE {CONV}
  AND (event='Order_Converted' OR event LIKE '%Postback%')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=30))}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 200
"""

# ④ 近 3 天 PG 相关点击（按 slug 含 purple 过滤），含 token，用于滞后核对
Q["pg_clicks_3d"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(toString(properties.location),''),'') AS page,
       coalesce(nullIf(toString(properties.slug),''),'') AS slug,
       coalesce(nullIf(toString(properties.click_token),''),'') AS token,
       coalesce(nullIf(toString(properties.sub_id),''),'') AS sub_id,
       toString(properties.$session_id) AS sid,
       toString(person_id) AS pid,
       coalesce(nullIf(properties.$geoip_country_code,''),'') AS cc
FROM events WHERE {CLEAN} AND event='affiliate_link_click'
  AND match(coalesce(toString(properties.slug),''),'purple')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=3))}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 200
"""

# ⑤ 关键 token 反查点击时间（历史转化滞后实证）
Q["tok_hist"] = f"""
SELECT coalesce(nullIf(toString(properties.click_token),''),'') AS token,
       toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(toString(properties.slug),''),'') AS slug,
       coalesce(nullIf(toString(properties.location),''),'') AS page,
       toString(person_id) AS pid,
       coalesce(nullIf(toString(properties.$geoip_country_code),''),'') AS cc,
       toString(properties.time_on_page_ms) AS tms
FROM events WHERE {CLEAN} AND event='affiliate_link_click'
  AND toString(properties.click_token) IN ('fqwax3','pq98uh','fa5gn3')
ORDER BY timestamp DESC LIMIT 50
"""

if __name__ == "__main__":
    for name, sql in Q.items():
        try:
            j = run(sql)
            with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
                json.dump({"sql": sql, "columns": j["columns"], "results": j["results"]},
                          f, ensure_ascii=False, indent=1)
            print(f"[ok] {name} rows={len(j['results'])} hasMore={j.get('hasMore')}", flush=True)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
