# -*- coding: utf-8 -*-
"""2026-09-28 晚间版：今日流量 + barges 后台 PG 注册转化归因（自包含 HTML，浅色主题）"""
import json, os, math

OUT = r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis\results"
DST = r"C:\Users\samja\Desktop\site\easternalignment\scratch\traffic-pg-conversion-20260928.html"


def j(n):
    return json.load(open(os.path.join(OUT, n + ".json"), encoding="utf-8"))


def rows(name, cols):
    x = j(name)
    ci = {c: i for i, c in enumerate(x["columns"])}
    return [tuple(r[ci[c]] for c in cols) for r in x["results"]]


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------- 数据 ----------
daily = rows("daily_clean", ["day", "users", "sessions", "pageviews", "aff_clicks"])[::-1]
thin7 = rows("thin_7d", ["day", "sessions", "thin", "zero_vitals"])
chan = rows("today_channels", ["channel", "sessions", "total_clicks", "cvr_pct"])
geo = rows("today_geo", ["country", "dev", "sessions", "clicks"])
entry = rows("today_entry", ["entry", "ref", "sessions", "total_clicks", "cvr_pct"])
clicks = rows("today_clicks", ["t", "page", "pos", "slug", "token", "txt", "tms", "first_click", "seq"])
sess = rows("today_sessions", ["t", "country", "dev", "br", "ref", "utm", "entry", "pv", "vit", "dur", "clicks", "pid"])
raw = rows("daily_raw", ["day", "users", "sessions", "pageviews", "aff_clicks"])
t_sum = j("today_summary")["results"][0]  # sessions, thin, zero_vitals, pageviews
wins = [j("win_d%d" % o)["results"][0] for o in range(1, 8)]  # d-1..d-7

TODAY = [21, 16, 33, 10]  # sessions, users, pageviews, clicks（今日 00:00→19:13）
LBL = ["会话", "用户", "浏览量", "联盟点击"]
prev_mean = [sum(w[i] for w in wins) / 7 for i in range(4)]


def zs(t, arr):
    s = sum(arr)
    d = (t + s) ** 0.5
    return (t - s / 7) / d if d else 0.0


Z = [zs(TODAY[i], [w[i] for w in wins]) for i in range(4)]

# 用户 A（PG）旅程
A_EV = [
    ("06:14:23", "会话1 开始", "落 /reviews/purple-garden/tattooed-psychic/（chatgpt.com 引荐，无 referrer）", ""),
    ("06:15:46", "★ 点击 1", "Tattooed Psychic 页 · inline 内嵌 CTA", "决策 82.6s"),
    ("06:18:07", "★ 点击 2", "同页 · side-tab 侧边标签", "决策 224.2s（本会话第 2 次点击）"),
    ("06:31:32", "翻页", "→ /guides/best-mediums-on-purple-garden/", ""),
    ("06:32:20", "★ 点击 3", "指南页 · hero 首屏", "决策 47.8s"),
    ("06:32:56", "重载", "指南页再次进入（web vitals 第二组）", ""),
    ("06:33:28", "★ 点击 4", "指南页 · hero 首屏（再次）", "决策 31.5s"),
    ("06:34:45", "翻页", "→ /reviews/purple-garden/niki-medium/", ""),
    ("06:35:32", "翻页", "→ /reviews/purple-garden/psychic-advisor-serena/", ""),
    ("06:36:52", "★ 点击 5", "Serena 页 · end 文末 CTA", "决策 79.6s"),
    ("06:37:11", "回访", "→ 指南页（第 3 次）", ""),
    ("06:38:44", "会话1 结束", "停留 24m21s · 7 浏览 · 12 vitals · 5 点击", ""),
    ("07:25:02", "会话2 开始", "再次直落指南页（距上次 46 分钟）", ""),
    ("07:25:36", "★ 点击 6", "指南页 · side-tab", "决策 33.8s"),
    ("07:29:17", "翻页", "→ Tattooed Psychic 页", ""),
    ("07:29:43", "★ 点击 7", "Tattooed Psychic 页 · end 文末", "决策 25.8s"),
    ("08:18:01", "会话3 开始", "第 3 次回访指南页", ""),
    ("08:18:13", "★ 点击 8", "指南页 · above-fold「Claim $30 Credit」", "决策 11.8s（12 秒会话）"),
    ("09:05:57", "会话4", "打开指南页即离开（23 毫秒、0 vitals、0 点击）", ""),
    ("11:16:20", "会话5 开始", "第 5 次回访指南页", ""),
    ("11:16:26", "★ 点击 9", "指南页 · **topbar 顶栏**「Purple Garden Special Offer — $30 in FREE credit」", "决策 5.9s · 本日最后一次点击"),
    ("12:29:49", "会话6", "打开指南页 1.2 秒后离开（0 点击）", ""),
]
A_CLICKS = [
    ("06:15:46", "axzuuf", "purple-garden-tattooed-psychic", "inline", "tattooed-psychic 评测页", 82.6),
    ("06:18:07", "bxteue", "purple-garden-tattooed-psychic", "side-tab-purplegarden", "tattooed-psychic 评测页", 224.2),
    ("06:32:20", "gtos2m", "purple-garden（平台级）", "hero", "best-mediums 指南页", 47.8),
    ("06:33:28", "a8e1j4", "purple-garden（平台级）", "hero", "best-mediums 指南页", 31.5),
    ("06:36:52", "oohwi6", "purple-garden-serena", "end", "serena 评测页", 79.6),
    ("07:25:36", "y05dms", "purple-garden（平台级）", "side-tab-purplegarden", "best-mediums 指南页", 33.8),
    ("07:29:43", "1cpyim", "purple-garden-tattooed-psychic", "end", "tattooed-psychic 评测页", 25.8),
    ("08:18:13", "lm09dl", "purple-garden-serena", "above-fold", "best-mediums 指南页", 11.8),
    ("11:16:26", "484cmo", "purplegarden（平台级）", "topbar", "best-mediums 指南页", 5.9),
]
B_EV = [
    ("18:54:29", "会话开始", "Google 搜索 → /reviews/kasamba/love-specialist-isabelle-kasamba-review/", ""),
    ("18:54:35", "web vitals", "页面渲染完成", ""),
    ("18:55:02", "★ 点击", "该页 · **sidebar-deal** 侧栏优惠卡「Claim 3 Free Minutes →」", "决策 33.3s · 会话内第 1 次点击"),
    ("18:55:02", "/go 到达", "→ /go/kasamba-love-specialist-isabelle/ （offer_id=191 → kasamba.com）", "aff_go_hit 确认"),
    ("18:55:08", "停留", "点击后仍在本页 2m25s（点击 ≠ 离开）", ""),
    ("18:57:27", "会话结束", "停留 2m58s · 1 浏览 · 3 vitals · 1 点击", ""),
]

# ---------- SVG ----------
def svg_bars(data, labels, w=900, h=210, pad=(40, 16, 34, 46), color="#2f6fed", hi=None, hi_color="#dc2626",
             ylab=""):
    l, r, t, b = pad
    n = len(data)
    mx = max(data) or 1
    iw, ih = w - l - r, h - t - b
    step = iw / n
    bw = max(3.0, step * 0.6)
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    for g in range(5):
        y = t + ih - ih * g / 4
        o.append(f'<line x1="{l}" y1="{y:.1f}" x2="{l+iw}" y2="{y:.1f}" stroke="#e6eaf2"/>')
        o.append(f'<text x="{l-8}" y="{y+4:.1f}" font-size="11" fill="#8b93a5" text-anchor="end">{mx*g/4:.0f}</text>')
    for i, v in enumerate(data):
        x = l + step * i + (step - bw) / 2
        bh = ih * v / mx
        c = hi_color if (hi is not None and i == hi) else color
        o.append(f'<rect x="{x:.1f}" y="{t+ih-bh:.1f}" width="{bw:.1f}" height="{max(bh,0.8):.1f}" rx="2" fill="{c}"/>')
        o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih-bh-4:.1f}" font-size="10" fill="#5a6274" text-anchor="middle">{v:.0f}</text>')
        o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih+15:.1f}" font-size="10" fill="#8b93a5" text-anchor="middle">{labels[i]}</text>')
    o.append(f'<text x="{l}" y="{t-8}" font-size="11" fill="#8b93a5">{ylab}</text>')
    o.append("</svg>")
    return "".join(o)


def svg_hbars(items, w=900, rowh=28, color="#2f6fed", lab=110, unit=""):
    h = rowh * len(items) + 16
    mx = max(v for _, v, *_ in items) or 1
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    for i, it in enumerate(items):
        name, v = it[0], it[1]
        tail = it[2] if len(it) > 2 else ""
        y = 8 + i * rowh
        bw = (w - lab - 190) * v / mx
        o.append(f'<text x="{lab-8}" y="{y+15}" font-size="12" fill="#3d4453" text-anchor="end">{esc(name)}</text>')
        o.append(f'<rect x="{lab}" y="{y+4}" width="{max(bw,1):.1f}" height="14" rx="3" fill="{color}" opacity="{0.95-0.1*i if i<5 else 0.5}"/>')
        o.append(f'<text x="{lab+bw+8:.1f}" y="{y+15}" font-size="12" fill="#5a6274">{v:g}{unit} {esc(tail)}</text>')
    o.append("</svg>")
    return "".join(o)


def svg_timeline(events, w=900, rowh=30):
    h = rowh * len(events) + 20
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    o.append(f'<line x1="86" y1="14" x2="86" y2="{h-14}" stroke="#dfe4ee" stroke-width="2"/>')
    for i, (t, kind, desc, extra) in enumerate(events):
        y = 16 + i * rowh
        star = kind.startswith("★")
        col = "#c2410c" if star else "#5a6274"
        o.append(f'<circle cx="86" cy="{y+8}" r="{5 if star else 3.5}" fill="{col}"/>')
        o.append(f'<text x="78" y="{y+12}" font-size="11" fill="{col}" text-anchor="end">{esc(t)}</text>')
        o.append(f'<text x="102" y="{y+12}" font-size="12" font-weight="600" fill="{col}">{esc(kind)}</text>')
        o.append(f'<text x="200" y="{y+12}" font-size="12" fill="#3d4453">{esc(desc)}</text>')
        if extra:
            o.append(f'<text x="{w-8}" y="{y+12}" font-size="11" fill="#8b93a5" text-anchor="end">{esc(extra)}</text>')
    o.append("</svg>")
    return "".join(o)


# ---------- 计算 ----------
d30_labels = [d[0][5:] for d in daily]
d30_clicks = [d[4] for d in daily]
d30_sess = [d[2] for d in daily]
hi_idx = len(daily) - 1

win_rows = "".join(
    f"<tr><td>{['今天'][0] if i==0 else ''}</td>"
    f"<td>{TODAY[j]}</td><td>{prev_mean[j]:.1f}</td><td class='{'pos' if Z[j]>2 else ('neg' if Z[j]<-2 else '')}'>{Z[j]:+.2f}</td>"
    f"<td>{'显著' if abs(Z[j])>2 else '噪声内'}</td></tr>".replace("<td></td>", f"<td>{LBL[j]}</td>", 1)
    for i in range(1) for j in range(4)
)
# 重组窗口表（每行一个指标，更可读）
win_rows = "".join(
    f"<tr><td>{LBL[i]}</td><td class='num'>{TODAY[i]}</td><td class='num'>{prev_mean[i]:.1f}</td>"
    f"<td class='num {'pos' if Z[i] > 2 else ('neg' if Z[i] < -2 else '')}'>{Z[i]:+.2f}</td>"
    f"<td>{'显著变化' if abs(Z[i]) > 2 else '噪声内（无异常）'}</td></tr>"
    for i in range(4)
)

click_rows = "".join(
    f"<tr><td>{esc(c[0])}</td><td class='mono'>{esc(c[4])}</td><td>{esc(c[2])}</td>"
    f"<td class='mono'>{esc(c[3])}</td><td>{esc(c[1])}</td><td class='num'>{c[5]}s</td></tr>"
    for c in ((r[0], r[4], r[3], r[2], r[5], r[6]) if False else None,) if False
)
# 上面写法易错，改为直接构造
click_rows = "".join(
    f"<tr><td>{esc(r[0][11:19])}</td><td class='mono'>{esc(r[4])}</td><td>{esc(r[3])}</td>"
    f"<td class='mono'>{esc(r[2])}</td><td>{esc(r[0][:10])}</td><td class='num'>{int(r[6])/1000:.1f}s</td></tr>"
    for r in clicks
)
A_click_rows = "".join(
    f"<tr><td>{esc(c[0])}</td><td class='mono'>{esc(c[1])}</td><td>{esc(c[2])}</td><td class='mono'>{esc(c[3])}</td>"
    f"<td>{esc(c[4])}</td><td class='num'>{c[5]}s</td></tr>" for c in A_CLICKS)

chan_bars = svg_hbars([(c[0], c[1], f"· 点击 {c[2]} · 会话点击率 {c[3]}%")for c in chan], color="#2f6fed", lab=90)
geo_bars = svg_hbars([(f"{g[0]} / {g[1]}", g[2], f"· 点击 {g[3]}") for g in geo], color="#5b8def", lab=150)
entry_rows = "".join(
    f"<tr><td class='mono'>{esc(e[0])}</td><td>{esc(e[1])}</td><td class='num'>{e[2]}</td>"
    f"<td class='num'>{e[3]}</td><td class='num'>{e[4]}%</td></tr>" for e in entry)

spark_clicks = svg_bars(d30_clicks, d30_labels, h=190, color="#94b3f0", hi=hi_idx, hi_color="#dc2626",
                        ylab="近 20 日 联盟点击（红=今日，截至 19:13 未满日）")
spark_sess = svg_bars(d30_sess, d30_labels, h=190, color="#b9cdf5", hi=hi_idx, hi_color="#dc2626",
                      ylab="近 20 日 会话数（干净口径，红=今日）")

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>今日流量 + barges 后台 PG 注册转化归因 · 2026-09-28</title>
<style>
:root{{--ink:#1c2230;--sub:#5a6274;--line:#e6eaf2;--bg:#f7f9fc;--card:#fff;--accent:#2f6fed;--warn:#c2410c;--ok:#15803d;--bad:#b91c1c}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}}
.wrap{{max-width:1040px;margin:0 auto;padding:28px 20px 80px}}
h1{{font-size:25px;margin:0 0 6px}}
h2{{font-size:18px;margin:34px 0 12px;padding-left:10px;border-left:4px solid var(--accent)}}
h3{{font-size:15px;margin:20px 0 8px;color:#2b3446}}
.meta{{color:var(--sub);font-size:13px;margin-bottom:18px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:12px 0;box-shadow:0 1px 2px rgba(20,30,60,.04)}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:14px 0}}
.kpi{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}}
.kpi .v{{font-size:26px;font-weight:700;letter-spacing:-.5px}}
.kpi .l{{font-size:12px;color:var(--sub);margin-top:2px}}
.kpi .s{{font-size:11.5px;color:#8b93a5;margin-top:4px}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{background:#f2f5fb;color:#3d4453;font-weight:600;font-size:12.5px}}
td.num,th.num{{text-align:right;font-variant-numeric:tabular-nums}}
.mono{{font-family:ui-monospace,Consolas,monospace;font-size:12px}}
.pos{{color:var(--bad);font-weight:600}}   /* 上升用红（中国习惯） */
.neg{{color:var(--ok);font-weight:600}}
.tag{{display:inline-block;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:#f2f5fb;color:#3d4453;margin-right:6px}}
.tag.warn{{background:#fff4ec;border-color:#f6d3ba;color:#9a3412}}
.tag.ok{{background:#eefaf1;border-color:#c7ecd4;color:#15803d}}
.note{{background:#fffaf0;border:1px solid #f2e0bd;border-left:4px solid #d99b28;border-radius:8px;padding:12px 14px;font-size:13.5px;margin:12px 0}}
.note.bad{{background:#fff5f5;border-color:#f2cccc;border-left-color:#c2410c}}
.note.good{{background:#f2fbf5;border-color:#c7ecd4;border-left-color:#15803d}}
ul{{margin:8px 0 8px 20px;padding:0}}li{{margin:5px 0}}
.small{{font-size:12.5px;color:var(--sub)}}
.mono-inline{{font-family:ui-monospace,Consolas,monospace;background:#f2f5fb;padding:1px 5px;border-radius:4px;font-size:12px}}
.legend span{{display:inline-block;margin-right:14px;font-size:12px;color:var(--sub)}}
.sw{{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}}
</style></head><body><div class="wrap">

<h1>今日流量 + barges 后台 PG 注册转化归因</h1>
<div class="meta">站点 easternalignment.com（PostHog Project 532954）· 口径：干净口径（剔 CN / 自测 / 本地开发来源）· 数据截至 <b>2026-09-28 19:13 BJT</b>（当日未满，所有「今日」数字均为 00:00→19:13 的累计值）</div>

<h2>一、结论摘要</h2>
<div class="card">
<ul>
<li><b>今日流量正常，无异常波动。</b>会话 21、用户 16、浏览量 33、联盟点击 10；与前 7 日同时段均值逐项比较，四项泊松 z 值全部落在 ±1.0 内 → <b>无显著变化</b>。</li>
<li><b>今日点击高度集中：10 次点击只来自 2 个人。</b>其中 9 次来自同 1 个美国 iPhone 用户，全部指向 Purple Garden（offer_id=30）。</li>
<li><b>PostHog 侧今日没有任何转化回传</b>（最近一条是 <span class="mono-inline">2026-09-27 12:25:31</span>，Keen $50）。这符合已知事实：<b>$0 注册类 postback 至今未接通</b>，注册只存在于 barges 后台，PostHog 看不到 → 所以本次归因<b>只能靠 slug / 平台一致性 + 时间邻近</b>推断，无法用 token 精确锁定。</li>
<li><b>后台那笔 PG 注册（19:00）在平台上只能指向一个候选：<span class="mono-inline">5d320aa9-39cc-5b64-9997-e9c373fc0649</span></b>——今日唯一点击过 PG 链接的人（9 次点击、全部 PG）。</li>
<li><b>但时间轴对不上，这是本次唯一未闭合的点。</b>按本项目实测常数（Kasamba/PG 点击→$0 记录滞后 <b>58.8–68.6 分钟</b>），19:00 的记录应对应 <b>17:51–18:01</b> 的一次点击，而今日该窗口<b>没有任何点击</b>。候选人的最后一次 PG 点击在 11:16:26（滞后 7h44m）。<b>需要用后台那一行的 sub id 定案</b>（见第六节，两个候选的 sub id 值已经算好）。</li>
</ul>
</div>

<h2>二、今日流量核心指标（00:00 → 19:13）</h2>
<div class="kpis">
<div class="kpi"><div class="v">21</div><div class="l">会话 sessions</div><div class="s">未过滤口径 27（含 CN/自测/mysticdo）</div></div>
<div class="kpi"><div class="v">16</div><div class="l">用户（去重 person）</div><div class="s">未过滤 22</div></div>
<div class="kpi"><div class="v">33</div><div class="l">浏览量 pageviews</div><div class="s">未过滤 48</div></div>
<div class="kpi"><div class="v">10</div><div class="l">联盟点击</div><div class="s">去重<b>仅 2 人</b> · 关联 5 个会话</div></div>
<div class="kpi"><div class="v">3 / 21</div><div class="l">薄会话占比</div><div class="s">14.3%（09-27 为 11/30=37%）</div></div>
<div class="kpi"><div class="v">100%</div><div class="l">/go 到达率</div><div class="s">10 点击 → 10 次 aff_go_hit，blocked 0</div></div>
</div>

<h3>等长时段对比：今日 vs 前 7 日同一时段（00:00→19:13）</h3>
<table>
<thead><tr><th>指标</th><th class="num">今日</th><th class="num">前 7 日均值</th><th class="num">泊松 z</th><th>判定</th></tr></thead>
<tbody>{win_rows}</tbody></table>
<div class="small" style="margin-top:8px">前 7 日同时段逐日样本（会话/用户/浏览/点击）：{"; ".join(f"09-{d} <span class='mono-inline'>{w[0]}/{w[1]}/{w[2]}/{w[3]}</span>" for d, w in zip([27,26,25,24,23,22,21], wins))}</div>

<h3>近 20 日走势</h3>
{spark_sess}
{spark_clicks}
<div class="small">09-20 的会话/浏览尖峰为已知机器流量簇（109 会话）；09-28 为当日未满日，柱高不可与其他整日直接比较。</div>

<h2>三、渠道 / 地域 / 入口页</h2>
<h3>渠道结构（今日）</h3>
{chan_bars}
<div class="note"><b>判读：</b>AI 助手渠道 9 个会话贡献了 9 次点击（会话点击率 44.4%），搜索引擎 10 个会话只出 1 次点击（10%）。这与本项目长期结论一致——<b>AI 引荐的意图层级显著深于搜索</b>；今日的转化候选人也正是 ChatGPT 引荐用户。</div>

<h3>地域 × 设备</h3>
{geo_bars}
<div class="small">US 移动端 12 会话 9 点击（全部来自候选人 A）；GB 桌面 1 会话 1 点击（候选人 B，走 Google 搜索）。</div>

<h3>入口页</h3>
<table><thead><tr><th>入口页</th><th>来源</th><th class="num">会话</th><th class="num">点击</th><th class="num">会话点击率</th></tr></thead>
<tbody>{entry_rows}</tbody></table>

<h2>四、今日全部联盟点击（10 次 / 2 人）</h2>
<table><thead><tr><th>时间(BJT)</th><th>slug</th><th>CTA 位置</th><th>click_token</th><th>页面</th><th class="num">决策时长</th></tr></thead>
<tbody>{click_rows}</tbody></table>
<div class="small">决策时长 = <span class="mono-inline">time_on_page_ms</span>。9 次 PG 点击中有 7 次决策时长 ≥ 11.8s，属于「高意愿权衡」而非扫射式无效点击。</div>

<h2>五、转化归因：这 19:00 的 PG 注册是谁？</h2>

<div class="note bad">
<b>前置事实（决定了本次归因的天花板）：</b>
<ul>
<li>barges 后台的 <b>$0 注册回传至今未接通</b>，PostHog 里只有 $125 / $50 付费回传。所以「后台有注册、PostHog 无记录」是<b>预期现象，不是埋点坏了</b>。</li>
<li>因此不能用 <span class="mono-inline">click_token</span> 做精确归因，只能用<b>平台一致性（slug）+ 时间邻近</b>做推断。本项目对无 token 转化的分级标准：<b>A 级 ≤ 90 分钟</b>（可信）／B 级 90 分–12 小时（仅供参考）／C 级 窗口内无匹配（弃用）。</li>
</ul>
</div>

<h3>候选 A（平台吻合 · 推荐）— 美国 iPhone 用户，9 次 PG 点击</h3>
<div class="card">
<p><b>身份：</b><span class="mono-inline">5d320aa9-39cc-5b64-9997-e9c373fc0649</span> ｜ 美国 ｜ iPhone / iOS 18.7 / Mobile Safari ｜ 时区 <span class="mono-inline">America/Chicago</span> ｜ 来源 <span class="mono-inline">utm_source=chatgpt.com</span>（referrer 为空）｜ 全站首次访问即为今日</p>
<p><b>点击 ID（= 后台 sub id 的前缀）：</b><span class="mono-inline">01a0e4ee-ffe5-714b-bca7-fa56afa674f9</span>（该 UUIDv7 内嵌时间戳 = 06:14:23 BJT，即首访时刻）</p>
<p><b>行为规模：</b>6 个会话、15 次浏览、8 次 web vitals 上报组、<b>9 次联盟点击</b>，跨度 06:14:23 → 12:29:50 BJT（当地 22:14 → 23:29，一个深夜连续比价场景）。<b>只看了 Purple Garden 相关内容</b>（指南页 + 3 个解读师评测页），从未访问首页、从未使用匹配测验。</p>
<table><thead><tr><th>时间(BJT)</th><th>click_token</th><th>slug</th><th>CTA 位置</th><th>页面</th><th class="num">决策时长</th></tr></thead>
<tbody>{A_click_rows}</tbody></table>
<div class="small">9 次点击全部产生 <span class="mono-inline">aff_go_hit</span> → 100% 到达 /go。只有 06:18:07 那次是会话内第 2 次点击（先试 inline、30 秒后改点侧栏），其余 8 次均为会话内首次点击。</div>
</div>

<h3>候选 A 的完整旅程时间线</h3>
{svg_timeline(A_EV)}

<h3>候选 B（时间吻合 · 但平台不符）— 英国桌面用户</h3>
<div class="card">
<p><b>身份：</b><span class="mono-inline">03b26245-b83a-592d-8ac7-7ae647d7d3af</span> ｜ 英国 ｜ Windows 桌面 / Chrome 154 ｜ 时区 <span class="mono-inline">Europe/London</span> ｜ 来源 <span class="mono-inline">www.google.com</span> 搜索</p>
<p><b>点击 ID：</b><span class="mono-inline">01a0e7a6-e470-7a88-bc91-89668d92b4b5</span>（UUIDv7 内嵌时间戳 = 18:54:29 BJT）</p>
<p>单会话，18:54:29 → 18:57:27（2m58s），1 次浏览、3 次 vitals、1 次点击。落地于 <span class="mono-inline">/reviews/kasamba/love-specialist-isabelle-kasamba-review/</span>，停留 33.3 秒后点击侧栏优惠卡的 <b>「Claim 3 Free Minutes →」</b>，跳到 <span class="mono-inline">/go/kasamba-love-specialist-isabelle/</span>（<b>offer_id=191 → kasamba.com</b>）。点击后仍在本页停留 2 分 25 秒。</p>
<div class="note"><b>为什么列出来：</b>它的 <b>18:55:02</b> 是今日离 19:00 最近的一次出站点击（相距 5 分钟），而且 CTA 文案「Claim 3 Free Minutes」正好是 Kasamba 的 $0 注册类 offer。<b>但它的 slug 属于 Kasamba（offer 191），不是 PG（offer 30）</b>。若后台那一行的「广告单」列你读到的确是 PG，则候选 B 应当排除。</div>
</div>
{svg_timeline(B_EV)}

<h3>时间轴为什么不闭合（必须知道）</h3>
<table>
<thead><tr><th>假设的后台时刻</th><th>按常数反推的点击窗口</th><th>今日该窗口内的实际点击</th><th>结论</th></tr></thead>
<tbody>
<tr><td>19:00 BJT（今晚，最可能）</td><td>17:51 – 18:01</td><td><b>无</b>（最近的是 18:55:02，且为 Kasamba）</td><td>与常数不符</td></tr>
<tr><td>07:00 BJT（今晨）</td><td>05:51 – 06:01</td><td>无（今日首次点击 06:15:46）</td><td>差 15 分钟，边缘</td></tr>
<tr><td>若后台按用户当地时区显示（Chicago, UTC-5）19:00</td><td>换算为 08:00 BJT（次日）</td><td>——</td><td>晚于当前时刻，不可能</td></tr>
</tbody></table>
<div class="note warn"><b>两种自洽的解释，二选一：</b>
<ul>
<li><b>解释①（偏向候选 A）：</b>后台时间确为 BJT 19:00，那笔注册的真实来源是<b>一次未被 PostHog 记录的出站点击</b>（例如 17:51–18:01 之间在某台设备上直接点开 PG，或只点了未被跟踪的入口）。此时只能靠后台 sub id 认人——A 的 click_id 前缀为 <span class="mono-inline">01a0e4ee-…</span>。</li>
<li><b>解释②（偏向候选 B）：</b>后台显示的是<b>另一时区的 07:00</b>（如 UTC-5 的 07:00 = 20:00 BJT），则点击窗口落在 18:51–19:01 → 命中 18:55:02 那次点击（滞后 65 分钟，完美落在常数区间内）。但该点击的平台是 Kasamba。</li>
</ul>
<b>我的判断：</b>以「平台 = PG」为准 → 候选 A（<span class="mono-inline">5d320aa9</span>）。这也是昨日 09:37 分析就已经预判的样本（当时日志原话：待回看 09-29 的 PG 后台记录，作为「ChatGPT 引荐 × 中型/灵媒页面」组合的首个完整样本）。</div>

<h2>六、需要你确认的一件事（30 秒可定案）</h2>
<div class="card">
<p>请把 barges 后台那一行的 <b>sub id / click id / 交易 ID</b> 列发我（形如 <span class="mono-inline">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.xxxxxx</span>）。前缀是浏览器级 click_id（UUIDv7，内嵌毫秒时间戳），后缀是当次点击的 token。对照表：</p>
<table><thead><tr><th>后台 sub id 前缀</th><th>对应人</th><th>对应点击时刻</th><th>平台</th></tr></thead>
<tbody>
<tr><td class="mono">01a0e4ee-ffe5-714b-bca7-…</td><td>候选 A · 美国 iPhone（ChatGPT 引荐）</td><td>06:14:23 起共 9 次点击，后缀可见 {esc(" / ".join(c[1] for c in A_CLICKS))}</td><td>Purple Garden</td></tr>
<tr><td class="mono">01a0e7a6-e470-7a88-bc91-…</td><td>候选 B · 英国桌面（Google 搜索）</td><td>18:55:02，后缀 <span class="mono-inline">wttqy0</span></td><td>Kasamba</td></tr>
</tbody></table>
<p class="small">同时建议一并确认该行的「时间」列显示的是 <b>19:00</b> 还是 <b>07:00</b>——这直接决定是「滞后 7h44m 的异常样本」还是「另一时区的正常样本」，对后续把这条常数当异常检测阈值用很关键。</p>
</div>

<h2>七、行动项</h2>
<div class="card">
<ul>
<li><span class="tag warn">P0</span><b>补 $0 / Lead 注册回传</b>（barges 侧配置）。这是目前最大的可见度缺口：注册全都在后台、PostHog 一条都看不到，导致每次注册类转化都只能靠时间推断，且这次直接推断不闭合。</li>
<li><span class="tag">P1</span><b>明日 19:00 后复核这笔注册是否升级为 $125</b>。Kasamba / PG 的 signup→paid 升级窗口约 23–24 小时，且后台会留下<b>两行同一交易号</b>（$0 注册 → $125 付费）——<b>累计营收必须按交易号去重</b>，别把一笔算成两笔。</li>
<li><span class="tag">P1</span>若后台时间口径确为「非东八区」，请告知具体时区，我会把它写进对账手册，并把滞后常数拆分记录。</li>
<li><span class="tag ok">观察</span>今日 9 次 PG 点击全部由 ChatGPT 引荐的单个用户产生，且指向 <span class="mono-inline">/guides/best-mediums-on-purple-garden/</span> + 中型/解读师评测页。若这笔注册成立，它会是「AI 引荐 × PG 灵媒页」的首个完整正样本，值得作为内容扩产方向的证据。</li>
</ul>
</div>

<h2>八、口径附录</h2>
<div class="card small">
<ul>
<li><b>站点隔离：</b>仅 <span class="mono-inline">$host = easternalignment.com</span>；剔除 <span class="mono-inline">$geoip_country_code = CN</span>、本地开发来源（localhost:4321 / 127.0.0.1:8188 / 8765 / 8931 / 4923 / 4321 等）、已知自测身份。</li>
<li><b>转化类事件（Order_Converted / aff_go_hit）不带 <span class="mono-inline">$host</span></b>，其查询一律去掉 host 条件（仅用 CN + 自测过滤），否则会得到「0 转化」的假结论。本报告的「今日全部点击」核验做过无过滤对照，结果一致（同为 10 条）。</li>
<li><b>时间：</b>全部按 <span class="mono-inline">toTimeZone(timestamp,'Asia/Shanghai')</span> 渲染；过滤用 Python 预先算好的 epoch 整数。</li>
<li><b>滞常常数（本项目实测）：</b>Kasamba / PG 点击 → $0 记录 <b>58.8–68.6 分钟</b>（均值 63.5，σ=3.3，n=6）；Keen 点击 → 记录 4.6 / 8.6 分钟。付费：Kasamba / PG 约 24 小时（点击→注册 60 分 + 注册→付费 24 小时窗口），Keen 多为点击即付费。</li>
<li><b>Sub id 结构：</b><span class="mono-inline">&lt;click_id&gt;.&lt;click_token&gt;</span>，click_id = 浏览器级 distinct_id（UUIDv7，前 48 位为毫秒时间戳，可反解首次落地时刻）；click_token 唯一标识单次点击。</li>
<li><b>数据文件：</b>原始结果落盘于 <span class="mono-inline">posthog_analysis/results/*.json</span>（tt_conv_today / tt_clicks_pm / tt_sess_eve / trace_p1 / trace_p2 / all_clicks_today / conv_30d 等），可复现。</li>
</ul>
</div>

<div class="small" style="margin-top:26px">报告生成：2026-09-28 19:20 BJT · 数据源 PostHog 532954（只读 personal API key，运行时从本地手册读取，未落盘）</div>
</div></body></html>
"""

os.makedirs(os.path.dirname(DST), exist_ok=True)
with open(DST, "w", encoding="utf-8") as f:
    f.write(HTML)
print("written:", DST, len(HTML), "chars")
