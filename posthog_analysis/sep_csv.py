"""解析 barges getConversions CSV(2026-09 月度报表)。
口径:ad_id 视同交易主键(lead→sale 两阶段共享同一 ad_id,计 1 个客户);
金额以 Stat.payout 为准,合计行(无时间戳)仅作校验。
"""
import csv
import json
import os
from collections import defaultdict

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
SRC = r"C:\Users\samja\Downloads\getConversions_5a8bdab6568c5bf4da4889fc085dacb4_20261001.csv"

PLATFORM = {
    "Purple Garden Web English": "PurpleGarden",
    "Keen -Tarot Reading EN": "Keen",
    "Keen Web - Main Offer": "Keen",
    "Kasamba Web ": "Kasamba",
    "Kasamba Web": "Kasamba",
}

rows = []
with open(SRC, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        if not r["Stat.datetime"].strip():
            continue  # 合计行
        rows.append({
            "datetime": r["Stat.datetime"],  # 后台时间=东八区
            "offer": r["Offer.name"].strip(),
            "platform": PLATFORM.get(r["Offer.name"].strip(), r["Offer.name"].strip()),
            "goal": r["Goal.name"].strip(),  # Signup / First Purchase
            "country": r["Country.name"].strip(),
            "browser": r["Browser.display_name"].strip(),
            "status": r["Stat.conversion_status"].strip(),
            "payout": float(r["Stat.payout"]),
            "ad_id": r["Stat.ad_id"].strip(),
            "offer_id": r["Stat.offer_id"].strip(),
        })

# 按 ad_id 聚合客户旅程
journeys = defaultdict(list)
for r in rows:
    journeys[r["ad_id"]].append(r)
for j in journeys.values():
    j.sort(key=lambda x: x["datetime"])

summary = {
    "rows": len(rows),
    "signup_rows": sum(1 for r in rows if r["goal"] == "Signup"),
    "sale_rows": sum(1 for r in rows if r["goal"] == "First Purchase"),
    "unique_customers": len(journeys),
    "gross_payout": round(sum(r["payout"] for r in rows), 2),
    "by_platform": {},
    "by_country": defaultdict(lambda: {"signups": 0, "sales": 0, "payout": 0.0}),
    "by_device": defaultdict(lambda: {"signups": 0, "sales": 0, "payout": 0.0}),
    "by_day": defaultdict(lambda: {"signups": 0, "sales": 0, "payout": 0.0}),
}

for r in rows:
    d = r["datetime"][:10]
    k = "sales" if r["goal"] == "First Purchase" else "signups"
    summary["by_day"][d][k] += 1
    summary["by_day"][d]["payout"] += r["payout"]
    summary["by_country"][r["country"]][k] += 1
    summary["by_country"][r["country"]]["payout"] += r["payout"]
    summary["by_device"][r["browser"]][k] += 1
    summary["by_device"][r["browser"]]["payout"] += r["payout"]

plat = defaultdict(lambda: {"signups": 0, "sales": 0, "payout": 0.0,
                            "customers": set(), "upgraded": set()})
for ad_id, j in journeys.items():
    p = j[0]["platform"]
    plat[p]["customers"].add(ad_id)
    if any(x["goal"] == "First Purchase" for x in j):
        plat[p]["upgraded"].add(ad_id)
for r in rows:
    p = r["platform"]
    k = "sales" if r["goal"] == "First Purchase" else "signups"
    plat[p][k] += 1
    plat[p]["payout"] += r["payout"]
for p, v in plat.items():
    summary["by_platform"][p] = {
        "signups": v["signups"], "sales": v["sales"],
        "payout": round(v["payout"], 2),
        "customers_in_csv": len(v["customers"]),
        "upgraded_in_csv": len(v["upgraded"]),
    }

# 升级滞后(小时):Signup -> First Purchase 同一 ad_id
lags = []
for ad_id, j in journeys.items():
    su = [x for x in j if x["goal"] == "Signup"]
    fp = [x for x in j if x["goal"] == "First Purchase"]
    if su and fp:
        from datetime import datetime
        t0 = datetime.strptime(su[0]["datetime"], "%Y-%m-%d %H:%M:%S")
        t1 = datetime.strptime(fp[0]["datetime"], "%Y-%m-%d %H:%M:%S")
        lags.append({"ad_id": ad_id, "platform": j[0]["platform"],
                     "country": su[0]["country"], "browser": su[0]["browser"],
                     "signup": su[0]["datetime"], "purchase": fp[0]["datetime"],
                     "lag_hours": round((t1 - t0).total_seconds() / 3600, 2)})
summary["upgrade_lags"] = lags

# 9 月内付费但注册发生在 9 月前(或未见注册行)的客户
summary["sale_without_signup_in_csv"] = [
    {"ad_id": a, "platform": j[0]["platform"], "country": j[0]["country"],
     "purchase": [x["datetime"] for x in j if x["goal"] == "First Purchase"][0],
     "payout": sum(x["payout"] for x in j)}
    for a, j in journeys.items()
    if any(x["goal"] == "First Purchase" for x in j)
    and not any(x["goal"] == "Signup" for x in j)
]
# 9 月内注册但 CSV 内未见付费
summary["signup_without_sale_in_csv"] = [
    {"ad_id": a, "platform": j[0]["platform"], "country": j[0]["country"],
     "signup": j[0]["datetime"]}
    for a, j in journeys.items()
    if any(x["goal"] == "Signup" for x in j)
    and not any(x["goal"] == "First Purchase" for x in j)
]

for k in ("by_country", "by_device", "by_day"):
    summary[k] = dict(sorted(summary[k].items(),
                             key=lambda kv: kv[1]["payout"] if k != "by_day" else kv[0],
                             reverse=(k != "by_day")))

p = os.path.join(OUT, "sep_csv.json")
with open(p, "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in summary.items()
                  if k not in ("by_day", "by_country", "by_device")},
                 ensure_ascii=False, indent=1)[:3000])
