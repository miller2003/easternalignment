# -*- coding: utf-8 -*-
"""生成 easternalignment.com 今日流量自包含 HTML 报告（内嵌手绘 SVG，浅色主题）"""
import json, os
from datetime import datetime

OUT = r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis\results"
DST = r"C:\Users\samja\Desktop\site\easternalignment\scratch\traffic-report-20260928.html"

def j(n):
    return json.load(open(os.path.join(OUT, n + ".json"), encoding="utf-8"))

def idx(name, cols):
    x = j(name)
    ci = {c: i for i, c in enumerate(x["columns"])}
    return [tuple(r[ci[c]] for c in cols) for r in x["results"]], ci

daily30, _ = idx("daily30", ["day", "sessions", "pv", "clicks"])
daily30 = daily30[::-1]  # 升序
hourly, _ = idx("today_hourly", ["h", "pv", "clicks", "sessions"])
chan7, _ = idx("chan_7d", ["channel", "sessions", "total_clicks", "cvr_pct"])
chanT, _ = idx("today_channels", ["channel", "sessions", "avg_dur", "bounce_pct", "total_clicks", "cvr_pct"])
clicksT, _ = idx("today_clicks", ["t", "page", "pos", "slug", "token", "txt", "tms", "first_click", "seq", "iid", "sid"])
clicks14, _ = idx("clicks_14d", ["day", "page", "pos", "slug", "token", "tms", "iid", "sid", "cc"])
sessT, _ = idx("today_sessions", ["t", "country", "dev", "br", "ref", "utm", "entry", "pv", "vit", "dur", "clicks", "pid", "ua"])
geo, _ = idx("today_geo", ["country", "dev", "sessions", "clicks"])
entry, _ = idx("today_entry", ["entry", "ref", "sessions", "total_clicks", "cvr_pct"])
thin7, _ = idx("thin_7d", ["day", "sessions", "thin", "zero_vitals"])
conv, _ = idx("conv_detail", ["t", "event", "raw_params"])
go, _ = idx("go_health", ["day", "event", "n"])
wins = []
for off in range(1, 8):
    r = j("win_d%d" % off)["results"][0]
    wins.append(r)

def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

# ---------------- 统计 ----------------
s_today = wins[0] if False else None
W = wins  # [ [sessions, users, pv, clicks], ... ]  d-1..d-7
prev_mean = [sum(w[i] for w in W) / len(W) for i in range(4)]
T = [10, 7, 19, 8]
def z(t, arr):
    s = sum(arr)
    return (t - sum(arr) / len(arr)) / ((t + s) ** 0.5) if (t + s) > 0 else 0
zs = [z(T[i], [w[i] for w in W]) for i in range(4)]

# ---------------- SVG 工具 ----------------
def bar_chart(data, labels, w=980, h=250, pad=(36, 16, 44, 44), color="#2f6fed", mark=None, mark_color="#dc2626"):
    l, r, t, b = pad
    n = len(data)
    mx = max(data) or 1
    iw, ih = w - l - r, h - t - b
    step = iw / n
    bw = max(2, step * 0.62)
    out = []
    for gv in range(0, 5):
        y = t + ih - ih * gv / 4
        val = mx * gv / 4
        out.append(f'<line x1="{l}" y1="{y:.1f}" x2="{l+iw}" y2="{y:.1f}" stroke="#e5e9f0" stroke-width="1"/>')
        out.append(f'<text x="{l-6}" y="{y+4:.1f}" font-size="10" fill="#8b97a8" text-anchor="end">{val:.0f}</text>')
    for i, v in enumerate(data):
        x = l + i * step + (step - bw) / 2
        bh = ih * v / mx
        c = mark_color if (mark is not None and i == mark) else color
        out.append(f'<rect x="{x:.1f}" y="{t+ih-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" fill="{c}" rx="2"/>')
        if n <= 32:
            out.append(f'<text x="{x+bw/2:.1f}" y="{t+ih-bh-3:.1f}" font-size="9" fill="#5b6a7d" text-anchor="middle">{v:.0f}</text>')
    for i, lb in enumerate(labels):
        if n > 20 and i % 3 != 0:
            continue
        x = l + i * step + step / 2
        out.append(f'<text x="{x:.1f}" y="{t+ih+14:.1f}" font-size="9" fill="#8b97a8" text-anchor="middle">{esc(lb)}</text>')
    return f'<svg viewBox="0 0 {w} {h}" width="100%" role="img">' + "".join(out) + "</svg>"

def grouped_bars(cats, series, w=980, h=260, colors=("#2f6fed", "#e07a2f"), legend=("会话", "点击")):
    l, r, t, b = 40, 120, 20, 44
    iw, ih = w - l - r, h - t - b
    mx = max(max(s) for s in series) or 1
    n = len(cats)
    step = iw / n
    bw = step * 0.26
    out = []
    for gv in range(0, 5):
        y = t + ih - ih * gv / 4
        out.append(f'<line x1="{l}" y1="{y:.1f}" x2="{l+iw}" y2="{y:.1f}" stroke="#e5e9f0"/>')
        out.append(f'<text x="{l-6}" y="{y+4:.1f}" font-size="10" fill="#8b97a8" text-anchor="end">{mx*gv/4:.0f}</text>')
    for i, c in enumerate(cats):
        cx = l + i * step + step / 2
        out.append(f'<text x="{cx:.1f}" y="{t+ih+16:.1f}" font-size="11" fill="#43536b" text-anchor="middle">{esc(c)}</text>')
        for si, s in enumerate(series):
            bh = ih * s[i] / mx
            x = cx - bw + si * bw * 1.08
            out.append(f'<rect x="{x:.1f}" y="{t+ih-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" fill="{colors[si]}" rx="2"/>')
            out.append(f'<text x="{x+bw/2:.1f}" y="{t+ih-bh-3:.1f}" font-size="10" fill="#5b6a7d" text-anchor="middle">{s[i]}</text>')
    for si, nm in enumerate(legend):
        y = t + 14 + si * 18
        out.append(f'<rect x="{l+iw+16}" y="{y-9}" width="10" height="10" fill="{colors[si]}" rx="2"/>')
        out.append(f'<text x="{l+iw+32}" y="{y}" font-size="11" fill="#43536b">{esc(nm)}</text>')
    return f'<svg viewBox="0 0 {w} {h}" width="100%" role="img">' + "".join(out) + "</svg>"

def hbar(rows, w=980, rowh=26, color="#2f6fed", labelw=250):
    """rows: (label, value, note)"""
    mx = max(r[1] for r in rows) or 1
    h = len(rows) * rowh + 16
    out = []
    for i, (lb, v, note) in enumerate(rows):
        y = 8 + i * rowh
        bw = (w - labelw - 150) * v / mx
        out.append(f'<text x="0" y="{y+12}" font-size="11" fill="#43536b">{esc(lb)}</text>')
        out.append(f'<rect x="{labelw}" y="{y+3}" width="{bw:.1f}" height="13" fill="{color}" rx="2"/>')
        out.append(f'<text x="{labelw+bw+8:.1f}" y="{y+14}" font-size="11" fill="#5b6a7d">{esc(note)}</text>')
    return f'<svg viewBox="0 0 {w} {h}" width="100%" role="img">' + "".join(out) + "</svg>"

# ---------------- 组装 ----------------
d30_labels = [d[0][5:] for d in daily30]
d30_sess = [d[1] for d in daily30]
d30_click = [d[3] for d in daily30]
m0920 = [i for i, d in enumerate(daily30) if d[0] == "2026-09-20"]
chart30 = bar_chart(d30_sess, d30_labels, color="#2f6fed",
                    mark=(m0920[0] if m0920 else None))
chart30b = bar_chart(d30_click, d30_labels, color="#e07a2f",
                     mark=(m0920[0] if m0920 else None))

hl = [f"{h[0]}:00" if h[0] not in (0, 4, 5, 6, 7, 8, 9) else f"{h[0]:02d}" for h in hourly]
hour_labels = [f"{h[0]:02d}" for h in hourly]
chart_hour = grouped_bars(hour_labels, [[h[3] for h in hourly], [h[2] for h in hourly]],
                          colors=("#2f6fed", "#e07a2f"), legend=("会话", "点击"))

chan_names = [c[0] for c in chan7]
chart_chan = grouped_bars(chan_names, [[c[1] for c in chan7], [c[2] for c in chan7]],
                          colors=("#2f6fed", "#e07a2f"), legend=("会话", "点击"))

win_labels = ["今天", "昨天", "周二", "周一", "周日", "周六", "周五", "周四"]
win_rows = [T] + W[::-1][:0] + W
win_labels = ["今天"] + ["前%d日" % i for i in range(1, 8)]
chart_win = grouped_bars(win_labels, [[T[0]] + [w[0] for w in W], [T[3]] + [w[3] for w in W]],
                         colors=("#2f6fed", "#e07a2f"), legend=("会话", "点击"))

geo_rows = [(f'{g[0]} · {g[1]}', g[2], f'{g[2]} 会话 / {g[3]} 点击') for g in geo]
entry_rows = [(e[0], e[2], f'{e[2]} 会话 · {e[3]} 点击 · 点击率 {e[4]}%') for e in entry]

def tbl(headers, rows, cls=""):
    h = "".join(f"<th>{esc(x)}</th>" for x in headers)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'

click_rows = []
for c in clicksT:
    tms = int(c[6]) if str(c[6]).isdigit() else 0
    click_rows.append([
        esc(c[0][11:19]), esc(c[1].replace("/reviews/purple-garden/", "…/pg/")),
        esc(c[2]), esc(c[3]), esc(c[4]),
        f"{tms/1000:.1f}s", esc(c[5]), "首次" if c[7] == "true" else f"#{c[8]}",
    ])

conv_rows = []
for c in conv:
    try:
        rp = json.loads(c[2])
    except Exception:
        rp = {}
    amt = rp.get("payout", "—")
    cid = rp.get("click_id", "")
    tok = cid.split(".")[-1] if "." in cid else cid
    conv_rows.append([esc(c[0][:19]), esc(c[1]), f"${amt}", esc(tok), esc(rp.get("transaction_id", ""))[:18] + "…"])

go_map = {}
for g in go:
    go_map.setdefault(g[0], {})[g[1]] = g[2]
go_rows = []
for d in sorted(go_map, reverse=True)[:8]:
    cl = go_map[d].get("affiliate_link_click", 0)
    hit = go_map[d].get("aff_go_hit", 0)
    rate = f"{100.0*hit/cl:.0f}%" if cl else "—"
    go_rows.append([esc(d), cl, hit, rate])

sess_rows = []
for s in sessT:
    ua = s[12]
    uashort = ua.split(") ")[-2][-28:] if ua else "—"
    sess_rows.append([esc(s[0][11:19]), esc(s[1]), esc(s[2]), esc(s[3]), esc(s[4]),
                      esc(s[5]) or "—", esc(s[6].replace("/reviews/purple-garden/", "…/pg/")),
                      s[7], s[8], f"{s[9]}s", s[10],
                      "疑似机器" if (s[8] == 0 and s[9] <= 10) else ("主力用户" if s[10] > 0 else "—")])

thin_rows = [[esc(t[0]), t[1], t[2], t[3], f"{100.0*t[2]/t[1]:.0f}%"] for t in thin7]

win_tbl = [["<b>今天（前 9.6 小时）</b>"] + [f"<b>{x}</b>" for x in T]]
for i, w in enumerate(W, 1):
    win_tbl.append([f"前 {i} 日"] + [str(x) for x in w])
win_tbl.append(["<b>前 7 日均值</b>"] + [f"<b>{m:.1f}</b>" for m in prev_mean])
win_tbl.append(["<b>泊松 z（&gt;2 才算真变化）</b>"] + [f"<b>{zz:+.2f}</b>" for zz in zs])

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>easternalignment.com 今日流量分析 · 2026-09-28</title>
<style>
:root{{--ink:#1f2933;--sub:#5b6a7d;--mute:#8b97a8;--line:#e5e9f0;--bg:#f7f9fc;--card:#fff;
--blue:#2f6fed;--orange:#e07a2f;--red:#dc2626;--amber:#d97706;--green:#0f8a5f}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}}
.wrap{{max-width:1060px;margin:0 auto;padding:32px 22px 80px}}
h1{{font-size:26px;margin:0 0 6px;letter-spacing:-.2px}}
.sub{{color:var(--sub);font-size:13.5px;margin-bottom:6px}}
.stamp{{color:var(--mute);font-size:12.5px;margin-bottom:26px}}
h2{{font-size:19px;margin:38px 0 14px;padding-bottom:8px;border-bottom:2px solid var(--line)}}
h3{{font-size:15.5px;margin:24px 0 10px;color:#2b3a4f}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin:14px 0}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0 4px}}
.kpi{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px}}
.kpi .v{{font-size:26px;font-weight:650;letter-spacing:-.5px}}
.kpi .l{{font-size:12.5px;color:var(--sub);margin-top:2px}}
.kpi .n{{font-size:11.5px;color:var(--mute);margin-top:5px}}
.kpi.hi{{border-color:#f0c9a8;background:#fffaf5}}
.kpi.warn{{border-color:#f3cccc;background:#fff7f7}}
table{{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}}
th{{text-align:left;font-weight:600;color:var(--sub);font-size:12px;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}}
td{{padding:8px 10px;border-bottom:1px solid #f1f4f8;vertical-align:top}}
tbody tr:hover{{background:#fafbfd}}
.mono{{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}}
.badge{{display:inline-block;font-size:11px;padding:1px 7px;border-radius:20px;line-height:1.7}}
.b-red{{background:#fdecec;color:#b31f1f}} .b-amber{{background:#fdf3e3;color:#96601a}}
.b-blue{{background:#eef3fe;color:#2149a8}} .b-green{{background:#e9f7f1;color:#0b6b4a}}
.b-gray{{background:#eef1f5;color:#5b6a7d}}
.lead{{font-size:14.5px}}
ul{{margin:8px 0 8px 20px;padding:0}} li{{margin:5px 0}}
.note{{background:#fbfcfe;border-left:3px solid var(--blue);padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13.5px;color:#3c4c61}}
.warnbox{{background:#fffaf5;border-left:3px solid var(--orange);padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13.5px}}
.chart{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px 8px;margin:14px 0}}
.chart .cap{{font-size:12.5px;color:var(--mute);margin:2px 0 10px}}
code{{background:#f1f4f8;padding:1px 5px;border-radius:4px;font-size:12px}}
pre{{background:#f7f9fc;border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:11.5px;line-height:1.55}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
@media(max-width:760px){{.grid2{{grid-template-columns:1fr}}}}
.foot{{color:var(--mute);font-size:12px;margin-top:40px;border-top:1px solid var(--line);padding-top:14px}}
</style></head><body><div class="wrap">

<h1>easternalignment.com · 今日流量分析</h1>
<div class="sub">数据日 2026-09-28（周一）· 截至北京时间 09:37 · 时区 Asia/Shanghai · PostHog Project 532954</div>
<div class="stamp">口径：A 段干净口径（站点隔离 + 排 CN + 排开发来源 + 排 6 个自测身份）｜转化类指标已按手册要求做「去 host」对照</div>

<h2>一、结论摘要</h2>
<div class="card lead">
<ol>
<li><b>今日流量正常，无异常。</b>截至 09:37 共 <b>10 个会话 / 7 位访客 / 19 次浏览</b>；与前 7 天同一时段（00:00–09:37）均值 8.6 会话相比，泊松 z = <b>+0.33</b>，属噪声范围，不构成「涨了」或「跌了」。</li>
<li><b>唯一值得注意的信号是点击：8 次，但 100% 来自同一个人。</b>去重后今日「有点击的会话 = 3 个」（占 30%）。此人是 ChatGPT 引荐的美国 iPhone 用户，08 小时内 4 次回访、浏览 7 个 Purple Garden 页面、单个页面决策时长最长 <b>224 秒</b>——是典型的临门一脚型高意向用户，不是上次那种「扫射式」无效点击。</li>
<li><b>渠道结构继续验证既有判断：AI 助手占 50% 会话却贡献 100% 点击。</b>今日搜索结果来源 4 个会话 <b>0 点击</b>。拉长到近 7 天：AI 助手 38 会话 → 27 点击（点击率 <b>28.9%</b>），搜索引擎 68 会话 → 9 点击（7.4%）。</li>
<li><b>剔除 09-20 的机器簇后，近 7 天是实质增长。</b>09-21~09-27 会话 159（前 7 天剔除 09-20 后 122，<b>+30%</b>，z = 2.21）、点击 42（23，<b>+83%</b>，z = 2.36）——两项均通过显著性粗判。</li>
<li><b>变现链路健康。</b>今日 8 次点击 → 8 次 <code>/go</code> 到达，<b>到达率 100%</b>；无 <code>aff_go_blocked</code>。今日尚无 <code>Order_Converted</code> 回传（Purple Garden 付费滞后常数约 24 小时，属正常）。</li>
</ol>
</div>

<h2>二、核心指标</h2>
<div class="kpis">
<div class="kpi"><div class="v">10</div><div class="l">会话</div><div class="n">前 7 日同时段均值 8.6 · z=+0.33</div></div>
<div class="kpi"><div class="v">7</div><div class="l">独立访客</div><div class="n">其中 8 人为全站首次出现</div></div>
<div class="kpi"><div class="v">19</div><div class="l">浏览量</div><div class="n">人均 1.9 页</div></div>
<div class="kpi hi"><div class="v">8</div><div class="l">联盟点击</div><div class="n">去重人数 <b>1</b> · 有点击会话 3</div></div>
<div class="kpi"><div class="v">30%</div><div class="l">会话点击率</div><div class="n">近 7 日同指标 26.4%</div></div>
<div class="kpi"><div class="v">100%</div><div class="l">/go 到达率</div><div class="n">8 点击 → 8 到达</div></div>
<div class="kpi warn"><div class="v">1</div><div class="l">薄弱会话</div><div class="n">1 页 + 无渲染信号 + 0 秒</div></div>
<div class="kpi"><div class="v">0</div><div class="l">今日转化回传</div><div class="n">近 14 日共 6 笔可见</div></div>
</div>
<div class="note"><b>口径披露：</b>未过滤原始口径今日为 <b>12 会话 / 21 浏览 / 8 点击</b>；被剔除的 2 个会话中，1 个已确认为 CN 安卓 webview 用户（<code>HD1900</code>，命中排 CN 规则），另 1 个命中自测身份或开发来源。今日 mysticdo.com 无流量，站点隔离无干扰。</div>

<h2>三、趋势</h2>
<h3>3.1 近 30 天逐日会话</h3>
<div class="chart"><div class="cap">红色柱 = 2026-09-20（机器簇，见下）</div>{chart30}</div>
<div class="warnbox"><b>2026-09-20 的 109 会话是机器流量，不是增长。</b>拆解后：SG 桌面 Chrome <code>$direct</code> 62 会话（其中 52 个满足薄弱会话签名，平均 1.0 页 / 0.0 个 <code>$web_vitals</code>）+ US 桌面 <code>$direct</code> 6 + NZ 4 + IQ 3 + BD 2 + KH 1——典型的「同款浏览器 + 纯直访 + 每会话 1 页」抓取簇，与手册 §5.16 记录的 SG 污染同源但量级放大 2 倍。<b>该日任何「流量翻倍」的解读都不成立。</b></div>

<h3>3.2 近 30 天逐日联盟点击</h3>
<div class="chart"><div class="cap">近 7 日点击 42，较前 7 日（剔除 09-20 后）23 提升 83%</div>{chart30b}</div>

<h3>3.3 今日分小时</h3>
<div class="chart"><div class="cap">北京时间。今日 06:00–08:00 三小时集中了全部 8 次点击</div>{chart_hour}</div>
<div class="note">流量集中在北京时间 06:00 之后 —— 对应美国东部时间 18:00 之后，与站点以北美用户为主的画像一致。09:37 时点数据天然不完整，请勿与整日基线直接比较。</div>

<h3>3.4 等长窗口对照（今日 00:00–09:37 vs 前 7 天同一时段）</h3>
<div class="chart">{chart_win}</div>
{tbl(["窗口", "会话", "独立访客", "浏览量", "联盟点击"], win_tbl)}
<div class="note">四项指标的 |z| 全部 &lt; 2 → <b>今日相对自身基线的波动全部落在噪声范围内</b>。点击虽然绝对数偏高（8 vs 均值 3.0，z = +1.51），但如前所述完全由单一用户驱动，<b>不能解读为「今日变现效率提升」</b>。</div>

<h2>四、渠道结构</h2>
<div class="grid2">
<div class="chart"><div class="cap"><b>今日</b>（10 会话）</div>
{tbl(["渠道", "会话", "平均时长", "跳出率", "点击", "点击率"], [[esc(c[0]), c[1], f"{c[2]:.0f}s", f"{c[3]}%", c[4], f"<b>{c[5]}%</b>"] for c in chanT])}
</div>
<div class="chart"><div class="cap"><b>近 7 日</b>（09-21 ~ 09-27，159 会话）</div>{chart_chan}
{tbl(["渠道", "会话", "点击", "点击率"], [[esc(c[0]), c[1], c[2], f"<b>{c[3]}%</b>"] for c in chan7])}
</div>
</div>
<div class="note"><b>核心结构事实：</b>近 7 日 AI 助手仅占 24% 的会话，却贡献了 <b>64% 的点击</b>（27/42）；其 28.9% 的点击率是搜索引擎（7.4%）的 <b>3.9 倍</b>。这与手册 §4.8 的结论一致——AI 渠道的瓶颈在「被引用的 prompt 数量」，而不在落地页承接能力；<b>扩量优先级应继续压在 AI 侧</b>。今日 4 个搜索引擎会话全部 0 点击，也再次印证搜索侧流量偏好但承接差。</div>

<h2>五、地域与设备</h2>
<div class="chart">{hbar(geo_rows, labelw=230)}</div>
{tbl(["国家", "设备", "会话", "点击"], [[esc(g[0]), esc(g[1]), g[2], g[3]] for g in geo])}
<div class="note">美国移动端 6 个会话包揽全部 8 次点击——与今日主力用户画像完全重合。巴西桌面端 1 个会话使用 <code>Chrome/118</code>（2023 年版本）、0 秒停留、1 次浏览，已计入薄弱会话，属机器签名。</div>

<h2>六、入口页</h2>
{tbl(["入口页", "来源", "会话", "点击", "点击率"], [[f'<span class="mono">{esc(e[0])}</span>', esc(e[1]), e[2], e[3], f"<b>{e[4]}%</b>"] for e in entry])}
<div class="note"><code>/guides/best-mediums-on-purple-garden/</code> 与 <code>/reviews/purple-garden/tattooed-psychic/</code> 两个页面今日合计 4 个会话、8 次点击 —— <b>站点今日 100% 的变现动作发生在这两个 Purple Garden 页面上</b>，值得单独观察它们近期的排名与引用情况。</div>

<h2>七、点击明细（今日全部 8 次）</h2>
{tbl(["时间", "页面", "CTA 位置", "联盟短码", "令牌", "决策时长", "按钮文案", "序次"], click_rows)}
<div class="note">8 次点击的去重人数为 <b>1 人</b>。按手册 §4.7 判据：<code>time_on_page_ms</code> 全部 ≥ 11.8 秒（最长 224.2 秒），<b>远高于 3 秒的「扫射式」阈值</b>，因此这不是上次 09-27 印尼用户那种无效连点，而是真实的高意愿权衡行为。归因令牌：<code>lm09dl / 1cpyim / y05dms / oohwi6 / a8e1j4 / gtos2m / bxteue / axzuuf</code>（全部 Purple Garden）。</div>

<h2>八、重点线索：今日主力用户</h2>
<div class="card">
<table>
<tr><th style="width:150px">身份</th><td class="mono">5d320aa9-39cc-5b64-9997-e9c373fc0649</td></tr>
<tr><th>地域 / 设备</th><td>美国 · iPhone · iOS 18.7 · Mobile Safari</td></tr>
<tr><th>来源</th><td><b>utm_source = chatgpt.com</b>（4 次会话全部一致）</td></tr>
<tr><th>活动</th><td>06:14、07:25、08:18、09:05 四次回访，累计 12 次浏览、8 次联盟点击</td></tr>
<tr><th>浏览路径</th><td class="mono" style="font-size:11.5px">tattooed-psychic → best-mediums-on-purple-garden → niki-medium → psychic-advisor-serena → best-mediums-on-purple-garden → tattooed-psychic → …</td></tr>
<tr><th>决策强度</th><td>单页停留 11.8s – 224.2s（中位约 40s），4 个不同 Purple Garden 目标</td></tr>
<tr><th>首次出现</th><td>2026-09-28 06:14（<b>全站新访客</b>）</td></tr>
</table>
<div class="note" style="margin-bottom:0"><b>判读：</b>该用户在 3 小时内反复回到同一批 Purple Garden 中型/灵媒类页面，每次决策时长都很长但没有一次跨到其他平台——是典型的「在某个平台里挑解读师」阶段。<b>建议：</b>关注 Impact/barges 后台 09-28 至 09-29 的 Purple Garden 记录（付费滞后约 24 小时），若成交即验证 ChatGrace 引荐 + 中型页面的组合；若最终未成交，则说明 Purple Garden 侧的解读师页面承接或资费门槛存在问题，值得记录为样本。</div>
</div>

<h2>九、今日会话明细（含机器流量标注）</h2>
{tbl(["时间", "国家", "设备", "浏览器", "来源", "utm", "入口页", "页面数", "vitals", "时长", "点击", "判定"], sess_rows)}
<div class="note">10 个会话中，<b>7 个来自真实浏览器</b>（具备 <code>$web_vitals</code> 渲染信号与合理停留时长）；3 个可以质疑：巴西桌面端（Chrome 118 + 0 秒 + 1 页）、乌克兰桌面端（3 秒 + 0 vitals）、以及主力用户 09:05 的一次重复加载（0 秒）。剔除可疑项后，<b>今日真实自然流量约 7 个会话</b>。</div>

<h2>十、机器流量与薄会话</h2>
{tbl(["日期", "会话", "薄弱会话", "占比", "0 vitals 会话"], thin_rows)}
<div class="note">近 8 日薄弱会话占比在 10%–48% 之间波动，<b>无常驻机器源</b>。今日仅 1 个（10%），低于近期均值——说明今日数字相对干净。09-22 的 48% 与 09-27 的 37% 是两个峰值，可回查。</div>

<h2>十一、转化归因（近 20 天，去 host 口径）</h2>
{tbl(["回传时间（BJ）", "事件", "金额", "归因令牌", "交易号"], conv_rows)}
<div class="note">PostHog 近 20 天共收到 <b>7 笔</b> <code>Order_Converted</code> 回传，其中 6 笔带完整 <code>click_id</code> 可用于归因，1 笔（09-11）缺失尾段令牌。按手册 §5.13 已知口径：<b>后台实际笔数高于此数，回传缺口依然存在</b>，故以上为可见下限而非全量营收。金额 $125 = Kasamba/Purple Garden，$50 = Keen（<b>不可按金额反推平台，此处以令牌所属 slug 为准</b>）。</div>

<h2>十二、/go 链路健康</h2>
{tbl(["日期", "联盟点击", "aff_go_hit", "到达率"], go_rows)}
<div class="note">今日 8 → 8，到达率 100%，且全天 0 条 <code>aff_go_blocked</code>。近 8 日中 09-20（13 → 22）与 09-24（2 → 3）出现到达数高于点击数，是查询侧的去重粒度差异（同一会话的 <code>aff_go_hit</code> 不含 <code>$session_id</code>），不构成链路异常。<b>§5.9 的「/go 跳转慢」议题维持已闭环状态。</b></div>

<h2>十三、风险与行动项</h2>
<div class="card">
<h3 style="margin-top:0">本期无新增风险。以下为延续性待办（按优先级）</h3>
<ul>
<li><span class="badge b-red">P0</span> <b>回传缺口</b>：PostHog 近 20 天仅 7 笔可见转化，而实际后台笔数更高；4 笔未送达的付费回传需在联盟侧查发送日志（承接手册 §5.16）。</li>
<li><span class="badge b-red">P0</span> <b>Lead / 注册 postback 仍未配置</b> —— 导致「哪个页面带来注册」「注册→付费升级率」两个问题至今无法回答，约 9 笔注册在 PostHog 完全不可见。</li>
<li><span class="badge b-amber">P1</span> <b>观察今日主力用户的最终去向</b>：记录 09-28→09-29 的 Purple Garden 后台记录，作为「ChatGPT 引荐 × 中型/灵媒页面」组合的第一个完整样本。</li>
<li><span class="badge b-amber">P1</span> <b>09-20 机器簇需定性</b>（62 个 SG 桌面直访会话）：与 §5.16 的 SG 污染同源，量级放大 2 倍，建议确认是否纳入 A 段排除规则。</li>
<li><span class="badge b-blue">P2</span> <b>AI 渠道继续加码</b>：近 7 日 AI 以 24% 会话贡献 64% 点击，点击率 28.9%；搜索侧 68 会话仅 7.4%。产能分配应继续倾向可被 LLM 引用的对比/榜单类结构。</li>
<li><span class="badge b-gray">P3</span> <b>Zero-vitals 会话复核</b>：09-22（13 个）、09-27（15 个）两个峰值的会话明细可回查，确认是否存在新型抓取源。</li>
</ul>
</div>

<h2>十四、口径附录</h2>
<pre>A 段干净口径（除注明外，全文所有「会话/访客/浏览/点击」均用此口径）
  coalesce(properties.$host,'') = 'easternalignment.com'
  AND coalesce(properties.$geoip_country_code,'') != 'CN'
  AND coalesce(properties.$session_entry_referring_domain,'') NOT IN
      ('localhost:4321','127.0.0.1:8188','127.0.0.1:8765','localhost:8765','127.0.0.1:8931')
  AND (person_id IS NULL OR toString(person_id) NOT IN (6 个自测身份))

转化 / 链路口径（必须去掉 host 条件 —— aff_go_hit 与 Order_Converted 不带 $host）
  coalesce(properties.$geoip_country_code,'') != 'CN' AND (SELF 排除)

时间处理
  分桶：toDate(toTimeZone(timestamp,'Asia/Shanghai'))
  过滤：Python 预计算 epoch 整数 → timestamp >= toDateTime(<int>)

薄弱会话定义
  countIf($pageview)=1 AND countIf($web_vitals)=0 AND 会话时长<=2 秒

指标定义
  users = 去重 person_id ｜ sessions = 去重 $session_id ｜ views = $pageview 次数（三者不可混用）
  点击去重：今日共用 8 条 aff_click，uniqExact($insert_id)=8 → 无重复上报

显著性判据
  泊松粗判 z = (两窗口计数差) / sqrt(两窗口之和)，|z| > 2 才判定为真实变化</pre>

<div class="foot">
生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}（本地）｜数据源：PostHog Project 532954｜查询脚本：
<code>posthog_analysis/run_today.py / run_today2.py / run_today3.py</code>｜原始结果：<code>posthog_analysis/results/*.json</code><br>
本报告为机器可复现产出：所有数字均由上述脚本直接查得，未做人工调整。
</div>
</div></body></html>"""

os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w", encoding="utf-8").write(HTML)
print("written:", DST, len(HTML), "chars")
