import json, os, sys
sys.path.insert(0, r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis")
from run_today import run, ep, TODAY, TN, CLEAN, OUT
from datetime import timedelta

Q = {}
P2 = "6db61a8d-35f1-5359-8fd7-925280f8d3c3"

# H 09-20 当日会话画像（干净口径）
d0, d1 = ep(TODAY - timedelta(days=8)), ep(TODAY - timedelta(days=7))
Q["d0920"] = f"""
WITH s AS (
  SELECT properties.$session_id AS sid, any(person_id) AS pid,
         countIf(event='$pageview') AS pv, countIf(event='$web_vitals') AS vit,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur,
         any(coalesce(nullIf(properties.$geoip_country_code,''),'?')) AS cc,
         any(coalesce(properties.$device_type,'')) AS dev,
         any(coalesce(nullIf(properties.$raw_user_agent,''),'')) AS ua,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'$direct')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_pathname,''),'')) AS entry,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({d0}) AND timestamp < toDateTime({d1})
        AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT cc, dev, ref, utm, count() AS sessions, round(avg(pv),1) AS avg_pv,
       round(avg(vit),1) AS avg_vit, countIf(pv=1 AND vit=0 AND dur<=2) AS thin
FROM s GROUP BY cc, dev, ref, utm ORDER BY sessions DESC LIMIT 30
"""

# I person 6db61a8d
Q["p2"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(properties.$host,''),'(no-host)') AS host,
       event, coalesce(nullIf(properties.$pathname,''),'') AS path,
       coalesce(nullIf(properties.$geoip_country_code,''),'') AS cc,
       coalesce(nullIf(properties.$raw_user_agent,''),'') AS ua
FROM events WHERE toString(person_id) = '{P2}' ORDER BY timestamp LIMIT 100
"""

# J 今日首次出现的人（全史判定）
Q["today_new"] = f"""
WITH f AS (SELECT person_id, min(timestamp) AS first_ts FROM events
           WHERE person_id IS NOT NULL GROUP BY person_id)
SELECT count() AS first_seen_today
FROM f WHERE toDate(toTimeZone(first_ts,'Asia/Shanghai')) = toDate(toTimeZone(toDateTime({ep(TODAY)}),'Asia/Shanghai'))
"""

# K 近 30 天每日（判断趋势）
Q["daily30"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='$pageview') AS pv,
       countIf(event='affiliate_link_click') AS clicks
FROM events WHERE {CLEAN} AND timestamp >= toDateTime({ep(TODAY - timedelta(days=30))})
GROUP BY day ORDER BY day DESC LIMIT 31
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
