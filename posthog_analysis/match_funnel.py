"""match 功能专项分析 —— 使用人数 / 漏斗 / 效果

口径（照抄 skill `ea-posthog-traffic-analysis`）：
  · 干净口径 CLEAN：host=easternalignment.com + 剔 CN + 剔本地开发来源 + 剔自测 person_id
  · 转化口径 CONV：只剔 CN + 自测，「必须去掉 host 条件」（match_* 事件都带 $host，但
    affiliate_link_click / Order_Converted 不带 → 混用会静默归零）
  · 时间桶一律 toTimeZone(timestamp,'Asia/Shanghai')；过滤用 Python 预算 epoch
  · 必须显式 LIMIT

match_* 事件由 src/match/analytics.ts → posthog.capture 上报，共 3 个：
  match_started          { totalReaders }
  match_step_completed   { step, questionId, answer }
  match_completed        { intent, topReader }

埋点落在两个宿主：首页 modal（index.astro:282 mode="modal"）/ 独立页 /match/（inline）
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_today import run, ep, BJ, TODAY, NOW, T0, TN, CLEAN, CONV, SELF, RAW, DEV  # noqa

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT, exist_ok=True)
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7

W0 = ep(TODAY - timedelta(days=DAYS - 1))   # 含今天在内，共 DAYS 天


def save(name, sql):
    j = run(sql)
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump({"sql": sql, "columns": j["columns"], "results": j["results"],
                   "hasMore": j.get("hasMore")}, f, ensure_ascii=False, indent=1)
    print(f"[ok] {name}  rows={len(j['results'])} hasMore={j.get('hasMore')}", flush=True)
    return j


Q = {}

# ── ① 事件总量对照：干净 vs 未过滤（确认口径没把 match 事件剔掉） ──
Q["mf_event_totals"] = f"""
SELECT event,
       count() AS n_clean,
       count(DISTINCT person_id) AS users_clean,
       count(DISTINCT properties.$session_id) AS sessions_clean,
       countIf(coalesce(properties.$geoip_country_code,'')='CN') AS n_cn,
       countIf(coalesce(properties.$host,'') != 'easternalignment.com') AS n_otherhost
FROM events
WHERE event IN ('match_started','match_step_completed','match_completed')
  AND timestamp >= toDateTime({W0})
GROUP BY event ORDER BY n_clean DESC LIMIT 20
"""

# ── ② 逐日：使用人数 / 会话 / 完成数（干净口径） ──
Q["mf_daily"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       count(DISTINCT person_id) AS users,
       count(DISTINCT properties.$session_id) AS sessions,
       countIf(event='match_started') AS starts,
       countIf(event='match_step_completed') AS steps,
       countIf(event='match_completed') AS completes,
       uniqExactIf(person_id, event='match_started') AS u_start,
       uniqExactIf(person_id, event='match_completed') AS u_done
FROM events
WHERE {CLEAN}
  AND event IN ('match_started','match_step_completed','match_completed')
  AND timestamp >= toDateTime({W0})
GROUP BY day ORDER BY day DESC LIMIT 40
"""

# ── ③ 总漏斗（按人去重，干净口径） ──
Q["mf_funnel"] = f"""
SELECT
  uniqExactIf(person_id, event='match_started')  AS u_start,
  uniqExactIf(person_id, event='match_completed') AS u_done,
  uniqExactIf(person_id, event='match_step_completed' AND toInt32OrZero(toString(properties.step))>=7) AS u_step7,
  countIf(event='match_started') AS n_start,
  countIf(event='match_completed') AS n_done,
  countIf(event='match_step_completed') AS n_steps
FROM events
WHERE {CLEAN}
  AND event IN ('match_started','match_step_completed','match_completed')
  AND timestamp >= toDateTime({W0})
"""

# ── ④ 逐步流失（step 1..7 各有多少人走过） ──
Q["mf_step_drop"] = f"""
SELECT toInt32OrZero(toString(properties.step)) AS step,
       count(DISTINCT person_id) AS users,
       count() AS events,
       uniqExact(toString(properties.questionId)) AS qids
FROM events
WHERE {CLEAN} AND event='match_step_completed'
  AND timestamp >= toDateTime({W0})
GROUP BY step ORDER BY step LIMIT 20
"""

# ── ⑤ 答卷画像：intent 分布（第 1 题答案） ──
Q["mf_intent"] = f"""
SELECT coalesce(nullIf(toString(properties.answer),''),'(空)') AS answer,
       count(DISTINCT person_id) AS users,
       count() AS n
FROM events
WHERE {CLEAN} AND event='match_step_completed'
  AND toString(properties.questionId)='intent'
  AND timestamp >= toDateTime({W0})
GROUP BY answer ORDER BY users DESC LIMIT 20
"""

# ── ⑥ 各题答案分布（合并看，最多 60 行） ──
Q["mf_answers"] = f"""
SELECT toString(properties.questionId) AS qid,
       coalesce(nullIf(toString(properties.answer),''),'(空)') AS answer,
       count() AS n
FROM events
WHERE {CLEAN} AND event='match_step_completed'
  AND timestamp >= toDateTime({W0})
GROUP BY qid, answer ORDER BY qid, n DESC LIMIT 200
"""

# ── ⑦ 已完成者的结果分布：topReader / intent ──
Q["mf_results"] = f"""
SELECT coalesce(nullIf(toString(properties.topReader),''),'(空)') AS top_reader,
       coalesce(nullIf(toString(properties.intent),''),'(空)') AS intent,
       count() AS n,
       count(DISTINCT person_id) AS users
FROM events
WHERE {CLEAN} AND event='match_completed'
  AND timestamp >= toDateTime({W0})
GROUP BY top_reader, intent ORDER BY n DESC LIMIT 60
"""

# ── ⑧ 效果 A：用过 match 的人中，之后是否产生联盟点击（干净口径，同 7 天窗口） ──
Q["mf_effect_click"] = f"""
WITH m AS (
  SELECT DISTINCT person_id
  FROM events WHERE {CLEAN} AND event LIKE 'match_%' AND timestamp >= toDateTime({W0})
),
c AS (
  SELECT DISTINCT person_id
  FROM events WHERE {CLEAN} AND event='affiliate_link_click' AND timestamp >= toDateTime({W0})
),
a AS (
  SELECT DISTINCT person_id
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({W0})
)
SELECT count() AS all_users,
       countIf(person_id IN (SELECT person_id FROM m)) AS match_users,
       countIf(person_id IN (SELECT person_id FROM c)) AS click_users,
       countIf(person_id IN (SELECT person_id FROM m) AND person_id IN (SELECT person_id FROM c)) AS match_then_click
FROM a
"""

# ── ⑨ 效果 B：match 源点击明细（CTA 全链） ──
Q["mf_click_src"] = f"""
SELECT coalesce(nullIf(toString(properties.ctaSource),''),'(无)') AS pos,
       coalesce(nullIf(toString(properties.slug),''),'(无)') AS slug,
       count() AS n,
       count(DISTINCT person_id) AS users
FROM events
WHERE {CLEAN} AND event='affiliate_link_click'
  AND timestamp >= toDateTime({W0})
GROUP BY pos, slug ORDER BY n DESC LIMIT 60
"""

# ── ⑩ 使用 match 者的会话上下文（入口页 / 模式 / 设备） ──
Q["mf_context"] = f"""
SELECT coalesce(nullIf(toString(properties.$session_entry_pathname),''),'(空)') AS entry_path,
       coalesce(nullIf(toString(properties.$device_type),''),'(空)') AS dev,
       coalesce(nullIf(toString(properties.$geoip_country_code),''),'(空)') AS country,
       count(DISTINCT properties.$session_id) AS sessions,
       count(DISTINCT person_id) AS users
FROM events
WHERE {CLEAN} AND event LIKE 'match_%'
  AND timestamp >= toDateTime({W0})
GROUP BY entry_path, dev, country ORDER BY sessions DESC LIMIT 60
"""

# ── ⑪ 逐人路径（谁 / 何时 / 走了几步 / 第几个完成 / 之后有没有点） ──
Q["mf_per_person"] = f"""
WITH m AS (
  SELECT person_id,
         min(toTimeZone(timestamp,'Asia/Shanghai')) AS first_ts,
         max(toTimeZone(timestamp,'Asia/Shanghai')) AS last_ts,
         countIf(event='match_started') AS starts,
         maxIf(toInt32OrZero(toString(properties.step)),
               event='match_step_completed') AS max_step,
         countIf(event='match_completed') AS completes,
         anyIf(toString(properties.topReader), event='match_completed') AS top_reader,
         anyIf(toString(properties.intent), event='match_completed') AS intent,
         any(coalesce(nullIf(toString(properties.$geoip_country_code),''),'')) AS country,
         any(coalesce(nullIf(toString(properties.$device_type),''),'')) AS dev,
         any(coalesce(nullIf(toString(properties.$session_entry_referring_domain),''),'')) AS ref,
         any(coalesce(nullIf(toString(properties.$session_entry_utm_source),''),'')) AS utm,
         any(coalesce(nullIf(toString(properties.$session_entry_pathname),''),'')) AS entry,
         count(DISTINCT properties.$session_id) AS sessions,
         countIf(event='$pageview') AS pv
  FROM events
  WHERE {CLEAN} AND timestamp >= toDateTime({W0})
  GROUP BY person_id
  HAVING match_started_any > 0
)
SELECT toString(first_ts) AS first_ts, toString(last_ts) AS last_ts,
       starts, max_step, completes, top_reader, intent,
       country, dev, ref, utm, entry, sessions, pv,
       toString(person_id) AS pid
FROM (
  SELECT *, countIf(event='match_started') AS match_started_any
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({W0}) GROUP BY person_id
) AS raw
LEFT JOIN (SELECT person_id AS pid2, 0 AS dummy FROM events LIMIT 0) ON 1=0
LIMIT 0
"""

# ── ⑪ 逐人路径（重写：单层聚合，避免上面那种关联写法） ──
Q["mf_per_person"] = f"""
SELECT toString(min(toTimeZone(timestamp,'Asia/Shanghai'))) AS first_ts,
       toString(max(toTimeZone(timestamp,'Asia/Shanghai'))) AS last_ts,
       toString(person_id) AS pid,
       countIf(event='match_started') AS starts,
       maxIf(toInt32OrZero(toString(properties.step)), event='match_step_completed') AS max_step,
       countIf(event='match_completed') AS completes,
       anyIf(toString(properties.topReader), event='match_completed') AS top_reader,
       anyIf(toString(properties.intent), event='match_step_completed'
             AND toString(properties.questionId)='intent') AS intent,
       countIf(event='$pageview') AS pv,
       count(DISTINCT properties.$session_id) AS sessions,
       any(coalesce(nullIf(toString(properties.$geoip_country_code),''),'')) AS country,
       any(coalesce(nullIf(toString(properties.$device_type),''),'')) AS dev,
       any(coalesce(nullIf(toString(properties.$session_entry_referring_domain),''),'')) AS ref,
       any(coalesce(nullIf(toString(properties.$session_entry_utm_source),''),'')) AS utm
FROM events
WHERE {CLEAN} AND timestamp >= toDateTime({W0})
GROUP BY person_id
HAVING countIf(event='match_started') > 0
ORDER BY first_ts DESC LIMIT 200
"""

# ── ⑫ 使用 match 的人，其后续联盟点击明细（时间顺序，验证因果） ──
Q["mf_match_clicks"] = f"""
WITH m AS (
  SELECT DISTINCT person_id
  FROM events WHERE {CLEAN} AND event LIKE 'match_%' AND timestamp >= toDateTime({W0})
)
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       toString(person_id) AS pid,
       coalesce(nullIf(toString(properties.slug),''),'(无)') AS slug,
       coalesce(nullIf(toString(properties.ctaSource),''),'(无)') AS pos,
       coalesce(nullIf(toString(properties.location),''),'(空)') AS page,
       coalesce(nullIf(toString(properties.click_token),''),'(无)') AS token,
       toString(person_id IN (SELECT person_id FROM m)) AS is_match_user
FROM events
WHERE {CLEAN} AND event='affiliate_link_click'
  AND timestamp >= toDateTime({W0})
ORDER BY timestamp DESC LIMIT 100
"""

# ── ⑬ match 事件是否带 host / 有没有漏在别的 host 下 ──
Q["mf_host"] = f"""
SELECT coalesce(nullIf(toString(properties.$host),''),'(无)') AS host,
       coalesce(nullIf(toString(properties.$pathname),''),'(无)') AS pathname,
       count() AS n,
       count(DISTINCT person_id) AS users
FROM events
WHERE event LIKE 'match_%' AND timestamp >= toDateTime({W0})
GROUP BY host, pathname ORDER BY n DESC LIMIT 40
"""

if __name__ == "__main__":
    for name, sql in Q.items():
        try:
            save(name, sql)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
