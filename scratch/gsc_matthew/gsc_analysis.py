# -*- coding: utf-8 -*-
"""GSC data processing for easternalignment.com -> Matthew SEO review pack.
Reads the 6-month GSC export (Chinese-locale CSVs), computes aggregates,
opportunity lists, and renders charts as base64 PNGs for a self-contained HTML report.
"""
import base64
import io
import json
import os
import re
from urllib.parse import urlsplit

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np

SRC = r"C:\Users\samja\Desktop\easternalignment.com-Performance-on-Search-2026-08-25"
OUT = r"C:\Users\samja\Desktop\site\easternalignment\scratch\gsc_matthew"
os.makedirs(OUT, exist_ok=True)

# ---------- style ----------
plt.rcParams.update({
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "axes.edgecolor": "#d0d5dd",
    "axes.grid": True,
    "grid.color": "#eef1f5",
    "grid.linewidth": 0.8,
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "axes.labelcolor": "#344054",
    "text.color": "#1d2939",
    "xtick.color": "#475467",
    "ytick.color": "#475467",
})
INK = "#4a3aff"      # primary indigo
INK2 = "#9d94ff"
ACCENT = "#e0447c"   # magenta accent
GREEN = "#12b76a"
AMBER = "#f79009"
GRAY = "#98a2b3"


def fig_to_b64(fig, dpi=150):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def pct(x):
    s = str(x).replace("%", "").strip()
    return float(s) if s not in ("", "nan") else 0.0


# ---------- load ----------
def load(name, key_col):
    df = pd.read_csv(os.path.join(SRC, name), encoding="utf-8")
    df.columns = ["key", "clicks", "impressions", "ctr", "position"]
    df["ctr"] = df["ctr"].map(pct)
    df["position"] = pd.to_numeric(df["position"], errors="coerce")
    df["clicks"] = pd.to_numeric(df["clicks"], errors="coerce").fillna(0).astype(int)
    df["impressions"] = pd.to_numeric(df["impressions"], errors="coerce").fillna(0).astype(int)
    return df

dates = load("图表.csv", "日期")
dates = dates.rename(columns={"key": "date"})
dates["date"] = pd.to_datetime(dates["date"])

queries = load("查询数.csv", "热门查询").rename(columns={"key": "query"})
pages = load("网页.csv", "排名靠前的网页").rename(columns={"key": "page"})
countries = load("国家_地区.csv", "国家/地区").rename(columns={"key": "country"})
devices = load("设备.csv", "设备").rename(columns={"key": "device"})

summary = {}

# ---------- overall ----------
total_clicks = int(dates["clicks"].sum())
total_impr = int(dates["impressions"].sum())
summary["total"] = {
    "clicks": total_clicks,
    "impressions": total_impr,
    "ctr": round(100 * total_clicks / total_impr, 2),
    "range": f"{dates['date'].min():%b %d, %Y} - {dates['date'].max():%b %d, %Y}",
}

# last 28 vs previous 28
dmax = dates["date"].max()
last28 = dates[dates["date"] > dmax - pd.Timedelta(days=28)]
prev28 = dates[(dates["date"] > dmax - pd.Timedelta(days=56)) & (dates["date"] <= dmax - pd.Timedelta(days=28))]
summary["last28"] = {
    "clicks": int(last28["clicks"].sum()), "impressions": int(last28["impressions"].sum()),
}
summary["prev28"] = {
    "clicks": int(prev28["clicks"].sum()), "impressions": int(prev28["impressions"].sum()),
}
summary["wow"] = {
    "clicks_growth": round(100 * (summary["last28"]["clicks"] - summary["prev28"]["clicks"]) / max(summary["prev28"]["clicks"], 1), 1),
    "impr_growth": round(100 * (summary["last28"]["impressions"] - summary["prev28"]["impressions"]) / max(summary["prev28"]["impressions"], 1), 1),
}
# avg position (impression-weighted) per period
def wpos(df):
    w = df["impressions"] * df["position"]
    return round(w.sum() / max(df["impressions"].sum(), 1), 1)
summary["last28"]["wpos"] = wpos(last28)
summary["prev28"]["wpos"] = wpos(prev28)
summary["last28"]["ctr"] = round(100 * summary["last28"]["clicks"] / max(summary["last28"]["impressions"], 1), 2)
summary["prev28"]["ctr"] = round(100 * summary["prev28"]["clicks"] / max(summary["prev28"]["impressions"], 1), 2)

# monthly
dates["month"] = dates["date"].dt.to_period("M").astype(str)
monthly = dates.groupby("month").agg(clicks=("clicks", "sum"), impressions=("impressions", "sum")).reset_index()
monthly["ctr"] = (100 * monthly["clicks"] / monthly["impressions"].replace(0, np.nan)).round(2)
summary["monthly"] = monthly.to_dict("records")

# ---------- chart 1: daily trend ----------
fig, ax1 = plt.subplots(figsize=(11, 4.4))
ax1.bar(dates["date"], dates["impressions"], color=INK2, width=0.85, label="Impressions (daily)", zorder=2)
ax1.set_ylabel("Impressions")
ax1.set_ylim(0, dates["impressions"].max() * 1.22)
ax2 = ax1.twinx()
ax2.plot(dates["date"], dates["clicks"].rolling(7).mean(), color=ACCENT, lw=2.2, label="Clicks (7-day avg)", zorder=3)
ax2.scatter(dates["date"], dates["clicks"], color=ACCENT, s=6, alpha=0.35, zorder=3)
ax2.set_ylabel("Clicks")
ax2.set_ylim(0, max(dates["clicks"].max() * 1.35, 6))
ax2.grid(False)
# events
events = [
    ("2026-04-16", "Site exits\nGoogle sandbox", 0),
    ("2026-07-15", "Impression breakout\n(cluster expansion)", 1),
    ("2026-08-20", "CTA overhaul +\nKasamba/PG clusters", 1),
]
for d, label, up in events:
    dd = pd.Timestamp(d)
    ax1.axvline(dd, color=GRAY, ls="--", lw=1, alpha=0.7)
    ax1.annotate(label, xy=(dd, ax1.get_ylim()[1] * 0.97), xytext=(4, 0),
                 textcoords="offset points", fontsize=8, color="#475467", va="top")
ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
ax1.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
h1, l1 = ax1.get_legend_handles_labels()
h2, l2 = ax2.get_legend_handles_labels()
ax1.legend(h1 + h2, l1 + l2, loc="upper left", frameon=False, fontsize=9)
ax1.set_title("Daily clicks & impressions - past 6 months (Google Search, Web)")
b64_trend = fig_to_b64(fig)

# ---------- chart 2: monthly bars ----------
fig, ax = plt.subplots(figsize=(7.6, 3.8))
x = np.arange(len(monthly))
ax.bar(x - 0.19, monthly["impressions"], width=0.38, color=INK2, label="Impressions")
ax2 = ax.twinx()
ax2.bar(x + 0.19, monthly["clicks"], width=0.38, color=ACCENT, label="Clicks")
ax2.grid(False)
labels = [pd.Period(m).strftime("%b") + ("*" if m in ("2026-04", "2026-08") else "") for m in monthly["month"]]
ax.set_xticks(x); ax.set_xticklabels(labels)
for i, r in monthly.iterrows():
    ax2.annotate(f"{int(r['clicks'])}", (x[i] + 0.19, r["clicks"]), textcoords="offset points",
                 xytext=(0, 3), ha="center", fontsize=9, color=ACCENT, fontweight="bold")
    ax.annotate(f"{int(r['impressions']):,}", (x[i] - 0.19, r["impressions"]), textcoords="offset points",
                xytext=(0, 3), ha="center", fontsize=8, color="#475467")
ax.set_ylim(0, monthly["impressions"].max() * 1.22)
ax2.set_ylim(0, monthly["clicks"].max() * 1.28)
ax.set_title("Monthly totals  (* partial months: Apr from 15th, Aug through 22nd)")
h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc="upper left", frameon=False, fontsize=9, ncol=2)
b64_monthly = fig_to_b64(fig)

# ---------- queries: intent grouping ----------
def intent(q):
    ql = q.lower()
    if re.search(r"kasamba|karamba|kassamba|kasmba|kasamb|wazamba", ql):
        return "Kasamba brand"
    if re.search(r"purple ?garden|purplegarden|purple psychic", ql):
        return "Purple Garden brand"
    if "keen" in ql:
        return "Keen brand"
    if re.search(r"aquarius|scorpio|capricorn|sagittarius|gemini|pisces|leo|taurus|cancer|aries|libra|virgo|zodiac|horoscope|star sign|angel number|333|222", ql):
        return "Astrology / compatibility"
    if "tarot" in ql:
        return "Tarot"
    if re.search(r"\bfree\b|\$1|\$5|cheap|affordable|1\.99", ql):
        return "Free / cheap seeking"
    if re.search(r"love|relationship|soulmate|twin ?flame|\bex\b|marriage|marry|breakup|break-up|crush|spouse|fianc|divorce|dating|partner|reunite", ql):
        return "Love & relationships"
    if re.search(r"what is|what are|how to|how do|how does|meaning|definition|define|learn|guide", ql):
        return "Informational"
    if re.search(r"review|legit|scam|real|fake|trustpilot|reddit|complaint|lawsuit", ql):
        return "Reputation / trust"
    if re.search(r"medium|deceased|passed away|pet|dream|spiritual|spirit|psychic anxiety|pregnancy|career|money|finance", ql):
        return "Topical niches"
    return "Generic psychic"

queries["intent"] = queries["query"].map(intent)
intent_agg = queries.groupby("intent").agg(
    clicks=("clicks", "sum"), impressions=("impressions", "sum"),
    n=("query", "count"),
    wpos=("position", lambda s: np.average(s, weights=queries.loc[s.index, "impressions"]) if queries.loc[s.index, "impressions"].sum() else np.nan),
).reset_index().sort_values("impressions", ascending=False)
intent_agg["ctr"] = (100 * intent_agg["clicks"] / intent_agg["impressions"].replace(0, np.nan)).round(2)
intent_agg["wpos"] = intent_agg["wpos"].round(1)
summary["intent"] = intent_agg.to_dict("records")

# ---------- chart 3: intent mix ----------
fig, ax = plt.subplots(figsize=(9.2, 4.2))
ia = intent_agg.sort_values("impressions")
y = np.arange(len(ia))
ax.barh(y + 0.19, ia["impressions"], height=0.38, color=INK2, label="Impressions")
ax2 = ax.twiny()
ax2.barh(y - 0.19, ia["clicks"], height=0.38, color=ACCENT, label="Clicks")
ax2.grid(False)
ax.set_yticks(y); ax.set_yticklabels(ia["intent"])
for i, (_, r) in enumerate(ia.iterrows()):
    ax.annotate(f" {int(r['impressions']):,}", (r["impressions"], y[i] + 0.19), va="center", fontsize=8, color="#475467")
    if r["clicks"] > 0:
        ax2.annotate(f"{int(r['clicks'])} ", (r["clicks"], y[i] - 0.19), va="center", ha="right", fontsize=8, color="white", fontweight="bold")
ax.set_title("Query intent mix - impressions vs clicks (6 months)")
h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc="lower right", frameon=False, fontsize=9)
ax.set_xlim(0, ia["impressions"].max() * 1.18)
ax2.set_xlim(0, max(ia["clicks"].max() * 2.4, 10))
b64_intent = fig_to_b64(fig)

# ---------- top queries ----------
top_q_clicks = queries.nlargest(15, "clicks")[["query", "clicks", "impressions", "ctr", "position"]]
top_q_impr = queries.nlargest(15, "impressions")[["query", "clicks", "impressions", "ctr", "position"]]
summary["top_q_clicks"] = top_q_clicks.to_dict("records")
summary["top_q_impr"] = top_q_impr.to_dict("records")

# ---------- chart 4: top queries by clicks ----------
fig, ax = plt.subplots(figsize=(9.2, 4.6))
tq = top_q_clicks.iloc[::-1]
labels = [q if len(q) <= 44 else q[:41] + "..." for q in tq["query"]]
colors = [ACCENT if c > 0 else GRAY for c in tq["clicks"]]
ax.barh(labels, tq["clicks"], color=INK)
for i, (_, r) in enumerate(tq.iterrows()):
    ax.annotate(f" {int(r['clicks'])} clicks · {int(r['impressions']):,} imp · pos {r['position']:.1f}",
                (r["clicks"], i), va="center", fontsize=8, color="#475467")
ax.set_title("Top 15 queries by clicks")
ax.set_xlim(0, tq["clicks"].max() * 3.6)
b64_topq = fig_to_b64(fig)

# ---------- page grouping ----------
def page_group(u):
    p = urlsplit(u).path
    if p.startswith("/reviews/keen"):
        return "/reviews/keen (platform + 49 readers)"
    if p.startswith("/reviews/kasamba"):
        return "/reviews/kasamba (platform + 35 readers)"
    if p.startswith("/reviews/purple-garden"):
        return "/reviews/purple-garden (platform + 30 readers)"
    if p.startswith("/reviews/flora"):
        return "/reviews/keen (platform + 49 readers)"
    if p.startswith("/guides"):
        return "/guides (78 buying-intent & info guides)"
    if p.startswith("/comparisons"):
        return "/comparisons (6 vs pages)"
    if p.startswith("/astrology"):
        return "/astrology (zodiac pairs & signs)"
    if p.startswith("/tools"):
        return "/tools (7 interactive tools)"
    if p.startswith("/es"):
        return "/es (Spanish section)"
    if p.startswith("/blogs"):
        return "/blogs"
    return "Core pages (home, about, etc.)"

pages["group"] = pages["page"].map(page_group)
pages["host"] = pages["page"].map(lambda u: urlsplit(u).netloc)
grp = pages.groupby("group").agg(clicks=("clicks", "sum"), impressions=("impressions", "sum"), urls=("page", "nunique")).reset_index().sort_values("impressions", ascending=False)
grp["ctr"] = (100 * grp["clicks"] / grp["impressions"].replace(0, np.nan)).round(2)
summary["page_groups"] = grp.to_dict("records")
www = pages[pages["host"] == "www.easternalignment.com"]
summary["www_leak"] = {"urls": int(len(www)), "impressions": int(www["impressions"].sum()), "clicks": int(www["clicks"].sum())}

# ---------- chart 5: cluster bars ----------
fig, ax = plt.subplots(figsize=(9.4, 4.4))
g2 = grp.sort_values("impressions")
y = np.arange(len(g2))
ax.barh(y + 0.19, g2["impressions"], height=0.38, color=INK2, label="Impressions")
ax2 = ax.twiny()
ax2.barh(y - 0.19, g2["clicks"], height=0.38, color=ACCENT, label="Clicks")
ax2.grid(False)
ax.set_yticks(y); ax.set_yticklabels(g2["group"], fontsize=8.5)
for i, (_, r) in enumerate(g2.iterrows()):
    ax.annotate(f" {int(r['impressions']):,}", (r["impressions"], y[i] + 0.19), va="center", fontsize=8, color="#475467")
    if r["clicks"] > 0:
        ax2.annotate(f"{int(r['clicks'])} ", (r["clicks"], y[i] - 0.19), va="center", ha="right", fontsize=8, color="white", fontweight="bold")
ax.set_title("Content clusters - impressions vs clicks")
h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc="lower right", frameon=False, fontsize=9)
ax.set_xlim(0, g2["impressions"].max() * 1.16)
ax2.set_xlim(0, max(g2["clicks"].max() * 2.6, 10))
b64_cluster = fig_to_b64(fig)

# ---------- top pages ----------
top_pages = pages.nlargest(20, "clicks")[["page", "clicks", "impressions", "ctr", "position"]]
summary["top_pages"] = top_pages.to_dict("records")
zero_click_pages = pages[(pages["impressions"] >= 40) & (pages["clicks"] == 0)].sort_values("impressions", ascending=False)
zero_click_pages = zero_click_pages[~zero_click_pages["page"].str.contains("#")]
summary["zero_click_pages"] = zero_click_pages[["page", "clicks", "impressions", "ctr", "position"]].head(15).to_dict("records")

# ---------- striking distance queries ----------
sd = queries[(queries["position"] >= 4) & (queries["position"] <= 20) & (queries["impressions"] >= 15)].copy()
sd["potential"] = sd["impressions"] * 0.05  # rough: reaching top-3 CTR ~5%+
sd = sd.sort_values("impressions", ascending=False)
summary["striking"] = sd[["query", "clicks", "impressions", "ctr", "position"]].head(20).to_dict("records")

# high impressions, CTR underperforming pages (pos <= 15, ctr < 1%)
lowctr = pages[(pages["position"] <= 15) & (pages["ctr"] < 1.0) & (pages["impressions"] >= 40)].copy()
lowctr = lowctr[~lowctr["page"].str.contains("#")].sort_values("impressions", ascending=False)
summary["low_ctr_pages"] = lowctr[["page", "clicks", "impressions", "ctr", "position"]].head(12).to_dict("records")

# ---------- chart 6: CTR vs position scatter (pages, impr>=20) ----------
fig, ax = plt.subplots(figsize=(9.2, 4.8))
pp = pages[(pages["impressions"] >= 20) & (~pages["page"].str.contains("#"))].copy()
pp["short"] = pp["page"].map(lambda u: urlsplit(u).path)
sizes = np.clip(pp["impressions"] / 12, 12, 320)
colors = []
for _, r in pp.iterrows():
    if r["position"] <= 10 and r["ctr"] >= 2:
        colors.append(GREEN)
    elif r["position"] <= 20 and r["ctr"] < 1:
        colors.append(AMBER)
    elif r["position"] > 20:
        colors.append(GRAY)
    else:
        colors.append(INK)
ax.scatter(pp["position"], pp["ctr"], s=sizes, c=colors, alpha=0.75, edgecolors="white", linewidths=0.6)
ax.axvspan(3.5, 20, color="#fff7ed", alpha=0.55, zorder=0)
ax.text(11.5, ax.get_ylim()[1] * 0.02 + pp["ctr"].max() * 0.93, "striking-distance zone (pos 4-20)",
        fontsize=8.5, color=AMBER, ha="center", fontweight="bold")
for _, r in pp.nlargest(8, "impressions").iterrows():
    label = r["short"] if len(r["short"]) <= 40 else r["short"][:37] + "..."
    ax.annotate(label, (r["position"], r["ctr"]), textcoords="offset points", xytext=(6, 4), fontsize=7.2, color="#475467")
ax.set_xlabel("Average position (lower = better)")
ax.set_ylabel("CTR (%)")
ax.invert_xaxis()
ax.set_title("Page CTR vs position - bubble size = impressions (green: healthy, amber: underperforming)")
b64_scatter = fig_to_b64(fig)

# ---------- devices & countries ----------
summary["devices"] = devices.to_dict("records")
summary["countries"] = countries.head(10).to_dict("records")

fig, (axl, axr) = plt.subplots(1, 2, figsize=(10.4, 3.6), gridspec_kw={"width_ratios": [1, 1.6]})
dv = devices.copy()
dv["device"] = dv["device"].map({"移动设备": "Mobile", "桌面": "Desktop", "平板电脑": "Tablet"}).fillna(dv["device"])
axl.bar(dv["device"], dv["impressions"], color=[INK2, INK, GRAY])
for i, r in dv.iterrows():
    axl.annotate(f"{int(r['impressions']):,} imp\n{int(r['clicks'])} clicks\npos {r['position']:.1f}",
                 (i, r["impressions"]), ha="center", va="bottom", fontsize=8, color="#475467")
axl.set_ylim(0, dv["impressions"].max() * 1.42)
axl.set_title("By device")
cn = countries.head(8).copy()
cn["country"] = cn["country"].map({"美国": "United States", "英国": "United Kingdom", "加拿大": "Canada", "澳大利亚": "Australia", "印度": "India", "巴基斯坦": "Pakistan", "新加坡": "Singapore", "芬兰": "Finland"}).fillna(cn["country"])
cn = cn.iloc[::-1]
axr.barh(cn["country"], cn["impressions"], color=INK2)
for i, (_, r) in enumerate(cn.iterrows()):
    axr.annotate(f" {int(r['impressions']):,} imp · {int(r['clicks'])} clicks", (r["impressions"], i), va="center", fontsize=8, color="#475467")
axr.set_xlim(0, cn["impressions"].max() * 1.38)
axr.set_title("Top countries by impressions")
b64_geo = fig_to_b64(fig)

# ---------- misc signals ----------
brand_site = queries[queries["query"].str.lower().str.contains("easternalignment")]
summary["brand_impr"] = int(brand_site["impressions"].sum())
llm_like = queries[queries["query"].str.len() > 90]
summary["llm_queries"] = {"count": int(len(llm_like)), "impressions": int(llm_like["impressions"].sum()),
                          "examples": llm_like.nlargest(4, "impressions")["query"].tolist()}

charts = {
    "trend": b64_trend, "monthly": b64_monthly, "intent": b64_intent,
    "topq": b64_topq, "cluster": b64_cluster, "scatter": b64_scatter, "geo": b64_geo,
}
with open(os.path.join(OUT, "charts.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(charts, f)
with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(summary, f, ensure_ascii=False, indent=1, default=str)

print("=== TOTAL ===", summary["total"])
print("=== last28 vs prev28 ===", summary["last28"], "VS", summary["prev28"], "growth", summary["wow"])
print("=== monthly ===")
for m in summary["monthly"]:
    print(" ", m)
print("=== intent ===")
for r in summary["intent"]:
    print(f"  {r['intent']:<28} clicks={r['clicks']:>4} impr={r['impressions']:>6} ctr={r['ctr']}% pos={r['wpos']}")
print("=== page groups ===")
for r in summary["page_groups"]:
    print(f"  {r['group']:<46} clicks={r['clicks']:>4} impr={r['impressions']:>6} ctr={r['ctr']}% urls={r['urls']}")
print("=== www leak ===", summary["www_leak"])
print("=== brand impr ===", summary["brand_impr"], "=== llm-like ===", summary["llm_queries"]["count"], summary["llm_queries"]["impressions"])
print("=== striking top5 ===")
for r in summary["striking"][:5]:
    print(" ", r)
print("=== zero-click pages top8 ===")
for r in summary["zero_click_pages"][:8]:
    print(" ", r)
print("=== low-ctr pages ===")
for r in summary["low_ctr_pages"][:8]:
    print(" ", r)
print("OK - charts.json & summary.json written")
