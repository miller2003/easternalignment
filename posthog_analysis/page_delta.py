# -*- coding: utf-8 -*-
"""页面级 / 板块级流量退步核查

窗口设计（关键）：
  · 09-20 有一批 109 会话 / 77 薄 的机器簇，会系统性抬升任何包含它的窗口 → 主窗口刻意避开它
  · 主窗口：前期 09-09~09-19（11 完整日） vs 近期 09-22~10-02（11 完整日），等长、无机器簇
  · 对照窗口：09-22~09-26 vs 09-28~10-02（各 5 完整日，与 AI 报告保持同一口径）
  · 主指标同时给「含薄」与「剔薄」两套数字

输出：results/page_delta.json（明细）、results/page_delta_summary.json（结论）
"""
import json
import os
import sys
import collections
from datetime import timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_today import run, ep, TODAY, CLEAN, OUT  # noqa: E402

BJ = timezone(timedelta(hours=8))
T0 = ep(TODAY - timedelta(days=28))

PAIRS = {
    "main": (("2026-09-09", "2026-09-19"), ("2026-09-22", "2026-10-02")),
    "alt": (("2026-09-22", "2026-09-26"), ("2026-09-28", "2026-10-02")),
}

JUNK = ("/go/", "/data/", "/.well-known/", "/api/", "/_astro/", "/sitemap", "/robots.txt", "/favicon")


def ok(path):
    return path.startswith("/") and not any(k in path for k in JUNK)


def chan(ref, utm):
    s = (ref + " " + utm).lower()
    if any(k in s for k in ("chatgpt", "openai", "perplexity", "claude", "gemini", "copilot", "kimi",
                            "deepseek", "grok")):
        return "AI"
    if any(k in s for k in ("google", "bing", "yahoo", "duckduckgo", "yandex", "ecosia")):
        return "Search"
    if ref in ("", "$direct"):
        return "Direct"
    return "Referral"


def section(path):
    if path == "/" or path == "":
        return "首页 /"
    for p, name in (("/guides/", "guides 指南"), ("/reviews/", "reviews 测评"),
                    ("/comparisons/", "comparisons 对比"), ("/es/", "ES 西语站"),
                    ("/match/", "match 测验"), ("/coupons/", "coupons 优惠"),
                    ("/methodology/", "methodology")):
        if path.startswith(p):
            return name
    return "其他"


SQL_PV = f"""
WITH sp AS (
  SELECT properties.$session_id AS sid, coalesce(properties.$pathname,'') AS path,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
         min(timestamp) AS t0,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0})
   AND properties.$session_id IS NOT NULL
  GROUP BY sid, path
)
SELECT toString(toDate(toTimeZone(t0,'Asia/Shanghai'))) AS day, path, ref, utm,
       sum(pv) AS pv_sum, countIf(pv=1 AND vit=0 AND dur<=2) AS thin_rows
FROM sp GROUP BY day, path, ref, utm ORDER BY day LIMIT 6000
"""

SQL_ENTRY = f"""
WITH s AS (
  SELECT properties.$session_id AS sid, min(timestamp) AS t0,
         argMin(coalesce(properties.$pathname,''), timestamp) AS entry,
         any(coalesce(nullIf(properties.$session_entry_referring_domain,''),'')) AS ref,
         any(coalesce(nullIf(properties.$session_entry_utm_source,''),'')) AS utm,
         countIf(event='$pageview') AS pv,
         countIf(event='$web_vitals') AS vit,
         dateDiff('second', min(timestamp), max(timestamp)) AS dur
  FROM events WHERE {CLEAN} AND timestamp >= toDateTime({T0})
   AND properties.$session_id IS NOT NULL
  GROUP BY sid
)
SELECT toString(toDate(toTimeZone(t0,'Asia/Shanghai'))) AS day, entry, ref, utm,
       count() AS sess, countIf(pv=1 AND vit=0 AND dur<=2) AS thin_sess
FROM s GROUP BY day, entry, ref, utm ORDER BY day LIMIT 4000
"""


def load(name, sql):
    j = run(sql)
    json.dump({"columns": j["columns"], "results": j["results"]},
              open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"[ok] {name} rows={len(j['results'])}", flush=True)
    return j["results"]


rows_pv = load("page_delta", SQL_PV)
rows_entry = load("page_delta_entry", SQL_ENTRY)


def agg(rows, win, drop_thin=True, ch=None):
    a, b = win
    acc = collections.Counter()
    for r in rows:
        day, k, ref, utm = r[0], r[1], r[2], r[3]
        if not (a <= day <= b) or not ok(k):
            continue
        if ch and chan(ref, utm) != ch:
            continue
        acc[k] += r[4] - (r[5] if drop_thin else 0)
    return acc


def agg_sec(rows, win, drop_thin=True, ch=None):
    a, b = win
    acc = collections.Counter()
    for r in rows:
        day, k, ref, utm = r[0], r[1], r[2], r[3]
        if not (a <= day <= b) or not ok(k):
            continue
        if ch and chan(ref, utm) != ch:
            continue
        acc[section(k)] += r[4] - (r[5] if drop_thin else 0)
    return acc


def delta(prior, recent, min_v=0):
    out = []
    for p in set(prior) | set(recent):
        x, y = prior.get(p, 0), recent.get(p, 0)
        if max(x, y) < min_v:
            continue
        out.append((p, x, y, y - x, (y / x - 1) * 100 if x else None))
    return sorted(out, key=lambda t: t[3])


report = {}
for tag, (A, B) in PAIRS.items():
    pvP, pvR = agg(rows_pv, A), agg(rows_pv, B)
    pvP_raw = agg(rows_pv, A, drop_thin=False)
    pvR_raw = agg(rows_pv, B, drop_thin=False)
    entP, entR = agg(rows_entry, A), agg(rows_entry, B)
    secP, secR = agg_sec(rows_pv, A), agg_sec(rows_pv, B)
    aiP, aiR = agg_sec(rows_pv, A, ch="AI"), agg_sec(rows_pv, B, ch="AI")
    aiPageP, aiPageR = agg(rows_pv, A, ch="AI"), agg(rows_pv, B, ch="AI")
    report[tag] = {
        "win": [A, B],
        "section_pv": [(k, secP.get(k, 0), secR.get(k, 0), secR.get(k, 0) - secP.get(k, 0),
                        (secR.get(k, 0) / secP[k] - 1) * 100 if secP.get(k) else None)
                       for k in sorted(set(secP) | set(secR), key=lambda k: -(secP.get(k, 0) or 0))],
        "section_ai": [(k, aiP.get(k, 0), aiR.get(k, 0), aiR.get(k, 0) - aiP.get(k, 0))
                       for k in sorted(set(aiP) | set(aiR), key=lambda k: -(aiP.get(k, 0) or 0))],
        "page_drop": [x for x in delta(pvP, pvR, 4) if x[3] < 0][:22],
        "page_gain": [x for x in delta(pvP, pvR, 4) if x[3] > 0][::-1][:15],
        "zero": sorted([(p, x, y) for p, x, y, _, _ in delta(pvP, pvR, 3) if y == 0 and x >= 3],
                       key=lambda t: -t[1])[:22],
        "entry_drop": [x for x in delta(entP, entR, 3) if x[3] < 0][:18],
        "entry_gain": [x for x in delta(entP, entR, 3) if x[3] > 0][::-1][:12],
        "ai_page_drop": [x for x in delta(aiPageP, aiPageR, 1) if x[3] < 0][:18],
        "totals": {
            "pv_p": sum(pvP.values()), "pv_r": sum(pvR.values()),
            "pv_p_raw": sum(pvP_raw.values()), "pv_r_raw": sum(pvR_raw.values()),
            "pages_p": len(pvP), "pages_r": len(pvR),
            "ent_p": sum(entP.values()), "ent_r": sum(entR.values()),
            "ai_p": sum(aiPageP.values()), "ai_r": sum(aiPageR.values()),
        },
    }

json.dump(report, open(os.path.join(OUT, "page_delta_summary.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

for tag in ("main", "alt"):
    R = report[tag]
    A, B = R["win"]
    t = R["totals"]
    print("\n" + "=" * 100)
    print(f"窗口[{tag}]  前期 {A[0]}~{A[1]}  近期 {B[0]}~{B[1]}")
    print(f"  页面浏览量(剔薄): {t['pv_p']} -> {t['pv_r']}  ({(t['pv_r']/t['pv_p']-1)*100:+.0f}%)   "
          f"命中页面数 {t['pages_p']} -> {t['pages_r']}")
    print(f"  页面浏览量(含薄): {t['pv_p_raw']} -> {t['pv_r_raw']}  ({(t['pv_r_raw']/t['pv_p_raw']-1)*100:+.0f}%)")
    print(f"  落地页会话:       {t['ent_p']} -> {t['ent_r']}  ({(t['ent_r']/t['ent_p']-1)*100:+.0f}%)")
    print(f"  AI 渠道页面浏览:  {t['ai_p']} -> {t['ai_r']}  ({(t['ai_r']/t['ai_p']-1)*100:+.0f}%)")
    print("\n  -- 板块级（剔薄）--")
    for k, a, b, d, pct in R["section_pv"]:
        print(f"    {k:18}{a:>6}{b:>6}{d:>+7}{(f'{pct:+.0f}%' if pct is not None else '新'):>9}")
    print("\n  -- 退步页 TOP --")
    for p, a, b, d, pct in R["page_drop"][:14]:
        print(f"    {p[:62]:64}{a:>5}{b:>5}{d:>+6}{(f'{pct:+.0f}%' if pct is not None else '新'):>8}")
    print("\n  -- 增长页 TOP --")
    for p, a, b, d, pct in R["page_gain"][:10]:
        print(f"    {p[:62]:64}{a:>5}{b:>5}{d:>+6}{(f'{pct:+.0f}%' if pct is not None else '新'):>8}")
    print("\n  -- 归零页 --")
    for p, a, b in R["zero"][:12]:
        print(f"    {p[:70]:72}{a:>5} -> 0")
print("\nsaved results/page_delta_summary.json")
