# -*- coding: utf-8 -*-
"""Organic Growth Brief builder - Senior SEO/Organic Growth Analyst output.
3-page A4 brief for Matthew Tenney. Principles: analyst prepares data, strategist decides.
No generic SEO advice. No tactics unless data-supported. Minimal reading time.
"""
import base64
import io
import json
import os
import re

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

SRC = r"C:\Users\samja\Desktop\easternalignment.com-Performance-on-Search-2026-08-25"
OUT = r"C:\Users\samja\Desktop\site\easternalignment\scratch\gsc_matthew"
os.makedirs(OUT, exist_ok=True)

plt.rcParams.update({
    "figure.facecolor": "white", "axes.facecolor": "white",
    "axes.edgecolor": "#d7dce3", "axes.grid": True,
    "grid.color": "#eef1f4", "grid.linewidth": 0.7,
    "font.family": "DejaVu Sans", "font.size": 8.5,
    "axes.titlesize": 10, "axes.titleweight": "bold",
    "axes.labelcolor": "#3b4351", "text.color": "#1f2733",
    "xtick.color": "#5a6472", "ytick.color": "#5a6472",
})
NAVY = "#1b2a4a"
BLUE = "#2f6fed"
LBLUE = "#a9c2f5"
RED = "#d64545"
GREEN = "#1e9e6a"
GRAY = "#9aa3af"


def fig_b64(fig, dpi=160):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def pct(x):
    s = str(x).replace("%", "").strip()
    return float(s) if s not in ("", "nan") else 0.0


def load(name):
    df = pd.read_csv(os.path.join(SRC, name), encoding="utf-8")
    df.columns = ["key", "clicks", "impressions", "ctr", "position"]
    df["ctr"] = df["ctr"].map(pct)
    df["position"] = pd.to_numeric(df["position"], errors="coerce")
    df["clicks"] = pd.to_numeric(df["clicks"], errors="coerce").fillna(0).astype(int)
    df["impressions"] = pd.to_numeric(df["impressions"], errors="coerce").fillna(0).astype(int)
    return df


dates = load("图表.csv").rename(columns={"key": "date"})
dates["date"] = pd.to_datetime(dates["date"])
queries = load("查询数.csv").rename(columns={"key": "query"})
pages = load("网页.csv").rename(columns={"key": "page"})
countries = load("国家_地区.csv").rename(columns={"key": "country"})
devices = load("设备.csv").rename(columns={"key": "device"})

DMAX = dates["date"].max()  # 2026-08-22


def win(end, days):
    return dates[(dates["date"] > end - pd.Timedelta(days=days)) & (dates["date"] <= end)]


def agg(df):
    c, i = int(df["clicks"].sum()), int(df["impressions"].sum())
    wp = (df["impressions"] * df["position"]).sum() / i if i else np.nan
    return {"clicks": c, "impressions": i, "ctr": round(100 * c / i, 2) if i else 0, "wpos": round(wp, 1) if i else np.nan}


# ---- trend windows ----
last28 = agg(win(DMAX, 28))
prev28 = agg(win(DMAX - pd.Timedelta(days=28), 28))
last45 = agg(win(DMAX, 45))
prev45 = agg(win(DMAX - pd.Timedelta(days=45), 45))
total = agg(dates)


def growth(a, b, k):
    if not b[k]:
        return None
    return round(100 * (a[k] - b[k]) / b[k])


g28 = {"imp": growth(last28, prev28, "impressions"), "clk": growth(last28, prev28, "clicks")}
g45 = {"imp": growth(last45, prev45, "impressions"), "clk": growth(last45, prev45, "clicks")}

# ---- 4-way intent classification ----
BRAND_RE = r"easternalignment|keen|kasamba|karamba|kassamba|kasmba|kasamb|wazamba|purple ?garden|purplegarden"
PROB_RE = r"scam|fake|fraud|anxiety|cheat|curse|didn'?t come true|warning|red flag|worried|scared"
COMM_RE = r"best|top|review|legit|vs\.? |comparison|compare|cheap|free|affordable|\$1|\$5|1\.99|promo|coupon|deal|discount|app|hotline|price|pricing|cost|worth|accurate"


def intent4(q):
    ql = q.lower()
    if re.search(BRAND_RE, ql):
        return "Brand / navigational"
    if re.search(PROB_RE, ql):
        return "Problem / pain-point"
    if re.search(COMM_RE, ql):
        return "Commercial"
    return "Informational"


queries["intent4"] = queries["query"].map(intent4)
i4 = queries.groupby("intent4").agg(
    n=("query", "count"), clicks=("clicks", "sum"), impressions=("impressions", "sum"),
).reset_index()
i4["ctr"] = (100 * i4["clicks"] / i4["impressions"].replace(0, np.nan)).round(2)
wpos = []
for _, r in i4.iterrows():
    sub = queries[queries["intent4"] == r["intent4"]]
    wpos.append(round(np.average(sub["position"], weights=sub["impressions"]), 1) if sub["impressions"].sum() else np.nan)
i4["wpos"] = wpos
ORDER4 = ["Commercial", "Brand / navigational", "Problem / pain-point", "Informational"]
i4["o"] = i4["intent4"].map({k: i for i, k in enumerate(ORDER4)})
i4 = i4.sort_values("o").drop(columns="o")

# ---- topic clusters ----
def cluster(q):
    ql = q.lower()
    if "easternalignment" in ql:
        return "Own brand (easternalignment)"
    if "keen" in ql:
        return "Keen platform & readers"
    if re.search(r"kasamba|karamba|kassamba|kasmba|kasamb|wazamba", ql):
        return "Kasamba platform & readers"
    if re.search(r"purple ?garden|purplegarden|purple psychic", ql):
        return "Purple Garden"
    if re.search(r"mediumship|\bmedium|mediums\b|deceased|passed away", ql):
        return "Mediumship"
    if "tarot" in ql:
        return "Tarot"
    if re.search(r"scam|fake|fraud|\blegit\b|\breal\b|trustpilot|reddit|lawsuit|honest|complaint", ql):
        return "Trust, legitimacy & scam concerns"
    if re.search(r"aquarius|scorpio|capricorn|sagittarius|gemini|pisces|\bleo\b|taurus|cancer|aries|libra|virgo|zodiac|horoscope|star sign|angel number|compatibility|\b333\b|\b222\b", ql):
        return "Astrology & compatibility"
    if re.search(r"love|relationship|soulmate|twin ?flame|\bex\b|marriage|marry|breakup|crush|spouse|fianc|divorce|dating|partner|reunite", ql):
        return "Love & relationship readings"
    if re.search(r"\bfree\b|cheap|affordable|\$1|\$5|1\.99", ql):
        return "Free & low-cost readings"
    if re.search(r"what is|what are|how to|how do|how does|meaning|definition|define|learn|types of|prepare|guide", ql):
        return "Psychic basics (how-it-works)"
    return "Generic psychic services"


queries["cluster"] = queries["query"].map(cluster)
cl = queries.groupby("cluster").agg(n=("query", "count"), clicks=("clicks", "sum"), impressions=("impressions", "sum")).reset_index()
cl["ctr"] = (100 * cl["clicks"] / cl["impressions"].replace(0, np.nan)).round(2)
wpos = []
for _, r in cl.iterrows():
    sub = queries[queries["cluster"] == r["cluster"]]
    wpos.append(round(np.average(sub["position"], weights=sub["impressions"]), 1) if sub["impressions"].sum() else np.nan)
cl["wpos"] = wpos
cl = cl.sort_values("impressions", ascending=False)

CI = {  # commercial intent judgement
    "Keen platform & readers": "High", "Kasamba platform & readers": "High", "Purple Garden": "High",
    "Love & relationship readings": "High", "Mediumship": "High",
    "Free & low-cost readings": "High",
    "Trust, legitimacy & scam concerns": "Med-High",
    "Generic psychic services": "Medium", "Tarot": "Medium",
    "Psychic basics (how-it-works)": "Low", "Astrology & compatibility": "Low",
    "Own brand (easternalignment)": "-",
}
COV = {  # current content coverage judgement
    "Keen platform & readers": "Deep - 50 pages",
    "Kasamba platform & readers": "Deep - 36 pages",
    "Purple Garden": "Growing - 31 pages, launched Aug",
    "Love & relationship readings": "Deep - 20+ guides + reader pages",
    "Mediumship": "Light - 2-3 guides",
    "Free & low-cost readings": "Medium - pricing guides + offers",
    "Trust, legitimacy & scam concerns": "Light - 1 pillar + few guides",
    "Generic psychic services": "Medium",
    "Tarot": "Deep - tools + guides",
    "Psychic basics (how-it-works)": "Medium",
    "Astrology & compatibility": "Deep - 26+ pages",
    "Own brand (easternalignment)": "-",
}
cl["ci"] = cl["cluster"].map(CI)
cl["cov"] = cl["cluster"].map(COV)

# ---- opportunity tiers ----
qw = queries[(queries["position"] >= 4) & (queries["position"] <= 20) & (queries["impressions"] >= 15)].sort_values("impressions", ascending=False).head(8)
em = queries[(queries["position"] > 20) & (queries["position"] <= 50) & (queries["impressions"] >= 20)].sort_values("impressions", ascending=False).head(8)
com_mask = queries["intent4"].isin(["Commercial", "Brand / navigational"])
unt = queries[com_mask & (queries["clicks"] == 0) & (queries["impressions"] >= 15)].sort_values("impressions", ascending=False).head(8)

# ---- page-level ----
pages_nohash = pages[~pages["page"].str.contains("#")].copy()
top6 = pages_nohash.nlargest(6, "clicks")
poor_ctr = pages_nohash[(pages_nohash["impressions"] >= 100) & (pages_nohash["position"] <= 20) & (pages_nohash["ctr"] < 1.0)].sort_values("impressions", ascending=False).head(5)
ranks_5_20 = pages_nohash[(pages_nohash["position"] >= 5) & (pages_nohash["position"] <= 20) & (pages_nohash["impressions"] >= 60)].sort_values("clicks", ascending=False).head(6)
zero_imp = pages_nohash[(pages_nohash["impressions"] >= 80) & (pages_nohash["clicks"] == 0)].sort_values("impressions", ascending=False).head(5)

urls_seen = len(pages)
www_leak = pages[pages["page"].str.contains("www\\.easternalignment")]
www_i, www_c = int(www_leak["impressions"].sum()), int(www_leak["clicks"].sum())

# ---- chart: compact daily trend ----
fig, ax1 = plt.subplots(figsize=(8.6, 2.5))
ax1.bar(dates["date"], dates["impressions"], color=LBLUE, width=0.85, zorder=2, label="Impressions")
ax1.set_ylabel("Impressions", fontsize=8)
ax1.set_ylim(0, dates["impressions"].max() * 1.25)
ax2 = ax1.twinx()
ax2.plot(dates["date"], dates["clicks"].rolling(7).mean(), color=RED, lw=1.8, label="Clicks (7-day avg)")
ax2.set_ylabel("Clicks", fontsize=8)
ax2.set_ylim(0, max(dates["clicks"].max() * 1.5, 6))
ax2.grid(False)
for d, lab in [("2026-04-16", "sandbox exit"), ("2026-07-15", "cluster breakout"), ("2026-08-20", "CTA overhaul +\nKasamba/PG clusters")]:
    dd = pd.Timestamp(d)
    ax1.axvline(dd, color=GRAY, ls="--", lw=0.8, alpha=0.7)
    ax1.annotate(lab, xy=(dd, ax1.get_ylim()[1] * 0.96), xytext=(3, 0), textcoords="offset points", fontsize=6.8, color="#5a6472", va="top")
ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
ax1.xaxis.set_major_locator(mdates.WeekdayLocator(interval=3))
h1, l1 = ax1.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
ax1.legend(h1 + h2, l1 + l2, loc="upper left", frameon=False, fontsize=7.5, ncol=2)
trend_b64 = fig_b64(fig)

# ---- chart: cluster map ----
clc = cl[cl["cluster"] != "Own brand (easternalignment)"].copy()
fig, ax = plt.subplots(figsize=(8.6, 2.9))
clc = clc.sort_values("impressions")
y = np.arange(len(clc))
cmap = {"High": BLUE, "Med-High": "#6f97f2", "Medium": LBLUE, "Low": "#d5deee", "-": GRAY}
ax.barh(y, clc["impressions"], color=[cmap[c] for c in clc["ci"]], height=0.62)
for i, (_, r) in enumerate(clc.iterrows()):
    ax.annotate(f" {int(r['impressions']):,} imp · {int(r['clicks'])} clicks · pos {r['wpos']:.0f}",
                (r["impressions"], i), va="center", fontsize=7, color="#3b4351")
ax.set_yticks(y)
ax.set_yticklabels(clc["cluster"], fontsize=8)
ax.set_xlim(0, clc["impressions"].max() * 1.42)
ax.set_title("Search demand by topic cluster (darker = higher commercial intent)", loc="left")
cluster_b64 = fig_b64(fig)

# ---- print verification ----
print("== windows ==")
print("last28", last28, "prev28", prev28, "g28", g28)
print("last45", last45, "prev45", prev45, "g45", g45)
print("total", total)
print("== intent4 ==")
print(i4.to_string(index=False))
print("== clusters ==")
print(cl.to_string(index=False))
print("== quick wins ==")
print(qw[["query", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== emerging ==")
print(em[["query", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== untapped ==")
print(unt[["query", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== top6 pages ==")
print(top6[["page", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== poor ctr ==")
print(poor_ctr[["page", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== ranks 5-20 ==")
print(ranks_5_20[["page", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== zero high-imp ==")
print(zero_imp[["page", "clicks", "impressions", "ctr", "position"]].to_string(index=False))
print("== meta ==", "urls_seen", urls_seen, "www", www_i, www_c)

payload = {
    "last28": last28, "prev28": prev28, "last45": last45, "prev45": prev45, "total": total,
    "g28": g28, "g45": g45,
    "i4": i4.to_dict("records"), "cl": cl.to_dict("records"),
    "qw": qw[["query", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "em": em[["query", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "unt": unt[["query", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "top6": top6[["page", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "poor_ctr": poor_ctr[["page", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "ranks": ranks_5_20[["page", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "zero": zero_imp[["page", "clicks", "impressions", "ctr", "position"]].to_dict("records"),
    "urls_seen": urls_seen, "www_i": www_i, "www_c": www_c,
    "trend": trend_b64, "cluster_img": cluster_b64,
}
with open(os.path.join(OUT, "brief_data.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(payload, f, ensure_ascii=False, default=str)
print("brief_data.json OK")
