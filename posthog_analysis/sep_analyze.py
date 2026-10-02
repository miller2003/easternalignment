"""9 月归因分析:CSV(barges)x PostHog 点击 x Order_Converted 三方对账。
产出 results/sep_attribution.json,供报告生成器消费。
"""
import json
import os
from collections import defaultdict
from datetime import datetime

WS = r"C:\Users\samja\Desktop\site\easternalignment"
RES = os.path.join(WS, "posthog_analysis", "results")

def load(n):
    d = json.load(open(os.path.join(RES, n + ".json"), encoding="utf-8"))
    return d["columns"], d["results"]

csv = json.load(open(os.path.join(RES, "sep_csv.json"), encoding="utf-8"))

ccols, conv = load("sep_conversions")
conv = [dict(zip(ccols, r)) for r in conv]
kcols, clicks = load("sep_click_details")
clicks = [dict(zip(kcols, r)) for r in clicks]

def chan_of(ref, utm):
    s = f"{ref} {utm}".lower()
    if any(k in s for k in ("chatgpt", "openai", "perplexity", "claude", "gemini",
                            "copilot", "kimi", "deepseek", "grok")):
        return "AI助手"
    if any(k in ref.lower() for k in ("google", "bing", "yahoo", "duckduckgo",
                                      "yandex", "ecosia")):
        return "搜索引擎"
    if ref in ("", "$direct"):
        return "直接访问"
    return "外链引荐"

# 索引点击:by token / by person
by_token = {c["token"]: c for c in clicks if c["token"]}
by_person = defaultdict(list)
for c in clicks:
    by_person[c["person"]].append(c)

# CSV sale 行索引
sales = []
for plat, v in csv["by_platform"].items():
    pass
# 从 upgrade_lags + sale_without_signup 重建 CSV sale 清单(带 txn=ad_id)
csv_sales = []
for lag in csv["upgrade_lags"]:
    csv_sales.append({"txn": lag["ad_id"], "platform": lag["platform"],
                      "country": lag["country"], "browser": lag["browser"],
                      "datetime": lag["purchase"], "payout": None,
                      "signup": lag["signup"], "lag_h": lag["lag_hours"]})
for s in csv["sale_without_signup_in_csv"]:
    csv_sales.append({"txn": s["ad_id"], "platform": s["platform"],
                      "country": s["country"], "browser": None,
                      "datetime": s["purchase"], "payout": s["payout"],
                      "signup": None, "lag_h": None})
# payout 补齐(Kasamba/PG=125, Keen=50)
for s in csv_sales:
    if s["payout"] is None:
        s["payout"] = 125.0 if s["platform"] in ("Kasamba", "PurpleGarden") else 50.0

ph_txn = {c["txn"]: c for c in conv}

journeys = []
for s in sorted(csv_sales, key=lambda x: x["datetime"]):
    ph = ph_txn.get(s["txn"])
    click = None
    via = None
    if ph:
        if ph["token"] and ph["token"] in by_token:
            click, via = by_token[ph["token"]], "token"
        elif ph["did"] in by_person:
            # 无 token:取该人该日前最近一次点击
            cands = [c for c in by_person[ph["did"]]
                     if c["loc"]]
            if cands:
                click, via = cands[-1], "person"
    j = {"txn": s["txn"], "platform": s["platform"], "country": s["country"],
         "sale_time": s["datetime"], "payout": s["payout"],
         "signup": s["signup"], "lag_h": s["lag_h"],
         "in_posthog": bool(ph)}
    if click:
        j.update({
            "attributed": True, "via": via,
            "page": click["loc"], "cta": click["cta"], "slug": click["slug"],
            "ptype": click["ptype"], "decision_s": round(int(click["decision_ms"] or 0) / 1000, 1),
            "click_time": click["timestamp"][:19].replace("T", " "),
            "channel": chan_of(click["ref"], click["utm"]),
            "ref": click["ref"], "entry": click["entry"],
            "device": click["device"], "click_cc": click["cc"],
            "click_seq": click["click_seq"], "pages_before": click["pages_before"],
        })
        # 点击->付费滞后
        t0 = datetime.strptime(j["click_time"], "%Y-%m-%d %H:%M:%S")
        t1 = datetime.strptime(s["datetime"], "%Y-%m-%d %H:%M:%S")
        j["click_to_sale_h"] = round((t1 - t0).total_seconds() / 3600, 2)
    else:
        j.update({"attributed": False, "via": None})
    journeys.append(j)

# 汇总:按页 / 渠道 / CTA 的成交分布(可归因部分)
def agg(key):
    out = defaultdict(lambda: {"sales": 0, "payout": 0.0})
    for j in journeys:
        if j.get("attributed"):
            k = j.get(key) or "(unknown)"
            out[k]["sales"] += 1
            out[k]["payout"] += j["payout"]
    return dict(sorted(out.items(), key=lambda kv: -kv[1]["payout"]))

result = {
    "journeys": journeys,
    "attributed_sales": sum(1 for j in journeys if j.get("attributed")),
    "sales_in_posthog": sum(1 for j in journeys if j["in_posthog"]),
    "sales_total": len(journeys),
    "by_page": agg("page"),
    "by_channel": agg("channel"),
    "by_cta": agg("cta"),
    "by_slug": agg("slug"),
}
p = os.path.join(RES, "sep_attribution.json")
json.dump(result, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"sales={result['sales_total']} in_posthog={result['sales_in_posthog']} "
      f"attributed={result['attributed_sales']}")
print("\n== journeys ==")
for j in journeys:
    print(json.dumps(j, ensure_ascii=False))
print("\n== by_page ==", json.dumps(result["by_page"], ensure_ascii=False))
print("== by_channel ==", json.dumps(result["by_channel"], ensure_ascii=False))
print("== by_cta ==", json.dumps(result["by_cta"], ensure_ascii=False))
print("== by_slug ==", json.dumps(result["by_slug"], ensure_ascii=False))
