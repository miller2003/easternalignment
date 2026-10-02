"""解读师页专项:切换行为/点击后行为分析(基于 rd_clicks 明细 + sep_attribution)。"""
import json
import os
from collections import defaultdict
from datetime import datetime

WS = r"C:\Users\samja\Desktop\site\easternalignment"
RES = os.path.join(WS, "posthog_analysis", "results")

def load(n):
    d = json.load(open(os.path.join(RES, n + ".json"), encoding="utf-8"))
    return [dict(zip(d["columns"], r)) for r in d["results"]]

clicks = load("rd_clicks")
person_sess = load("rd_person_sessions")
post = load("rd_postclick")[0]
rsum = load("rd_review_summary")[0]
vsum = load("rd_visit_summary")[0]
attr = json.load(open(os.path.join(RES, "sep_attribution.json"), encoding="utf-8"))
csv = json.load(open(os.path.join(RES, "sep_csv.json"), encoding="utf-8"))

def plat_of(slug):
    s = (slug or "").lower()
    if "kasamba" in s: return "Kasamba"
    if "keen" in s: return "Keen"
    if "purple" in s or "psiquicos" in s: return "PurpleGarden/psi"
    return "other"

# ---- 同会话切换分析(评测页点击,47 条) ----
by_sid = defaultdict(list)
for c in clicks:
    by_sid[c["sid"]].append(c)

switch_sessions = 0
diff_slug_sessions = 0
same_plat_switch = 0
cross_plat_switch = 0
gaps = []
fast_switch = 0  # 距上次点击 <3 分钟且换 slug
switch_examples = []
for sid, cl in by_sid.items():
    cl.sort(key=lambda x: x["timestamp"])
    slugs = [c["slug"] for c in cl]
    if len(cl) >= 2:
        switch_sessions += 1
        if len(set(slugs)) >= 2:
            diff_slug_sessions += 1
            ts = [datetime.fromisoformat(c["timestamp"]) for c in cl]
            for a, b, ca, cb in zip(ts, ts[1:], cl, cl[1:]):
                g = (b - a).total_seconds()
                if ca["slug"] != cb["slug"]:
                    gaps.append(g)
                    if g <= 180:
                        fast_switch += 1
                    if plat_of(ca["slug"]) == plat_of(cb["slug"]):
                        same_plat_switch += 1
                    else:
                        cross_plat_switch += 1
            switch_examples.append({
                "sid": sid[:8], "n": len(cl),
                "seq": [(c["timestamp"][5:16], c["loc"], c["slug"], c["cta"],
                         f"{int(c['decision_ms'] or 0)/1000:.0f}s",
                         (f"{(datetime.fromisoformat(cl[i+1]['timestamp']) - datetime.fromisoformat(c['timestamp'])).total_seconds():.0f}s→next"
                          if i + 1 < len(cl) else "末次"))
                        for i, c in enumerate(cl)],
            })
        else:
            same_plat_switch += 0

print("== 评测页点击总况 ==")
print(json.dumps(rsum, ensure_ascii=False))
print("== 会话触达评测页 ==")
print(json.dumps(vsum, ensure_ascii=False))
print("== 点击后站内行为 ==")
print(json.dumps(post, ensure_ascii=False))

print("\n== 同会话切换 ==")
print(f"评测页点击会话数: {len(by_sid)}")
print(f"其中 ≥2 次点击: {switch_sessions} ({switch_sessions/len(by_sid)*100:.0f}%)")
print(f"其中点了 ≥2 个不同解读师 slug: {diff_slug_sessions} ({diff_slug_sessions/max(len(by_sid),1)*100:.0f}%)")
if gaps:
    gaps.sort()
    print(f"换人点击间隔: 中位 {gaps[len(gaps)//2]:.0f}s / 最短 {gaps[0]:.0f}s / 最长 {gaps[-1]:.0f}s (n={len(gaps)})")
print(f"同平台换人: {same_plat_switch} 次 / 跨平台换人: {cross_plat_switch} 次 / 3分钟内快速换人: {fast_switch} 次")

print("\n== 切换会话示例 ==")
for e in switch_examples[:8]:
    print(json.dumps(e, ensure_ascii=False))

# ---- 点击人回访 ----
multi = [p for p in person_sess if p["sessions"] > p["clicked_sess"]]
print("\n== 点击用户回访 ==")
print(f"点击用户总数: {len(person_sess)}")
print(f"其中有点击会话之外的其他会话(回访/多会话): {len(multi)} ({len(multi)/len(person_sess)*100:.0f}%)")
dist = defaultdict(int)
for p in person_sess:
    dist[min(p["sessions"], 5)] += 1
print("按会话数分布(5+ 归一):", dict(sorted(dist.items())))

# ---- 评测页成交(归因) ----
print("\n== 评测页归因成交 ==")
for page, v in attr["by_page"].items():
    if "/reviews/" in page:
        print(f"  {page}: {v['sales']}单 ${v['payout']:.0f}")
rev_clicks = rsum["clicks"]; rev_clickers = rsum["clickers"]
rev_sales = sum(v["sales"] for p, v in attr["by_page"].items() if "/reviews/" in p)
rev_rev = sum(v["payout"] for p, v in attr["by_page"].items() if "/reviews/" in p)
print(f"评测页点击 {rev_clicks} / 点击用户 {rev_clickers} → 归因成交 {rev_sales} 单 ${rev_rev:.0f} "
      f"(点击→付费 {rev_sales/max(rev_clickers,1)*100:.1f}%)")

# ---- 只注册不付费(后台) ----
print("\n== 注册未付费(9 月 CSV)==")
for s in csv["signup_without_sale_in_csv"]:
    print(f"  {s['platform']:9s} {s['country']:15s} {s['signup']}")
