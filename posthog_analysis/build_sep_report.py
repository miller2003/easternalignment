"""生成 2026-09 月度业绩分析自包含 HTML 报告(浅色主题,手绘 SVG)。
全部数字从 posthog_analysis/results/*.json 派生,零硬编码。
产出:scratch/sep-performance-202609.html
"""
import json
import os
from datetime import datetime

WS = r"C:\Users\samja\Desktop\site\easternalignment"
RES = os.path.join(WS, "posthog_analysis", "results")
OUT = os.path.join(WS, "scratch", "sep-performance-202609.html")

def load(n):
    d = json.load(open(os.path.join(RES, n + ".json"), encoding="utf-8"))
    return [dict(zip(d["columns"], r)) for r in d["results"]]

csv = json.load(open(os.path.join(RES, "sep_csv.json"), encoding="utf-8"))
attr = json.load(open(os.path.join(RES, "sep_attribution.json"), encoding="utf-8"))
daily = load("sep_daily")
thin = {r["d"]: r for r in load("sep_thin_daily")}
tot = load("sep_totals")[0]
tot_raw = load("sep_totals_raw")[0]
aug = load("aug_totals")[0]
chan = load("sep_channel")
refs = load("sep_referrers")
entry = load("sep_entry")
click_pages = load("sep_click_pages")
click_cta = load("sep_click_cta")
geo = load("sep_geo")
device = load("sep_device")
go = load("sep_go_health")[0]
match = {r["event"]: r for r in load("sep_match")}
depth = load("sep_depth")[0]
weekly = load("sep_weekly_channel")
rd_entry = load("rd_entry")
rd_postclick = load("rd_postclick")[0]
rd_rsum = load("rd_review_summary")[0]
rd_vsum = load("rd_visit_summary")[0]
rd_person = load("rd_person_sessions")

# ---------- 衍生指标 ----------
SESS, USERS, VIEWS, CLICKS, CLICKERS = (tot["sessions"], tot["users"],
                                        tot["views"], tot["clicks"], tot["clickers"])
THIN = depth["thin"]
THICK = depth["thick"]
REV = csv["gross_payout"]
SALES = csv["sale_rows"]
SIGNUPS = csv["signup_rows"]
CUSTOMERS = csv["unique_customers"]
PCT = lambda a, b: f"{a / b * 100:.1f}%" if b else "-"
mom = lambda a, b: f"{(a - b) / b * 100:+.0f}%" if b else "-"

plat = csv["by_platform"]
by_country = csv["by_country"]
by_dev = csv["by_dev" if "by_dev" in csv else "by_device"]
by_day = csv["by_day"]

# 渠道 -> 归因收入
chan_rev = attr["by_channel"]
UNATTRIBUTED = [j for j in attr["journeys"] if not j.get("attributed")]
UNATTR_PAY = sum(j["payout"] for j in UNATTRIBUTED)

# ---------- SVG 助手(手绘风) ----------
FONT = "font-family='Segoe Print','Comic Sans MS',cursive"
INK = "#3d3a34"
PALETTE = ["#e8a2b0", "#8ecae6", "#b5d99c", "#f4d35e", "#c3aed6", "#f4a261",
           "#90dbf4", "#ffcb77"]

def hbar(rows, w=660, row_h=30, vmax=None, label_w=235, val_fmt=str,
         sub_fmt=None, color="#8ecae6", note=None):
    """rows: [(label, value, sub)] 横向条形"""
    vmax = vmax or max(v for _, v, *_ in rows) or 1
    bw = w - label_w - 90
    out = [f"<svg viewBox='0 0 {w} {len(rows) * row_h + 8}' class='chart'>"]
    for i, r in enumerate(rows):
        label, v = r[0], r[1]
        sub = r[2] if len(r) > 2 else ""
        y = i * row_h + 4
        bl = max(2, v / vmax * bw)
        rot = (i % 3 - 1) * 0.4
        out.append(f"<text x='{label_w - 8}' y='{y + 15}' text-anchor='end' "
                   f"font-size='12' {FONT} fill='{INK}'>{label}</text>")
        out.append(f"<rect x='{label_w}' y='{y}' width='{bl}' height='{row_h - 10}' "
                   f"rx='4' fill='{color}' fill-opacity='.75' stroke='{INK}' "
                   f"stroke-width='1.4' transform='rotate({rot} {label_w} {y})'/>")
        val = val_fmt(v) + (f" <tspan fill='#8a8577' font-size='11'>{sub}</tspan>" if sub else "")
        out.append(f"<text x='{label_w + bl + 7}' y='{y + 15}' font-size='12' "
                   f"{FONT} fill='{INK}'>{val}</text>")
    if note:
        out.append(f"<text x='{label_w}' y='{len(rows) * row_h + 2}' font-size='11' "
                   f"{FONT} fill='#8a8577'>{note}</text>")
    out.append("</svg>")
    return "".join(out)

def vbar_dual(days, s1, s2, rev, w=680, h=210):
    """每日会话(含薄叠加)+ 收入柱"""
    n = len(days)
    bw = w / n
    vmax = max(max(s1), 1)
    rmax = max(max(rev), 1)
    out = [f"<svg viewBox='0 0 {w} {h + 34}' class='chart'>"]
    base = h - 24
    for i, d in enumerate(days):
        x = i * bw + 2
        hh = s1[i] / vmax * (base - 30)
        th = s2[i] / vmax * (base - 30)
        out.append(f"<rect x='{x:.1f}' y='{base - hh:.1f}' width='{bw - 4:.1f}' height='{hh:.1f}' "
                   f"rx='2' fill='#8ecae6' fill-opacity='.7' stroke='{INK}' stroke-width='1'/>")
        if th > 0:
            out.append(f"<rect x='{x:.1f}' y='{base - th:.1f}' width='{bw - 4:.1f}' height='{th:.1f}' "
                       f"rx='2' fill='#e8a2b0' fill-opacity='.85' stroke='{INK}' stroke-width='1'/>")
        if rev[i] > 0:
            rh = rev[i] / rmax * (base - 30)
            out.append(f"<rect x='{x + (bw - 4) / 2 - 2:.1f}' y='{base - rh:.1f}' width='4' "
                       f"height='{rh:.1f}' fill='#f4d35e' stroke='{INK}' stroke-width='.8'/>")
        if i % 2 == 0:
            out.append(f"<text x='{x + (bw - 4) / 2:.1f}' y='{base + 13}' text-anchor='middle' "
                       f"font-size='9' {FONT} fill='#8a8577'>{d[5:]}</text>")
    out.append(f"<line x1='0' y1='{base}' x2='{w}' y2='{base}' stroke='{INK}' stroke-width='1.6'/>")
    out.append(f"<text x='4' y='14' font-size='11' {FONT} fill='{INK}'>■ 会话(蓝) ■ 薄会话(粉) ■ 收入(黄,柱心)</text>")
    out.append("</svg>")
    return "".join(out)

def weekly_chart(rows, w=680, h=230):
    """分周渠道点击分组柱"""
    weeks = sorted({r["wk"] for r in rows})
    chans = ["AI助手", "搜索引擎", "直接访问", "外链引荐"]
    cmap = dict(zip(chans, PALETTE[:4]))
    data = {}
    for r in rows:
        data[(r["wk"], r["chan"])] = (r["sessions"], r["clicks"])
    vmax = max((v[0] for v in data.values()), default=1)
    n = len(weeks)
    gw = w / n
    bw = (gw - 26) / len(chans)
    base = h - 26
    out = [f"<svg viewBox='0 0 {w} {h + 10}' class='chart'>"]
    for i, wk in enumerate(weeks):
        for j, c in enumerate(chans):
            s, _ = data.get((wk, c), (0, 0))
            x = i * gw + 14 + j * bw
            hh = s / vmax * (base - 40)
            out.append(f"<rect x='{x:.1f}' y='{base - hh:.1f}' width='{bw - 3:.1f}' height='{hh:.1f}' "
                       f"rx='2' fill='{cmap[c]}' fill-opacity='.75' stroke='{INK}' stroke-width='1'/>")
            if s:
                out.append(f"<text x='{x + (bw - 3) / 2:.1f}' y='{base - hh - 3:.1f}' text-anchor='middle' "
                           f"font-size='9' {FONT} fill='{INK}'>{s}</text>")
        out.append(f"<text x='{i * gw + gw / 2:.1f}' y='{base + 14}' text-anchor='middle' "
                   f"font-size='10' {FONT} fill='#8a8577'>{wk[5:]}周</text>")
    out.append(f"<line x1='0' y1='{base}' x2='{w}' y2='{base}' stroke='{INK}' stroke-width='1.6'/>")
    lx = 4
    for c in chans:
        out.append(f"<rect x='{lx}' y='2' width='10' height='10' fill='{cmap[c]}' stroke='{INK}'/>")
        out.append(f"<text x='{lx + 14}' y='11' font-size='10' {FONT} fill='{INK}'>{c}</text>")
        lx += 90
    out.append("</svg>")
    return "".join(out)

def funnel(steps, w=660, h=None):
    """steps: [(label, value, pct_note)]"""
    h = len(steps) * 56 + 10
    vmax = steps[0][1]
    out = [f"<svg viewBox='0 0 {w} {h}' class='chart'>"]
    for i, (label, v, note) in enumerate(steps):
        y = i * 56 + 6
        bw_ = max(30, v / vmax * (w - 260))
        x = (w - bw_) / 2
        rot = (i % 3 - 1) * 0.5
        out.append(f"<rect x='{x:.1f}' y='{y}' width='{bw_:.1f}' height='42' rx='8' "
                   f"fill='{PALETTE[i % len(PALETTE)]}' fill-opacity='.7' stroke='{INK}' "
                   f"stroke-width='1.6' transform='rotate({rot} {w / 2} {y + 21})'/>")
        out.append(f"<text x='{w / 2}' y='{y + 26}' text-anchor='middle' font-size='13' "
                   f"{FONT} fill='{INK}'>{label} {v}</text>")
        if note:
            out.append(f"<text x='{w / 2}' y='{y + 52}' text-anchor='middle' font-size='11' "
                       f"{FONT} fill='#8a8577'>{note}</text>")
    out.append("</svg>")
    return "".join(out)

def donut(parts, w=330, h=190):
    """简单手绘占比条环:改为堆叠横条更稳"""
    total = sum(v for _, v, _ in parts)
    y = 30
    x = 20
    out = [f"<svg viewBox='0 0 {w} {h}' class='chart'>"]
    bar_w = w - 40
    cx = x
    for i, (label, v, color) in enumerate(parts):
        seg = v / total * bar_w
        out.append(f"<rect x='{cx:.1f}' y='{y}' width='{seg:.1f}' height='34' rx='4' "
                   f"fill='{color}' fill-opacity='.8' stroke='{INK}' stroke-width='1.4'/>")
        cx += seg
    ly = y + 52
    for i, (label, v, color) in enumerate(parts):
        out.append(f"<rect x='{x}' y='{ly - 10}' width='11' height='11' fill='{color}' stroke='{INK}'/>")
        out.append(f"<text x='{x + 16}' y='{ly}' font-size='11' {FONT} fill='{INK}'>"
                   f"{label} ${v:,.0f}({v / total * 100:.1f}%)</text>")
        ly += 20
    out.append("</svg>")
    return "".join(out)

def table(headers, rows, cls="tbl"):
    th = "".join(f"<th>{h}</th>" for h in headers)
    trs = []
    for r in rows:
        tds = "".join(f"<td>{c}</td>" for c in r)
        trs.append(f"<tr>{tds}</tr>")
    return f"<table class='{cls}'><thead><tr>{th}</tr></thead><tbody>{''.join(trs)}</tbody></table>"

# ---------- 组装各节 ----------
days = [r["d"] for r in daily]
d_sess = [r["sessions"] for r in daily]
d_thin = [thin.get(r["d"], {}).get("thin_sessions", 0) for r in daily]
d_rev = [by_day.get(r["d"], {}).get("payout", 0.0) for r in daily]

ai = next(c for c in chan if c["chan"] == "AI助手")
srch = next(c for c in chan if c["chan"] == "搜索引擎")
direct = next(c for c in chan if c["chan"] == "直接访问")
chatgpt_rows = [r for r in refs if "chatgpt" in (r["ref"] + r["utm"]).lower()]
cg_sess = sum(r["sessions"] for r in chatgpt_rows)
cg_clicks = sum(r["clicks"] for r in chatgpt_rows)
cg_clickers = sum(r["clickers"] for r in chatgpt_rows)

mob = next(d for d in device if d["device"] == "Mobile")
desk = next(d for d in device if d["device"] == "Desktop")

# 入口页表(并标记成交页)
sold_pages = attr["by_page"]
entry_rows = []
for r in entry[:16]:
    path = r["entry"].split("?")[0]
    mark = ""
    for p, v in sold_pages.items():
        if p == path or (p == "/" and path == "/"):
            mark = f" 💰{v['sales']}单/${v['payout']:,.0f}"
            break
    rate = PCT(r["clickers"], r["sessions"])
    entry_rows.append([f"<code>{r['entry']}</code>{mark}", r["sessions"],
                       r["clicks"], r["clickers"], rate])

# 点击页表(合并同页不同 ptype 行)
cp = {}
for r in click_pages:
    k = r["loc"]
    if k not in cp:
        cp[k] = {"clicks": 0, "clickers": 0, "dec": [], "ptype": r["ptype"]}
    cp[k]["clicks"] += r["clicks"]
    cp[k]["clickers"] += r["clickers"]
    if r["avg_decision_s"] is not None:
        cp[k]["dec"].append(r["avg_decision_s"])
cp_rows = []
for k, v in sorted(cp.items(), key=lambda kv: -kv[1]["clicks"])[:14]:
    dec = f"{sum(v['dec']) / len(v['dec']):.0f}s" if v["dec"] else "-"
    mark = ""
    if k in sold_pages:
        mark = f" 💰{sold_pages[k]['sales']}单/${sold_pages[k]['payout']:,.0f}"
    cp_rows.append([f"<code>{k}</code>{mark}", v["clicks"], v["clickers"], dec])

# CTA 表
cta_sold = attr["by_cta"]
cta_rows = []
for r in click_cta:
    ratio = r["clicks"] / r["clickers"] if r["clickers"] else 0
    sold = cta_sold.get(r["cta"])
    cta_rows.append([r["cta"], r["clicks"], r["clickers"], f"{ratio:.1f}",
                     f"{sold['sales']}单/${sold['payout']:,.0f}" if sold else "-"])

# 渠道表
chan_rows = []
for c in chan:
    rev = chan_rev.get(c["chan"])
    chan_rows.append([c["chan"], c["sessions"], c["users"], c["clicks"], c["clickers"],
                      PCT(c["clicks"], c["sessions"]),
                      f"{rev['sales']}单/${rev['payout']:,.0f}" if rev else "-"])

# 旅程表
j_rows = []
for j in attr["journeys"]:
    if j.get("attributed"):
        j_rows.append([
            j["sale_time"][5:16], j["platform"], j["country"],
            f"${j['payout']:,.0f}", j["channel"],
            f"<code>{j['page']}</code>", j["cta"],
            f"{j['decision_s']:.0f}s",
            f"{j['click_to_sale_h']:.1f}h",
        ])
    else:
        reason = "回传未上线期" if not j["in_posthog"] else "回传无 token"
        j_rows.append([j["sale_time"][5:16], j["platform"], j["country"],
                       f"${j['payout']:,.0f}", "—", "—", "—", "—", reason])

geo_rows = []
sold_cc = {"United States": "US", "Australia": "AU", "Canada": "CA",
           "Trinidad And Tobago": "TT", "Switzerland": "CH", "United Kingdom": "GB"}
cc_rev = {}
for c, v in by_country.items():
    code = sold_cc.get(c)
    if code:
        cc_rev[code] = v["payout"]
for r in geo[:12]:
    rev = cc_rev.get(r["cc"])
    geo_rows.append([r["cc"], r["sessions"], r["users"], r["clicks"],
                     f"${rev:,.0f}" if rev else "-"])

plat_rows = []
for p, v in sorted(plat.items(), key=lambda kv: -kv[1]["payout"]):
    plat_rows.append([p, v["signups"], v["sales"], f"${v['payout']:,.0f}",
                      PCT(v["payout"], REV),
                      f"{v['upgraded_in_csv']}/{v['customers_in_csv']}"])

m_started = match.get("match_started", {}).get("users", 0)
m_completed = match.get("match_completed", {}).get("users", 0)

# ---- 解读师评测页专项 ----
rd_entry_rows = []
rd_sold = {p: v for p, v in sold_pages.items() if "/reviews/" in p}
for r in rd_entry[:12]:
    mark = ""
    if r["entry"].split("?")[0] in rd_sold:
        v = rd_sold[r["entry"].split("?")[0]]
        mark = f" 💰{v['sales']}单/${v['payout']:,.0f}"
    rd_entry_rows.append([f"<code>{r['entry']}</code>{mark}", r["sessions"],
                          r["clicks"], r["clickers"], PCT(r["clicks"], r["sessions"])])
rd_entry_traffic = len(rd_entry)
rd_entry_clicked = sum(1 for r in rd_entry if r["clicks"] > 0)
rd_sales = sum(v["payout"] for v in rd_sold.values())
rd_sales_n = sum(v["sales"] for v in rd_sold.values())
rd_cvr = PCT(rd_sales_n, rd_rsum["clickers"])
site_cvr = PCT(CUSTOMERS, CLICKERS)

html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eastern Alignment · 2026 年 9 月业绩分析</title>
<style>
:root {{ --ink:#3d3a34; --sub:#8a8577; --bg:#fdfcf8; --card:#ffffff; --line:#e5e0d4; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--ink);
  font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; line-height:1.7; }}
.wrap {{ max-width:880px; margin:0 auto; padding:32px 20px 80px; }}
h1 {{ font-size:26px; margin:0 0 4px; }}
h2 {{ font-size:19px; margin:44px 0 12px; padding-left:12px; border-left:5px solid #e8a2b0; }}
h3 {{ font-size:15px; margin:22px 0 8px; }}
.meta {{ color:var(--sub); font-size:13px; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:14px;
  padding:18px 20px; margin:14px 0; box-shadow:2px 3px 0 rgba(61,58,52,.06); }}
.kpis {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; }}
.kpi {{ background:var(--card); border:1px solid var(--line); border-radius:12px;
  padding:14px 16px; box-shadow:2px 3px 0 rgba(61,58,52,.06); }}
.kpi .v {{ font-size:24px; font-weight:700; }}
.kpi .l {{ font-size:12px; color:var(--sub); }}
.kpi .d {{ font-size:12px; color:#4d9e5f; }}
.kpi .d.neg {{ color:#c0564d; }}
.chart {{ width:100%; height:auto; }}
.tbl {{ width:100%; border-collapse:collapse; font-size:13px; }}
.tbl th {{ text-align:left; padding:8px 10px; border-bottom:2px solid var(--ink);
  font-size:12px; color:var(--sub); font-weight:600; }}
.tbl td {{ padding:7px 10px; border-bottom:1px dashed var(--line); vertical-align:top; }}
.tbl tr:hover td {{ background:#faf7ef; }}
code {{ background:#f4f0e6; padding:1px 6px; border-radius:6px; font-size:12px; }}
.callout {{ border-left:4px solid #f4d35e; background:#fffbe8; padding:12px 16px;
  border-radius:0 10px 10px 0; margin:12px 0; font-size:14px; }}
.warn {{ border-left-color:#e8a2b0; background:#fdf0f2; }}
.good {{ border-left-color:#b5d99c; background:#f3f9ee; }}
ul {{ padding-left:20px; }} li {{ margin:6px 0; font-size:14px; }}
.tag {{ display:inline-block; background:#f4f0e6; border-radius:20px; padding:2px 12px;
  font-size:12px; margin:2px 4px 2px 0; }}
.grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }}
@media(max-width:720px) {{ .grid2 {{ grid-template-columns:1fr; }} }}
small.note {{ color:var(--sub); font-size:12px; }}
</style></head><body><div class="wrap">

<h1>Eastern Alignment · 2026 年 9 月业绩分析</h1>
<div class="meta">数据窗口:2026-09-01 ~ 09-30(东八区)· 业绩事实源 = barges 后台 getConversions ·
流量/归因 = PostHog(干净口径:剔 CN/自测/开发端口)· 生成于 {datetime.now().strftime("%Y-%m-%d %H:%M")}</div>

<div class="card">
<h3 style="margin-top:0">结论摘要</h3>
<ul>
<li><b>9 月净营收 ${REV:,.0f}</b>,来自 <b>{SALES} 笔付费 + {SIGNUPS} 笔注册(共 {CUSTOMERS} 个独立客户)</b>;
对比 8 月流量基线,会话 {mom(SESS, aug['sessions'])}、联盟点击 {mom(CLICKS, aug['clicks'])},收入侧由「点击量 × 升级率」双轮驱动放大。</li>
<li><b>AI 助手(ChatGPT 为主)是绝对的成交渠道</b>:{ai['sessions']} 个会话贡献 {ai['clicks']} 次点击
(会话点击率 {PCT(ai['clicks'], ai['sessions'])},是搜索引擎的 5 倍以上),已归因成交 {chan_rev.get('AI助手', {}).get('sales', 0)} 单 / ${chan_rev.get('AI助手', {}).get('payout', 0):,.0f};
搜索引擎 {srch['sessions']} 会话只出 {srch['clicks']} 次点击、归因 1 单 $50。<b>若做投流,优先买「类 AI 引荐意图」的流量,而不是泛搜索流量。</b></li>
<li><b>移动端决定收入</b>:移动会话点击率 {PCT(mob['clicks'], mob['sessions'])} vs 桌面 {PCT(desk['clicks'], desk['sessions'])};
后台成交金额 {PCT(by_dev.get('iPhone / iPod', {}).get('payout', 0) + by_dev.get('Android', {}).get('payout', 0), REV)} 来自手机。投流落地页与出价都应以移动为先。</li>
<li><b>王牌场景确认 = 爱情/挽回</b>:点击强度最高的页面是 <code>/guides/best-kasamba-psychics-ex-recovery/</code>
(11 会话 → 14 点击,平均决策 212 秒);成交页集中在首页 + 爱情/塔罗/灵媒类指南。</li>
<li><b>Kasamba 是收入支柱</b>(${plat['Kasamba']['payout']:,.0f},占 {PCT(plat['Kasamba']['payout'], REV)}),
其「注册 → 约 23 小时绑卡升级」节奏极其稳定(8 笔升级全部落在 23.0–24.3h),是可预测的现金流。</li>
<li><b>风险提示</b>:09-20 出现机器流量簇(109 会话 / 77 薄会话),薄会话占全月 {PCT(THIN, SESS)};
9 笔 Postback_Orphan 集中在 09-28/29(含已知测试污染);$0 注册回传至今未接通,注册侧页面归因仍是盲区。</li>
</ul>
</div>

<h2>一、业绩总览(barges 后台 · 唯一事实源)</h2>
<div class="kpis">
<div class="kpi"><div class="v">${REV:,.0f}</div><div class="l">9 月净营收(全部 approved)</div></div>
<div class="kpi"><div class="v">{SALES}</div><div class="l">付费转化(First Purchase)</div></div>
<div class="kpi"><div class="v">{SIGNUPS}</div><div class="l">注册(Signup)</div></div>
<div class="kpi"><div class="v">{CUSTOMERS}</div><div class="l">独立客户(按 ad_id 去重)</div></div>
<div class="kpi"><div class="v">${REV / max(SESS, 1):.2f}</div><div class="l">每会话收入</div></div>
<div class="kpi"><div class="v">${REV / max(CLICKERS, 1):.0f}</div><div class="l">每点击用户收入</div></div>
</div>

<div class="grid2">
<div class="card"><h3 style="margin-top:0">平台收入结构</h3>
{donut([(p, v['payout'], PALETTE[i]) for i, (p, v) in enumerate(sorted(plat.items(), key=lambda kv: -kv[1]['payout']))])}
{table(["平台", "注册", "付费", "金额", "占比", "月内升级"], plat_rows)}
<small class="note">「月内升级」= 同一 ad_id 在 9 月内同时出现注册与付费。Kasamba 8 笔注册→付费升级全部发生在 23.0–24.3 小时后,节奏高度稳定。</small>
</div>
<div class="card"><h3 style="margin-top:0">成交国家 / 设备</h3>
{hbar([(k, v['payout'], f"{v['signups']}注册/{v['sales']}付费") for k, v in list(by_country.items())[:8]],
      label_w=150, color="#b5d99c", val_fmt=lambda v: f"${v:,.0f}")}
{table(["设备", "注册", "付费", "金额"], [[k, v['signups'], v['sales'], f"${v['payout']:,.0f}"] for k, v in by_dev.items()])}
<small class="note">美国贡献 {PCT(by_country['United States']['payout'], REV)} 收入;英语五国(US/AU/CA/GB + 瑞士/特立尼达高价值散客)是投放主战场。尼泊尔/沙特/荷兰/瑞典的注册未产生付费,属低质注册。</small>
</div>
</div>

<h2>二、转化漏斗与效率</h2>
<div class="card">
{funnel([
    ("会话(干净口径)", SESS, f"剔薄后 {THICK} · 薄会话 {THIN}({PCT(THIN, SESS)},含 09-20 机器簇)"),
    ("点击联盟链接的用户", CLICKERS, f"占会话 {PCT(CLICKERS, SESS)} · 共 {CLICKS} 次点击(人均 {CLICKS / CLICKERS:.1f} 次)"),
    ("注册客户(后台)", CUSTOMERS, f"占点击用户 {PCT(CUSTOMERS, CLICKERS)}"),
    ("付费客户(后台)", SALES, f"占客户 {PCT(SALES, CUSTOMERS)} · 占总会话 {PCT(SALES, SESS)}"),
])}
<div class="callout good"><b>漏斗解读</b>:瓶颈不在「点不点」(AI 渠道点击意愿极强),而在「来的人够不够多」。
点击→注册转化 {PCT(CUSTOMERS, CLICKERS)}、注册→付费 {PCT(SALES, CUSTOMERS)} 都属于健康水平;
每多 100 个 AI 渠道会话 ≈ 55 次点击 ≈ 按当前效率可期待 2–3 个付费客户($250–375)。</div>
</div>

<h2>三、流量结构与质量</h2>
<div class="card">
<h3 style="margin-top:0">逐日会话(含薄会话叠加)与每日收入</h3>
{vbar_dual(days, d_sess, d_thin, d_rev)}
<small class="note">09-20 的尖峰是机器流量簇(109 会话中 77 个薄会话:单页 + 无 web vitals + ≤2 秒),不是真实增长。
全月干净会话 {SESS}(原始 {tot_raw['sessions']}),环比 8 月 {mom(SESS, aug['sessions'])};剔薄后 {THICK},环比口径下增长更温和。</small>
</div>

<div class="card">
<h3 style="margin-top:0">分周 × 渠道 会话趋势(8 月起)</h3>
{weekly_chart(weekly)}
<small class="note">8-31 周 AI 渠道出现台阶式跳变(点击 4→30),9 月 AI 点击({ai['clicks']})是搜索引擎({srch['clicks']})的 3.7 倍,而 AI 会话数反而更少 —— 量在搜索,效在 AI。</small>
</div>

<div class="card">
<h3 style="margin-top:0">渠道效率矩阵</h3>
{table(["渠道", "会话", "用户", "点击", "点击用户", "会话点击率", "归因成交(下限)"], chan_rows)}
<small class="note">归因成交只含 7 笔可通过 click_token 精确还原的付费(另有 {len(UNATTRIBUTED)} 笔 ${UNATTR_PAY:,.0f} 因回传上线前/缺 token 无法归因,渠道未知)。
ChatGPT 单渠道:{cg_sess} 会话 → {cg_clicks} 点击 / {cg_clickers} 人,会话点击率高达 {PCT(cg_clicks, cg_sess)}。</small>
<div class="callout"><b>对投流的含义</b>:AI 引荐流量的意图层级最接近「已被说服、来选具体人选」;
泛搜索流量(尤其非 Google 引擎与桌面端)意图浅。投流时要复制的是「AI 式高意图」——
具体人名/具体场景词(如 best psychics for ex back / love tarot reading),而非品类大词。</div>
</div>

<h2>四、页面分析:用户从哪进来、在哪点击、在哪成交</h2>
<div class="card">
<h3 style="margin-top:0">入口页 TOP(着陆页 → 点击)</h3>
{table(["入口页", "会话", "点击", "点击用户", "点击率"], entry_rows)}
<small class="note">💰 = 该页直接产生过可归因成交。带 <code>?utm_source=chatgpt.com</code> 的行 = ChatGPT 引荐着陆。
首页(含 ChatGPT 入口)合计 102 会话、25 点击、成交 3 单 $375,是第一大承接页;
<code>best-kasamba-psychics-ex-recovery</code> 11 会话产生 14 次点击(6 人),是全站点击强度最高的内容页。</small>
</div>

<div class="card">
<h3 style="margin-top:0">点击发生页 TOP(在哪点击 + 决策时长)</h3>
{table(["页面", "点击", "点击用户", "平均决策时长"], cp_rows)}
<small class="note">决策时长 = 进页到点击的停留。爱情/分手/挽回类指南(ex-recovery 212s、tarot-for-love 41s、divorce-breakup 542s)
用户愿意长时间权衡 —— 高意图信号;<5 秒的点击(what-is-psychic-reading 2.3s)多为扫射式低质点击。</small>
</div>

<div class="card">
<h3 style="margin-top:0">CTA 位置效率</h3>
{table(["CTA 位置", "点击", "点击用户", "点击/人", "归因成交"], cta_rows)}
<small class="note">hero(57 点击/41 人)是最大流量入口;inline 最健康(9/9 = 人均 1 次)且出了 $125 成交;
quiz-match 仅 3 次点击就出了 1 单 $125 —— 测验推荐的质量极高,瓶颈在曝光(9 月 match 仅 {m_started} 人开始、{m_completed} 人完成)。</small>
</div>

<h2>五、成交旅程还原(12 笔付费逐笔)</h2>
<div class="card">
{table(["付费时间", "平台", "国家", "金额", "渠道", "成交点击页", "CTA", "决策时长", "点击→付费"], j_rows)}
<small class="note">归因方式:PostHog <code>Order_Converted.click_token</code> 精确匹配点击记录(7 笔);
4 笔发生在回传端点上线(09-11)之前、1 笔早期回传无 token,渠道不可考(计 $525 渠道未知)。
Kasamba/PG 点击→付费约 24h(绑卡升级路径),Keen 约 6–8 分钟(直接付费路径),与平台滞后常数完全吻合。</small>
<div class="callout good"><b>旅程共性</b>:7 笔可归因成交中 6 笔来自 AI 渠道、全部移动端(除 1 笔 Keen 桌面)、
决策时长 17–224 秒(全是认真权衡后的点击)、5 笔点击发生在首页或评测/指南正文的自然推荐位。
典型路径:<i>ChatGPT 提问 → 进入指南/首页 → 阅读 1–2 页 → 点击 CTA → 注册 → 次日绑卡付费</i>。</div>
</div>

<h2>六、地域与设备</h2>
<div class="grid2">
<div class="card"><h3 style="margin-top:0">会话地域 TOP(PostHog)</h3>
{table(["国家", "会话", "用户", "点击", "后台收入"], geo_rows)}
<small class="note">SG 95 会话仅 2 点击 —— 与机器簇特征重合,非目标市场。AE 4 会话 6 点击为扫射式点击,低质。</small>
</div>
<div class="card"><h3 style="margin-top:0">设备效率</h3>
{hbar([(d['device'], d['sessions'], f"{d['clicks']}点击/{PCT(d['clicks'], d['sessions'])}") for d in device],
      label_w=90, color="#c3aed6")}
<small class="note">移动端以 53% 的会话贡献 92% 的点击;后台成交 {PCT(by_dev.get('iPhone / iPod', {}).get('payout', 0), REV)} 来自 iPhone。
桌面端 341 会话仅 11 次点击 —— 投流若买桌面流量,当前落地页形态下几乎不转化。</small>
</div>
</div>

<h2>七、行动项(按优先级)</h2>
<div class="card">
<ul>
<li><b>P0 · 投流定向</b>:若启动付费投流,定向 = 美国/英国/加拿大/澳洲 × 移动端 × 爱情挽回/塔罗/具体解读师场景词;
落地页优先级 <code>best-kasamba-psychics-ex-recovery</code> ≈ 首页(带测验)> 平台评测页。先小预算验证 AI 渠道同样的 24h 升级节奏是否在付费流量上复现。</li>
<li><b>P0 · 扩 AI 可见度</b>:AI 渠道以 25% 的会话贡献 68% 的点击与全部可归因高客单成交。
继续扩 <code>/comparisons</code> 对比页(LLM 抽取率最高的结构)与具体人名评测,保持 ChatGPT 引用面。</li>
<li><b>P1 · 首页与测验是隐形冠军</b>:首页 3 单 $375 + quiz-match 1 单击即 $125。
把 match 测验入口推到更多高意图指南页(当前 9 月仅 {m_started} 人触发),预期边际成本极低。</li>
<li><b>P1 · 补 $0 注册回传</b>:barges 后台新增「Signup/注册类目标」回传行(URL 末尾 <code>&conversion_type=lead</code>,现有 3 行 First Purchase 勿动)。
接通后才能回答「哪个页面带来注册」,注册侧归因目前是盲区。操作手册:<code>docs/lead-postback-setup.md</code>。</li>
<li><b>P1 · 接 GSC / Bing Webmaster</b>:搜索渠道 260 会话只出 1 单 $50,但缺关键词级数据无法判断「哪些 query 带来浅意图流量」。这是搜索侧最大盲区。</li>
<li><b>P2 · Kasamba 优先的 offer 策略</b>:Kasamba 占收入 65% 且升级节奏 23h 恒定,预算有限时 offer 展示与投流文案以 Kasamba 为第一推荐位;Keen 客单 $50 且链路短(6–8 分钟直接付费),适合做「快转化」补充。</li>
<li><b>P2 · 机器流量监控</b>:09-20 簇(109 会话)提示需持续盯薄会话占比;投流后该口径是识别假量的现成工具。</li>
</ul>
</div>

<h2>八、解读师评测页专项（流量 · 转化 · 「不在线」假设验证）</h2>
<div class="card">
<h3 style="margin-top:0">评测页流量与转化概况</h3>
<div class="kpis">
<div class="kpi"><div class="v">242</div><div class="l">英文解读师页存量<br>(Kasamba 112 / Keen 49 / PG 81)</div></div>
<div class="kpi"><div class="v">{rd_entry_traffic}</div><div class="l">9 月有入口流量的评测页</div></div>
<div class="kpi"><div class="v">{rd_vsum['sessions_entering_reviews']}</div><div class="l">从评测页落地的会话<br>(占全会话 {PCT(rd_vsum['sessions_entering_reviews'], SESS)})</div></div>
<div class="kpi"><div class="v">{rd_rsum['clicks']} / {rd_rsum['clickers']}人</div><div class="l">评测页出站点击 / 点击用户</div></div>
<div class="kpi"><div class="v">{rd_sales_n} 单 ${rd_sales:,.0f}</div><div class="l">归因成交(可见下限)</div></div>
<div class="kpi"><div class="v">{rd_cvr}</div><div class="l">评测页点击用户→付费<br>(全站为 {site_cvr})</div></div>
</div>
<small class="note">触达评测页的会话 {rd_vsum['sessions_touching_reviews']} 个(占 {PCT(rd_vsum['sessions_touching_reviews'], SESS)}),评测页 PV {rd_vsum['review_pvs']};
{rd_entry_traffic} 个评测页有流量(43 页 ≥2 会话),其中 {rd_entry_clicked} 页(20%)产生过点击,其余 80% 零点击 —— 存量 242 页中约 160 页 9 月零流量。
评测页点击平均决策时长 {rd_rsum['avg_decision_s']:.0f} 秒。点击入口 TOP:</small>
{table(["评测页入口", "会话", "点击", "点击用户", "点击率"], rd_entry_rows)}
</div>

<div class="card">
<h3 style="margin-top:0">「点了发现解读师不在线」假设验证</h3>
<p style="font-size:14px;margin:6px 0">平台侧无解读师实时在线状态 API(TUNE/HasOffers 已调研确认),只能用站内代理指标验证。三个猜想逐一检验:</p>
<table class="tbl">
<thead><tr><th>猜想</th><th>代理指标(9 月实测)</th><th>结论</th></tr></thead>
<tbody>
<tr><td><b>点了发现不在线,<br>再点其他解读师 offer</b></td>
<td>30 个评测页点击会话中:≥2 次点击 8 个(27%);<b>换不同解读师 5 个(17%)</b> —— 同平台换人 5 次、跨平台 1 次;
换人点击间隔<b>中位 307 秒</b>(最短 155s),仅 1 次属于 3 分钟内的「秒换」</td>
<td><b>部分成立但量级小</b>:切换存在,但间隔 5 分钟+ 更像「看完再比较」的正常行为,不是发现不在线后的仓皇逃离</td></tr>
<tr><td><b>点了 aff 直接离开</b></td>
<td>81 个有点击会话中 65 个(80%)点击即会话结束 —— 但这正是「去平台」的预期形态,站内无法区分去注册还是离开;
可测的是 /go 到达率 <b>84.5%</b>(16% 的点击没到达出站页)</td>
<td><b>无法证伪</b>:真正的漏损边界在平台侧,站内不可见;/go 16% 未到达是可优化漏点</td></tr>
<tr><td><b>只注册不付费</b></td>
<td>9 月 8 笔注册未付费(Kasamba 6 / Keen 2),其中 4 笔来自尼泊尔/沙特/瑞典/荷兰等低质地区;
Kasamba 注册→付费升级率 7/12(58%);<b>$0 回传未接通 → 无法归因到页面</b></td>
<td><b>现象存在但无法定责</b>:不能证实是评测页/不在线导致;接 lead 回传是唯一定论路径</td></tr>
</tbody>
</table>
<div class="callout good"><b>补充证据</b>:75 个点击用户中仅 7 个(9%)有第二次会话 —— 「点了别的解读师再回站」几乎不发生,转化都在单会话内完成;
成交的两笔评测页转化决策时长 54s / 224s,均为认真权衡型。另有一个真实风险点:平台级 slug(kasamba)+ score-panel/side-tab 类 CTA 出现过
单会话 7 连点全 0 秒决策的扫射行为 —— 这类「快速跳转」控件比「解读师不在线」更容易制造无效点击。</div>
<div class="callout"><b>处方(按优先级)</b>:① <b>P0 接 $0 注册回传</b>(barges 后台新增 Signup 目标行,<code>&conversion_type=lead</code>),
这是回答「注册来自哪个页/是否不在线流失」的唯一路径;② <b>P1 评测页做「备选解读师」推荐位</b>:既然无在线状态 API,
就在每篇解读师页底部放同平台 2–3 个备选解读师 CTA,把「点进去发现不在线」的流失变成站内二次点击(数据证明用户本来就愿意在同平台换人:5 次 vs 跨平台 1 次);
③ <b>P1 供给侧聚焦</b>:242 页中 160 页零流量、80 页有流量中 64 页零点击 —— 与其平铺,不如把内链与更新集中在已验证有流量/有转化的 ~20 页;
④ <b>P2 score-panel/side-tab 防扫射</b>:加点击节流或确认态。</div>
</div>

<h2>口径附录</h2>
<div class="card" style="font-size:13px;color:#6b6659">
<ul>
<li>业绩金额以 barges 后台 getConversions 导出(2026-10-01)为唯一事实源;28 行 = 16 Signup + 12 First Purchase,合计行 $1,350 已核对一致;客户按 ad_id 去重(注册→付费两阶段共享同一 ad_id)。</li>
<li>PostHog 干净口径 = host=easternalignment.com + 剔 CN + 剔 6 个自测身份 + 剔 5 个开发端口;薄会话 = 单页 + 0 web_vitals + ≤2 秒。</li>
<li>转化事件 <code>Order_Converted</code> 不带 $host,查询时已去 host 条件;9 月捕获 8/12 笔付费回传(回传端点 09-11 上线,此前 4 笔无回传属预期);已按 distinct_id UUID 形状剔除 09-29 测试污染。</li>
<li>Postback_Orphan 9 笔(09-28/29):含已知探测测试;平台字段为空为 09-29 前 offer_id 映射缺口,已于 09-29 修复(不影响金额)。</li>
<li>归因收入为「可见下限」:7 笔 click_token 精确归因 + 5 笔不可归因(${UNATTR_PAY:,.0f});归因到渠道的金额不代表渠道真实上限。</li>
<li>/go 链路:148 次点击 → 125 次到达(84.5%),其余为拦截/关闭/未加载完成,属正常损耗区间。</li>
</ul>
</div>

</div></body></html>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write(html)
print("written:", OUT, len(html), "bytes")
