# -*- coding: utf-8 -*-
"""AI 渠道流量下滑的统计核查（读 results/ai_series.json，不联网）"""
import json
import os
import collections
import statistics
from datetime import datetime, timedelta

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")

d = json.load(open(os.path.join(OUT, "ai_series.json"), encoding="utf-8"))
byday = collections.defaultdict(collections.Counter)
for day, ch, ref, ses, pv, ck, zv in d["results"]:
    byday[day][ch] += ses

days = sorted(byday)
start = datetime.strptime(days[0], "%Y-%m-%d")
end = datetime.strptime(days[-1], "%Y-%m-%d")
series = []
cur = start
while cur <= end:
    k = cur.strftime("%Y-%m-%d")
    r = byday.get(k, collections.Counter())
    series.append((k, r["AI"], r["Search"], r["Direct"], r["Referral"], sum(r.values())))
    cur += timedelta(days=1)
print("series days:", len(series), series[0][0], "->", series[-1][0])


def roll(idx, n):
    return [(series[i + n - 1][0], sum(s[idx] for s in series[i:i + n]))
            for i in range(len(series) - n + 1)]


for n in (7, 4):
    for idx, name in [(1, "AI"), (5, "全部渠道")]:
        r = roll(idx, n)
        vals = [v for _, v in r]
        last = r[-1]
        pct = sum(1 for v in vals if v < last[1]) / len(vals) * 100
        print(f"\n=== {n} 日滚动和 · {name}（{len(vals)} 个窗口）===")
        print(f"  当前窗口（截至 {last[0]}）= {last[1]}")
        print(f"  历史：均值 {statistics.mean(vals):.1f} · 中位 {statistics.median(vals)} "
              f"· 最小 {min(vals)} · 最大 {max(vals)} · 标准差 {statistics.pstdev(vals):.1f}")
        print(f"  相当于历史第 {pct:.0f} 百分位（越低越差）")
        if idx == 1 and n == 7:
            print("  最近 16 个窗口：")
            for dd, v in r[-16:]:
                print(f"    {dd}  {v:>4}  {'#' * int(v / max(vals) * 36)}")

print("\n=== 近 21 日逐日（AI / 搜索 / 直接 / 外链 / 合计）===")
for day, ai, se, di, re_, tot in series[-21:]:
    dt = datetime.strptime(day, "%Y-%m-%d")
    print(f"  {day} {'一二三四五六日'[dt.weekday()]}  AI={ai:>2}  搜索={se:>2}  "
          f"直接={di:>3}  外链={re_:>2}  合计={tot:>3}")

print("\n=== 分段汇总 ===")
segs = [("09-14~09-20", "2026-09-14", "2026-09-20"),
        ("09-21~09-27", "2026-09-21", "2026-09-27"),
        ("09-28~10-03", "2026-09-28", "2026-10-03")]
for name, a, b in segs:
    c = collections.Counter()
    nd = 0
    for day, ai, se, di, re_, tot in series:
        if a <= day <= b:
            c["AI"] += ai; c["Search"] += se; c["Direct"] += di
            c["Referral"] += re_; c["tot"] += tot; nd += 1
    print(f"  {name}（{nd} 天）：AI={c['AI']}（{c['AI']/nd:.1f}/天）  搜索={c['Search']}（{c['Search']/nd:.1f}/天）  "
          f"直接={c['Direct']}（{c['Direct']/nd:.1f}/天）  外链={c['Referral']}  合计={c['tot']}（{c['tot']/nd:.1f}/天）  "
          f"AI 占比={c['AI']/c['tot']*100:.1f}%")

# 只看工作日周二~周五，消除周末效应
print("\n=== 仅周二~周五（消除周末效应）===")
wk = collections.defaultdict(collections.Counter)
for day, ai, se, di, re_, tot in series:
    dt = datetime.strptime(day, "%Y-%m-%d")
    if dt.weekday() in (1, 2, 3, 4):
        wk[day[:7] + "-" + day[5:7]][0] += 0
        wk[day[:10]][0] = 0
        wk[day] = collections.Counter(AI=ai, Search=se, Direct=di, Referral=re_, tot=tot)
for day in sorted(wk)[-18:]:
    c = wk[day]
    print(f"  {day}  AI={c['AI']:>2}  搜索={c['Search']:>2}  直接={c['Direct']:>3}  合计={c['tot']:>3}")
