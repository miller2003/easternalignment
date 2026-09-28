"""无过滤全量：近 24h 的点击与 /go 到达，用于排除口径漏网。"""
import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, NOW, TN, T0, OUT
from datetime import timedelta

Q = {}

# ① 今日全部 affiliate_link_click（完全不过滤）
Q["all_clicks_today"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       coalesce(nullIf(properties.$session_entry_referring_domain,''),'(空)') AS ref,
       coalesce(nullIf(toString(properties.slug),''),'') AS slug,
       coalesce(nullIf(toString(properties.click_token),''),'') AS token,
       coalesce(nullIf(toString(properties.sub_id),''),'') AS sub_id,
       toString(person_id) AS pid,
       coalesce(nullIf(properties.$geoip_country_code,''),'(?)') AS cc
FROM events WHERE event='affiliate_link_click'
  AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 200
"""

# ② 今日全部 aff_go_hit / aff_go_blocked
Q["all_go_today"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       event,
       coalesce(nullIf(toString(properties.slug),''),'') AS slug,
       coalesce(nullIf(toString(properties.slug),''),'') AS _s,
       toString(properties) AS props
FROM events WHERE (event='aff_go_hit' OR event='aff_go_blocked')
  AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 200
"""

# ③ 近 3 日 16:00-20:00 时段的全部事件（找出可能未上报点击的会话）
Q["eve_all_events"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       event,
       coalesce(nullIf(properties.$pathname,''),'') AS path,
       coalesce(nullIf(properties.$session_entry_referring_domain,''),'') AS ref,
       coalesce(nullIf(properties.$session_entry_utm_source,''),'') AS utm,
       coalesce(nullIf(properties.$geoip_country_code,''),'') AS cc,
       toString(person_id) AS pid,
       coalesce(nullIf(properties.$session_id,''),'') AS sid
FROM events WHERE timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 400
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
