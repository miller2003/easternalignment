"""Lead(注册) → Sale(付费) 漏斗分析

用途：$0/Lead 回传接通后，回答两个此前无法回答的问题——
  ① 哪个页面 / 哪一次点击带来了注册
  ② 注册 → 付费的升级率与升级耗时

实现：PostHog 侧不做跨事件 JOIN（10 秒上限 + HogQL 限制），
改为分别拉「转化行」和「点击行」，在 Python 里按 click_token 连接。

用法：
  python lead_funnel.py            # 默认近 60 天
  python lead_funnel.py 14         # 近 14 天
"""
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_today import run, ep, TODAY, TN, CONV, OUT  # noqa: E402

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 60
BJ = timezone(timedelta(hours=8))
T0 = ep(TODAY - timedelta(days=DAYS))

# 排除自检写入的测试数据
NOT_TEST = """
  AND coalesce(toString(properties.transaction_id),'') NOT LIKE 'SELFTEST-%'
"""

Q = {}

# ① 全部转化行（lead + sale），带判定依据与金额
Q["lf_conversions"] = f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(nullIf(toString(properties.transaction_id),''),'') AS txn,
       coalesce(nullIf(toString(properties.conversion_type),''),'') AS ctype,
       coalesce(nullIf(toString(properties.platform),''),'') AS platform,
       coalesce(nullIf(toString(properties.click_token),''),'') AS token,
       coalesce(nullIf(toString(properties.sub_id_canonical),''),'') AS sub,
       coalesce(nullIf(toString(properties.distinct_id),''),'') AS did,
       toString(properties.revenue) AS revenue,
       coalesce(nullIf(toString(properties.status),''),'') AS status,
       coalesce(nullIf(toString(properties.type_inference),''),'') AS ti,
       toString(properties.orphan) AS orphan,
       event AS ev
FROM events WHERE {CONV} AND event IN ('Order_Converted','Postback_Orphan')
  AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
  {NOT_TEST}
ORDER BY timestamp DESC LIMIT 500
"""

# ② 同期点击行（用于把 token 还原成页面 / CTA 位置）
Q["lf_clicks"] = f"""
SELECT coalesce(nullIf(toString(properties.click_token),''),'') AS token,
       coalesce(nullIf(toString(properties.location),''),'') AS page,
       coalesce(nullIf(toString(properties.ctaSource),''),'') AS cta,
       coalesce(nullIf(toString(properties.slug),''),'') AS slug,
       coalesce(nullIf(toString(properties.page_type),''),'') AS ptype,
       toString(properties.$session_entry_utm_source) AS utm,
       coalesce(nullIf(toString(properties.$session_entry_referring_domain),''),'') AS ref,
       toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       toString(properties.time_on_page_ms) AS tms
FROM events WHERE event='affiliate_link_click'
  AND timestamp >= toDateTime({T0} - 86400) AND timestamp < toDateTime({TN})
ORDER BY timestamp DESC LIMIT 800
"""

# ③ 转化行按日/类型汇总（不依赖点击，先给总量）
Q["lf_daily"] = f"""
SELECT toDate(toTimeZone(timestamp,'Asia/Shanghai')) AS day,
       countIf(properties.conversion_type='lead') AS leads,
       countIf(properties.conversion_type='sale') AS sales,
       sumIf(properties.revenue, properties.conversion_type='sale') AS sale_revenue,
       countIf(properties.is_reversal=true) AS reversals
FROM events WHERE {CONV} AND event='Order_Converted'
  AND timestamp >= toDateTime({T0}) AND timestamp < toDateTime({TN})
  {NOT_TEST}
GROUP BY day ORDER BY day DESC LIMIT 90
"""


def load():
    for name, sql in Q.items():
        try:
            j = run(sql)
            with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
                json.dump({"sql": sql, "columns": j["columns"], "results": j["results"]},
                          f, ensure_ascii=False, indent=1)
            print(f"[ok] {name} rows={len(j['results'])}", flush=True)
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)


def report():
    conv = json.load(open(os.path.join(OUT, "lf_conversions.json"), encoding="utf-8"))["results"]
    clicks = json.load(open(os.path.join(OUT, "lf_clicks.json"), encoding="utf-8"))["results"]
    daily = json.load(open(os.path.join(OUT, "lf_daily.json"), encoding="utf-8"))["results"]

    tok = {}
    for c in clicks:  # token, page, cta, slug, ptype, utm, ref, t, tms
        if c[0] and c[0] not in tok:
            tok[c[0]] = c

    leads, sales, orphans, reversals = [], [], [], []
    for r in conv:
        rec = dict(zip(["t", "txn", "ctype", "platform", "token", "sub", "did",
                        "revenue", "status", "ti", "orphan", "ev"], r))
        if rec["ev"] == "Postback_Orphan":
            orphans.append(rec)
        elif rec["ctype"] == "lead":
            leads.append(rec)
        else:
            (reversals if rec["ti"] == "reversal" else sales).append(rec)

    print(f"\n{'='*72}\nLead/Sale 漏斗（近 {DAYS} 天）\n{'='*72}")
    print(f"注册(lead) {len(leads)} 笔 ｜ 付费(sale) {len(sales)} 笔 ｜ "
          f"撤销 {len(reversals)} 笔 ｜ 无法归因(Orphan) {len(orphans)} 笔")
    rev = sum(float(s["revenue"] or 0) for s in sales) + sum(float(s["revenue"] or 0) for s in reversals)
    print(f"净营收（sale + 撤销冲回，已按事件值汇总）: ${rev:.0f}")

    if not leads and not sales:
        print("\n⚠️ 同期没有任何转化回传。若后台确实有转化，请查：\n"
              "   · Postback_Orphan 是否 > 0（>0 = 发了但认不出人；=0 = 后台根本没发）\n"
              "   · 参考 docs/lead-postback-setup.md")
        return

    # 升级率：Kasamba / PG 的「注册 → 约 24h 后付费」共用同一 transaction_id
    by_txn = defaultdict(lambda: {"lead": None, "sale": None})
    for l in leads:
        by_txn[l["txn"]]["lead"] = l
    for s in sales:
        by_txn[s["txn"]]["sale"] = s

    paired = {k: v for k, v in by_txn.items() if v["lead"] and v["sale"]}
    only_lead = {k: v for k, v in by_txn.items() if v["lead"] and not v["sale"]}
    only_sale = {k: v for k, v in by_txn.items() if v["sale"] and not v["lead"]}

    print("\n--- 注册 → 付费 升级 ---")
    if leads:
        rate = 100.0 * len(paired) / max(1, len(paired) + len(only_lead))
        print(f"可配对交易号 {len(paired) + len(only_lead)} 个 → 升级 {len(paired)} 个，"
              f"**升级率 {rate:.1f}%**")
    else:
        print("尚无注册记录（Lead 回传可能仍未接通），无法计算升级率。")
    if only_sale:
        print(f"（另有 {len(only_sale)} 笔付费没有对应的注册记录：可能是 Keen 这类"
              f"「点击即付费」或注册回传缺失）")
    for k, v in list(paired.items())[:10]:
        try:
            t0 = datetime.strptime(v["lead"]["t"][:19], "%Y-%m-%d %H:%M:%S")
            t1 = datetime.strptime(v["sale"]["t"][:19], "%Y-%m-%d %H:%M:%S")
            h = (t1 - t0).total_seconds() / 3600
            print(f"   {k[:12]}… {v['lead']['platform'] or '?':<12} 注册 {v['lead']['t'][5:19]} "
                  f"→ 付费 {v['sale']['t'][5:19]}  滞后 {h:.1f} 小时")
        except Exception:
            pass

    # 归因：注册是哪次点击带来的
    print("\n--- 注册来自哪一次点击 / 哪个页面 ---")
    page_tally, cta_tally, plat_tally = defaultdict(int), defaultdict(int), defaultdict(int)
    missing = 0
    for l in leads:
        c = tok.get(l["token"])
        if not c:
            missing += 1
            continue
        page_tally[c[1] or "(空)"] += 1
        cta_tally[c[2] or "(空)"] += 1
        plat_tally[l["platform"] or "(未识别)"] += 1
    if page_tally:
        for p, n in sorted(page_tally.items(), key=lambda x: -x[1]):
            print(f"   {n:>3}  {p}")
    if cta_tally:
        print("   CTA 位置：" + "，".join(f"{k}×{v}" for k, v in sorted(cta_tally.items(), key=lambda x: -x[1])))
    if plat_tally:
        print("   平台：" + "，".join(f"{k}×{v}" for k, v in sorted(plat_tally.items(), key=lambda x: -x[1])))
    if missing:
        print(f"   （{missing} 笔注册的 click_token 在点击表里找不到，可能是窗口外点击或回传参数被改写）")

    print("\n--- 逐日 ---")
    print("   day         leads  sales  revenue")
    for d in daily:
        print(f"   {d[0]}  {d[1]:>5}  {d[2]:>5}  {float(d[3] or 0):>7.0f}")


if __name__ == "__main__":
    load()
    report()
