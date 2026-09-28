"""追踪今日联盟后台 PG 转化（约 19:00）对应的 PostHog 用户旅程。

- 转化事件（Order_Converted / Postback*）不带 $host → 必须用 CONV 口径（CN + SELF，去 host）。
- 点击事件 affiliate_link_click 在站内，用 CLEAN 口径。
"""
import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, NOW, TN, T0, CLEAN, CONV, OUT

from datetime import timedelta

Q = {}

# ① 今日全部转化/回传事件（含 raw_params 全文）
Q["tt_conv_today"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       event,
       coalesce(nullIf(toString(properties.raw_params),''),'') AS raw_params,
       toString(properties) AS props
FROM events WHERE {CONV}
  AND (event='Order_Converted' OR event LIKE '%Postback%' OR event LIKE '%Converted%')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=2))}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 100
"""

# ② 近 3 日全量转化，用于判断 19:00 那笔是否已知
Q["tt_conv_3d"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day, event, count() AS n
FROM events WHERE {CONV}
  AND (event='Order_Converted' OR event LIKE '%Postback%' OR event LIKE '%Converted%')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=3))}) AND timestamp < toDateTime({TN})
GROUP BY day, event ORDER BY day DESC LIMIT 40
"""

# ③ 今日 12:00 之后的全部联盟点击（含归因字段，用于比对 19:00 转化）
Q["tt_clicks_pm"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(toString(properties.location),''),'(空)') AS page,
       coalesce(nullIf(toString(properties.ctaSource),''),'(无)') AS pos,
       coalesce(nullIf(toString(properties.slug),''),'(无)') AS slug,
       coalesce(nullIf(toString(properties.click_token),''),'(无)') AS token,
       coalesce(nullIf(toString(properties.sub_id),''),'(无)') AS sub_id,
       coalesce(nullIf(toString(properties.text),''),'(无)') AS txt,
       toString(properties.time_on_page_ms) AS tms,
       toString(properties.pages_before_click) AS pbc,
       toString(properties.is_first_click) AS first_click,
       toString(properties.click_seq) AS seq,
       toString(properties.$session_id) AS sid,
       toString(person_id) AS pid,
       coalesce(nullIf(toString(properties.$geoip_country_code),''),'(?)') AS cc,
       coalesce(nullIf(toString(properties.$session_entry_referring_domain),''),'$direct') AS ref,
       coalesce(nullIf(toString(properties.$session_entry_utm_source),''),'') AS utm,
       coalesce(nullIf(toString(properties.$raw_user_agent),''),'') AS ua
FROM events WHERE {CLEAN} AND event='affiliate_link_click'
  AND timestamp >= toDateTime({ep(TODAY) + 10*3600}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 100
"""

# ④ 今日 18:00-20:00 全部会话的入口与来源（找 19:00 前后的人）
Q["tt_sess_eve"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid,
         any(toString(person_id)) AS pid,
         min(toTimeZone(timestamp,'Asia/Shanghai')) AS t0,
         max(toTimeZone(timestamp,'Asia/Shanghai')) AS t1,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         countIf(event='affiliate_link_click') AS clicks,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'(?)')) AS cc,
         any(coalesce(nullIf(properties.$device_type,''),'')) AS dev,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
         coalesce(nullIf(any(toString(properties.$raw_user_agent)),''),'') AS ua
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({ep(TODAY) + 8*3600})
        AND timestamp < toDateTime({TN}) AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT toString(t0) AS first_ts, toString(t1) AS last_ts, cc, dev, ref, utm, entry, pv, vit, clicks, pid, sid, ua
FROM s ORDER BY t0 LIMIT 200
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
