# -*- coding: utf-8 -*-
"""生成「搜索引擎流量质量深度诊断」自包含 HTML 报告（浅色主题 + 手绘 SVG）"""
import json, os
from datetime import datetime

OUT = r"C:\Users\samja\Desktop\site\easternalignment\posthog_analysis\results"
DST = r"C:\Users\samja\Desktop\site\easternalignment\scratch\search-quality-report-20260928.html"

def j(n):
    return json.load(open(os.path.join(OUT, n + ".json"), encoding="utf-8"))

def idx(n, cols):
    x = j(n); ci = {c: i for i, c in enumerate(x["columns"])}
    return [tuple(r[ci[c]] for c in cols) for r in x["results"]]

def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def tbl(hd, rows, cls=""):
    h = "".join(f"<th>{x}</th>" for x in hd)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'

def grouped_bars(cats, series, w=980, h=270, colors=("#2f6fed", "#e07a2f"), legend=("A", "B"),
                 labfmt="{:.0f}", ymax=None):
    l, r, t, b = 44, 130, 22, 48
    iw, ih = w - l - r, h - t - b
    mx = ymax or (max(max(s) for s in series) or 1)
    n = len(cats); step = iw / n; bw = min(step * 0.3, 42)
    o = []
    for gv in range(0, 5):
        y = t + ih - ih * gv / 4
        o.append(f'<line x1="{l}" y1="{y:.1f}" x2="{l+iw}" y2="{y:.1f}" stroke="#e5e9f0"/>')
        o.append(f'<text x="{l-6}" y="{y+4:.1f}" font-size="10" fill="#8b97a8" text-anchor="end">{mx*gv/4:.0f}</text>')
    for i, c in enumerate(cats):
        cx = l + i * step + step / 2
        o.append(f'<text x="{cx:.1f}" y="{t+ih+16:.1f}" font-size="10.5" fill="#43536b" text-anchor="middle">{esc(c)}</text>')
        for si, s in enumerate(series):
            bh = ih * s[i] / mx
            x = cx - bw - 2 + si * (bw + 4)
            o.append(f'<rect x="{x:.1f}" y="{t+ih-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" fill="{colors[si]}" rx="2"/>')
            o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih-bh-3:.1f}" font-size="10" fill="#5b6a7d" text-anchor="middle">{labfmt.format(s[i])}</text>')
    for si, nm in enumerate(legend):
        y = t + 14 + si * 18
        o.append(f'<rect x="{l+iw+14}" y="{y-9}" width="10" height="10" fill="{colors[si]}" rx="2"/>')
        o.append(f'<text x="{l+iw+30}" y="{y}" font-size="11" fill="#43536b">{esc(nm)}</text>')
    return f'<svg viewBox="0 0 {w} {h}" width="100%" role="img">' + "".join(o) + "</svg>"

def stacked_depth(cats, parts, labels, colors, w=980, h=230):
    """parts: list of lists (横向 100% 堆叠)"""
    l, r, t, b = 120, 20, 24, 30
    iw = w - l - r
    rowh = 44
    o = []
    for i, c in enumerate(cats):
        y = t + i * rowh
        o.append(f'<text x="{l-12}" y="{y+18}" font-size="12" fill="#43536b" text-anchor="end">{esc(c)}</text>')
        x = l
        for k, v in enumerate(parts[i]):
            bw = iw * v
            o.append(f'<rect x="{x:.1f}" y="{y}" width="{bw:.1f}" height="24" fill="{colors[k]}"/>')
            if v > 0.055:
                o.append(f'<text x="{x+bw/2:.1f}" y="{y+16}" font-size="10" fill="#fff" text-anchor="middle">{labels[i][k]}</text>')
            x += bw
    ly = t + len(cats) * rowh + 4
    for k, nm in enumerate(["1 页", "2 页", "3 页", "4-6 页", "7+ 页"]):
        o.append(f'<rect x="{l + k*130}" y="{ly}" width="10" height="10" fill="{colors[k]}" rx="2"/>')
        o.append(f'<text x="{l + k*130 + 16}" y="{ly+9}" font-size="10.5" fill="#43536b">{nm}</text>')
    return f'<svg viewBox="0 0 {w} {h}" width="100%" role="img">' + "".join(o) + "</svg>"

# ---------- 数据 ----------
b1 = idx("b1_chan_quality", ["chan","sessions","pv_per_sess","one_page_pct","mean_dur","median_dur","no_vitals_pct","total_clicks","click_sessions","cvr_pct"])
b1d = {r[0]: r for r in b1}
s1 = idx("s1_engine", ["engine","sessions","users","pv_per_sess","avg_dur","bounce_pct","total_clicks","click_sessions","cvr_pct","thin"])
s3 = idx("s3_ptype", ["ptype","sessions","pv_total","total_clicks","click_sessions","cvr_pct","avg_dur","bounce_pct"])
s6 = idx("s6_weekly", ["wk","channel","sessions","clicks","click_sessions"])
b2 = idx("b2_entry_chan", ["entry","chan","sessions","pv_total","clicks_total","click_sessions","cvr_pct","avg_dur"])
b3 = idx("b3_zero_click", ["entry","sessions","pv_total","avg_dur","one_page_pct"])
b4 = idx("b4_device", ["chan","dev","sessions","clicks_total","click_sessions","cvr_pct","avg_dur"])
b5 = idx("b5_depth", ["chan","d1","d2","d3","d4_6","d7p","total"])
s11 = idx("s11_google_sub", ["ref","sessions","clicks_total","avg_dur","bounce_pct","thin"])
a4 = json.load(open(os.path.join(OUT, "a4_entry_status.json"), encoding="utf-8"))
a2 = idx("a2_astrology", ["day","ref","entry","cc","pv","clicks","dur"])

SEARCH = b1d["搜索引擎"]; AI = b1d["AI助手"]; DIRECT = b1d["直接访问"]
ratio = AI[9] / SEARCH[9]

# 分周：搜索 会话 vs 点击
wks = sorted({r[0][5:] for r in s6})
sch = {r[0][5:]: (r[2], r[3], r[4]) for r in s6 if r[1] == "搜索引擎"}
ach = {r[0][5:]: (r[2], r[3], r[4]) for r in s6 if r[1] == "AI助手"}
wlab = [w for w in wks]
series_sess = [sch.get(w, (0,0,0))[0] for w in wks]
series_clk = [sch.get(w, (0,0,0))[2] for w in wks]
chart_weekly = grouped_bars(wlab, [series_sess, series_clk], colors=("#2f6fed", "#e07a2f"),
                            legend=("搜索会话", "搜索有点击会话"))

# 渠道量效对比
chart_chan = grouped_bars(
    ["搜索引擎", "直接访问", "AI助手", "外链引荐"],
    [[SEARCH[1], DIRECT[1], AI[1], b1d["外链引荐"][1]],
     [SEARCH[8], DIRECT[8], AI[8], b1d["外链引荐"][8]]],
    colors=("#94a3b8", "#2f6fed"), legend=("会话数", "有点击会话数"))

# 同页 搜索 vs AI
pairs = {}
for e, ch, sess, pv, clk, cs, cvr, dur in b2:
    pairs.setdefault(e, {})[ch] = (sess, cvr, clk)
both = [(e, v["搜索引擎"], v["AI助手"]) for e, v in pairs.items()
        if "搜索引擎" in v and "AI助手" in v and v["搜索引擎"][0] >= 4]
both.sort(key=lambda x: -(x[1][0]))
chart_pairs = grouped_bars(
    [(e.replace("/guides/", "").replace("/reviews/", "").replace("/", "")[:20]) for e, _, _ in both],
    [[x[1][1] for x in both], [x[2][1] for x in both]],
    colors=("#c0392b", "#0f8a5f"), legend=("搜索渠道 点击率%", "AI 渠道 点击率%"), labfmt="{:.0f}%")

# 深度分布
depth_colors = ["#c0392b", "#e07a2f", "#f0c14b", "#5b8def", "#2f6fed"]
dcats, dparts, dlabs = [], [], []
for ch, d1, d2, d3, d46, d7p, tot in b5:
    dcats.append(ch)
    dparts.append([d1/tot, d2/tot, d3/tot, d46/tot, d7p/tot])
    dlabs.append([f"{d1}", f"{d2}", f"{d3}", f"{d46}", f"{d7p}"])
chart_depth = stacked_depth(dcats, dparts, dlabs, depth_colors)

# ---------- 表格 ----------
eng_rows = [[esc(r[0]), r[1], f"{r[3]:.2f}", f"{r[4]:.0f}s", f"{r[5]}%", r[6], f"{r[8]}%",
             f'{r[9]} <span class="sub2">({100.0*r[9]/r[1]:.0f}%)</span>'] for r in s1]
ptype_rows = [[esc(r[0]), r[1], f"{r[4]}/{r[1]}", f'<b>{r[5]}%</b>', f"{r[6]:.0f}s", f"{r[7]}%"] for r in s3]
dev_rows = [[esc(r[0]), esc(r[1]), r[2], f"{r[4]}/{r[2]}", f'<b>{r[5]}%</b>', f"{r[6]:.0f}s"] for r in b4]
zero_rows = [[f'<span class="mono">{esc(r[0])}</span>', r[1], r[2], f"{r[3]:.0f}s", f"{r[4]}%"] for r in b3]
pair_rows = [[f'<span class="mono">{esc(e)}</span>',
              f'{s[0]} → <b class="red">{s[1]}%</b>',
              f'{a[0]} → <b class="green">{a[1]}%</b>',
              f'{a[1]-s[1]:+.0f}pp' if a[1] > s[1] else f'{a[1]-s[1]:+.0f}pp',
              f'{a[2]}' if a[2] else '0'] for e, s, a in both]
bad_rows = [[f'<span class="mono">{esc(o["entry"])}</span>', o["status"], o["sessions"], o["clicks"]] for o in a4 if o["status"] != 200]

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>搜索引擎流量质量深度诊断 · easternalignment.com</title>
<style>
:root{{--ink:#1f2933;--sub:#5b6a7d;--mute:#8b97a8;--line:#e5e9f0;--bg:#f7f9fc;--card:#fff;
--blue:#2f6fed;--orange:#e07a2f;--red:#c0392b;--green:#0f8a5f;--amber:#c07a10}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.68 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}}
.wrap{{max-width:1060px;margin:0 auto;padding:32px 22px 80px}}
h1{{font-size:26px;margin:0 0 6px;letter-spacing:-.3px}}
.sub{{color:var(--sub);font-size:13.5px}}
.stamp{{color:var(--mute);font-size:12.5px;margin:6px 0 26px}}
h2{{font-size:19px;margin:40px 0 14px;padding-bottom:8px;border-bottom:2px solid var(--line)}}
h3{{font-size:15.5px;margin:26px 0 10px;color:#2b3a4f}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin:14px 0}}
.verdict{{background:#fff;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:8px;padding:20px 24px;margin:16px 0}}
.verdict .big{{font-size:20px;font-weight:650;letter-spacing:-.3px;margin-bottom:8px}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:12px;margin:16px 0}}
.kpi{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px}}
.kpi .v{{font-size:25px;font-weight:650;letter-spacing:-.5px}}
.kpi .l{{font-size:12.5px;color:var(--sub);margin-top:2px}}
.kpi .n{{font-size:11.5px;color:var(--mute);margin-top:5px}}
.kpi.red{{border-color:#f0cfcf;background:#fffafa}} .kpi.green{{border-color:#cfe8dd;background:#fafffc}}
.kpi.blue{{border-color:#cfdcf7;background:#fafcff}}
table{{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}}
th{{text-align:left;font-weight:600;color:var(--sub);font-size:12px;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}}
td{{padding:8px 10px;border-bottom:1px solid #f1f4f8;vertical-align:top}}
tbody tr:hover{{background:#fafbfd}}
.mono{{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}}
.sub2{{color:var(--mute);font-size:11.5px}}
.red{{color:var(--red)}} .green{{color:var(--green)}} .amber{{color:var(--amber)}}
.note{{background:#fbfcfe;border-left:3px solid var(--blue);padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13.5px;color:#3c4c61}}
.warn{{background:#fffaf5;border-left:3px solid var(--orange);padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13.5px}}
.bad{{background:#fdf5f5;border-left:3px solid var(--red);padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13.5px}}
.good{{background:#f5fbf8;border-left:3px solid var(--green);padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:13.5px}}
ul{{margin:8px 0 8px 20px;padding:0}} li{{margin:6px 0}}
.chart{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px 18px 8px;margin:14px 0}}
.chart .cap{{font-size:12.5px;color:var(--mute);margin:2px 0 10px}}
.badge{{display:inline-block;font-size:11px;padding:1px 7px;border-radius:20px;line-height:1.7}}
.b-red{{background:#fdecec;color:#a82626}} .b-amber{{background:#fdf3e3;color:#8f5c14}}
.b-blue{{background:#eef3fe;color:#2149a8}} .b-gray{{background:#eef1f5;color:#5b6a7d}}
.b-green{{background:#e9f7f1;color:#0b6b4a}}
.foot{{color:var(--mute);font-size:12px;margin-top:44px;border-top:1px solid var(--line);padding-top:14px}}
pre{{background:#f7f9fc;border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:11.5px;line-height:1.55}}
</style></head><body><div class="wrap">

<h1>搜索引擎流量质量 · 深度诊断</h1>
<div class="sub">easternalignment.com ｜ 主窗口 2026-08-29 ~ 09-28（近 30 天）｜ 时区 Asia/Shanghai</div>
<div class="stamp">口径：A 段干净口径（站点隔离 + 排 CN + 排开发来源 + 排 6 个自测身份）。搜索引擎 = 会话入口 referrer 命中 google / bing / yahoo / duckduckgo / ecosia / yandex / msn / aol / brave / startpage / qwant / naver / baidu / search.*。</div>

<div class="verdict">
<div class="big">结论：你的感觉是对的，但归因要改。</div>
<p style="margin:6px 0 10px">近 30 天搜索引擎是<b>第一大渠道（{SEARCH[1]} 会话）却只贡献 25 次点击</b>，有点击会话率 <b class="red">{SEARCH[9]}%</b>，而 AI 助手是 <b class="green">{AI[9]}%</b> —— 相差 <b>{ratio:.1f} 倍</b>。</p>
<p style="margin:0">但问题<b>不是</b>「流量掺水严重」或「页面不能转化」。真实原因有四个，按对结果的影响排序：<br>
<b>① 意图层级浅</b>（搜索用户读完就走，单页会话 {SEARCH[3]}%，AI 是 {AI[3]}%）；<br>
<b>② 落点错位</b>（搜索把量送到评测页与信息型榜单页，而高转化页的量来自 AI —— 同一批页面在 AI 下转化率高出 3–10 倍）；<br>
<b>③ 非 Google 引擎与机器流量稀释</b>（22.6% 的搜索会话无任何渲染信号，Yahoo/DDG/Ecosia/Yandex 共 14 会话 0 点击）；<br>
<b>④ 内容停更 7 天</b>（sitemap 最新更新 09-21），搜索会话自 08-24 起横盘 54–74，符合「停发内容→线性曲线走平」的特征。</p>
</div>

<h2>一、核心指标对照</h2>
<div class="kpis">
<div class="kpi blue"><div class="v">{SEARCH[1]}</div><div class="l">搜索会话（30 天）</div><div class="n">占全站 37%，第一大渠道</div></div>
<div class="kpi red"><div class="v">{SEARCH[9]}%</div><div class="l">搜索有点击会话率</div><div class="n">25 次点击 / 17 个会话</div></div>
<div class="kpi green"><div class="v">{AI[9]}%</div><div class="l">AI 有点击会话率</div><div class="n">103 次点击 / 52 个会话</div></div>
<div class="kpi green"><div class="v">{ratio:.1f}×</div><div class="l">AI 相对搜索的效率倍数</div><div class="n">每 100 会话的点击会话数</div></div>
<div class="kpi red"><div class="v">{SEARCH[3]}%</div><div class="l">搜索单页会话占比</div><div class="n">AI 为 {AI[3]}%</div></div>
<div class="kpi red"><div class="v">{SEARCH[6]}%</div><div class="l">搜索会话无渲染信号</div><div class="n">{SEARCH[1]*SEARCH[6]//100} 个会话疑似机器</div></div>
<div class="kpi"><div class="v">{SEARCH[5]:.0f}s</div><div class="l">搜索会话时长中位数</div><div class="n">AI 仅 {AI[5]:.0f}s —— 搜索用户其实读得更久</div></div>
<div class="kpi"><div class="v">7<span class="sub2"> 天</span></div><div class="l">内容停更时长</div><div class="n">sitemap 最新 lastmod 2026-09-21</div></div>
</div>

<div class="note"><b>一句话读法：</b>搜索引擎带来的<b>不是「假人」，而是「只读不买的人」</b>。搜索会话时长中位数 {SEARCH[5]:.0f} 秒，反而高于 AI 的 {AI[5]:.0f} 秒——他们在认真读，只是没有进入决策状态。真正要修的是<b>从「读完」到「下一步」的推进机制</b>，而不是怀疑流量真实性。</div>

<h2>二、渠道质量全景</h2>
<div class="chart"><div class="cap">灰柱 = 会话量；蓝柱 = 有点击会话数。两者高度不成比例即「量效背离」</div>{chart_chan}</div>
{tbl(["渠道", "会话", "页/会话", "单页占比", "时长均值", "时长中位", "无渲染信号", "点击次数", "有点击会话", "有点击会话率"], [
 [f'<b>{esc(r[0])}</b>', f'<b>{r[1]}</b>', r[2], f"{r[3]}%", f"{r[4]:.0f}s", f"{r[5]:.0f}s",
  f"{r[6]}%", r[7], r[8], f'<b class="{"red" if r[0]=="搜索引擎" else "green" if r[0]=="AI助手" else ""}">{r[9]}%</b>'] for r in b1])}
<div class="bad"><b>量效背离的量化：</b>搜索用 <b>{SEARCH[1]/AI[1]:.2f} 倍</b>于 AI 的会话量，只换来 <b>{SEARCH[7]/AI[7]:.2f} 倍</b>的点击次数。把这句换成业务语言——<b>搜索引擎目前贡献了全站 37% 的访问，却只贡献了 16% 的联盟点击</b>（25 / 151）。</div>

<h3>2.1 分周演进：量在涨，效没动</h3>
<div class="chart"><div class="cap">按自然周（周一起算）；蓝 = 搜索会话，橙 = 搜索有点击会话</div>{chart_weekly}</div>
{tbl(["周（起）", "搜索会话", "搜索点击", "搜索有点击会话", "AI 会话", "AI 点击", "AI 有点击会话"], [
 [esc(w), sch.get(w, (0,0,0))[0], sch.get(w, (0,0,0))[1], sch.get(w, (0,0,0))[2],
  ach.get(w, (0,0,0))[0], ach.get(w, (0,0,0))[1], ach.get(w, (0,0,0))[2]] for w in wks])}
<div class="warn"><b>这是全篇最重要的一张表。</b>搜索会话从 07-27 周的 <b>15</b> 涨到 08-24 周的峰值 <b>74</b>（+393%），此后 71 → 54 → 60 → 68 横盘；但搜索点击始终在 <b>1 → 9</b> 的低位徘徊，有点击会话 1 → 7。同期 AI 会话只有 8 → 43，点击却从 2 涨到 <b>35</b>。<br>
→ <b>搜索的量增长没有转化为变现能力，这不是波动的错觉，是 9 周的一致走势。</b></div>

<h2>三、机制诊断：搜索流量的四个结构性问题</h2>

<h3>3.1 引擎维度 —— Google 量大且质量尚可，非 Google 引擎近乎全废</h3>
{tbl(["引擎", "会话", "独立访客", "页/会话", "时长均值", "跳出率", "点击", "有点击会话率", "薄弱会话"], eng_rows)}
<div class="bad">
<b>把「搜索」当成一个渠道看会严重误判。</b>它实际由两个完全不同的东西组成：
<ul style="margin-top:6px">
<li><b>Google 系 {s1[0][1]} 会话（占搜索 {100.0*s1[0][1]/SEARCH[1]:.1f}%）</b>，有点击会话率 {s1[0][8]}%，跳出率 {s1[0][5]}% —— 这是搜索渠道的<b>全部有效部分</b>；</li>
<li><b>其他引擎合计 {sum(r[1] for r in s1[1:])} 会话（{100.0*sum(r[1] for r in s1[1:])/SEARCH[1]:.1f}%）只出 1 次点击</b>。其中 Yahoo 7 会话、DuckDuckGo 5、Ecosia 1、Yandex 1 —— <b>全部 0 点击</b>；Bing/MSN 20 会话，跳出率 95%、页/会话 1.0、<b>{s1[1][9]} 个薄弱会话（{100.0*s1[1][9]/s1[1][1]:.0f}%）</b>。</li>
</ul>
→ Bing/MSN 的入口页明细显示：<b>6 个会话落在首页 `/`，平均停留 2.0 秒、6 个全部是薄弱会话</b>——这 6 个是机器，不是「Bing 用户」。<b>报告搜索质量时应把非 Google 部分单列，否则会把自己的机器流量算成「搜索流量差」。</b></div>

<h3>3.2 页型维度 —— 搜索把量送给了「只读」的页面</h3>
{tbl(["入口页型", "会话", "有点击会话/会话", "点击会话率", "时长均值", "跳出率"], ptype_rows)}
<div class="warn">搜索流量 89% 流向两类页面：<b>guides 指南 {s3[0][1]} 会话（占搜索 {100.0*s3[0][1]/SEARCH[1]:.1f}%，点击会话率 {s3[0][5]}%）</b> 与 <b>reviews 评测 {s3[1][1]} 会话（占搜索 {100.0*s3[1][1]/SEARCH[1]:.1f}%，点击会话率 {s3[1][5]}%）</b>。reviews 是<b>单位效率最低的落点</b>——{s3[1][1]} 个搜索会话只出 {s3[1][3]} 次点击。相比之下 comparisons 对比页 9 会话 0 点击、首页 9 会话 0 点击（平均停留 1.3 秒，基本是直接命中首页的机器）。</div>

<h3>3.3 同页对照 —— 页面没问题，来源的意图层级有问题</h3>
<div class="chart"><div class="cap">同一 URL 在两个渠道下的「有点击会话率」对比（搜索会话数 ≥ 4 的页面）</div>{chart_pairs}</div>
{tbl(["入口页", "搜索渠道", "AI 渠道", "差值", "AI 点击次数"], pair_rows)}
<div class="bad"><b>这是排除「页面质量」嫌疑的决定性证据。</b>同一批 URL 在 AI 渠道下的转化率比搜索渠道高出数倍，极端案例如：
<ul style="margin-top:6px">
<li><span class="mono">/guides/top-love-psychics-keen/</span>：搜索 6 会话 → <b class="red">0 点击</b>；AI 6 会话 → <b class="green">12 点击（66.7%）</b></li>
<li><span class="mono">/guides/best-keen-psychics-2026/</span>：搜索 8 会话 → <b class="red">0 点击</b>；AI 4 会话 → <b class="green">5 点击（50%）</b></li>
<li><span class="mono">/reviews/kasamba/</span>：AI 16 会话 → 10 点击（12.5%）；搜索渠道会话数不足 4，未进榜</li>
</ul>
→ 结论：<b>不缺转化的页面，缺的是「带决策意图」的访客。</b>搜索关键词把它带到了正确的页面，但用户处于「了解」阶段；AI 把用户带到了同一页，但用户已经处于「选择」阶段。</div>

<h3>3.4 深度与设备</h3>
<div class="chart"><div class="cap">会话深度分布（100% 堆叠，数字为会话数）</div>{chart_depth}</div>
{tbl(["渠道", "设备", "会话", "有点击会话", "点击会话率", "时长均值"], dev_rows)}
<div class="note">两个关键读数：
<ul style="margin-top:6px">
<li><b>深度：</b>搜索 {b5[0][1]}/{b5[0][6]}（{100.0*b5[0][1]/b5[0][6]:.0f}%）是 1 页会话，4 页以上仅 {b5[0][4]+b5[0][5]} 个（{100.0*(b5[0][4]+b5[0][5])/b5[0][6]:.1f}%）；AI 1 页占 {100.0*b5[2][1]/b5[2][6]:.0f}%，4 页以上 {b5[2][4]+b5[2][5]} 个（{100.0*(b5[2][4]+b5[2][5])/b5[2][6]:.1f}%）。<b>搜索用户看完就关，站内链与 CTA 没有把他们推进下一层。</b></li>
<li><b>设备：</b>AI 渠道 <b>移动端点击会话率 42.2%</b>，桌面端仅 4.5%；搜索移动端 6.3%、桌面端 4.8%。<b>搜索的移动端只有 6.3%，说明这不是「移动端不适合转化」——同样是移动端，换一个来源(来源) 就有 42.2%。</b>差别在来源，不在设备。</li>
</ul></div>

<h3>3.5 机器流量稀释（22.6%）</h3>
<div class="note">搜索会话中 <b>{SEARCH[1]*SEARCH[6]//100} 个（{SEARCH[6]}%）完全没有 <code>$web_vitals</code> 渲染信号</b>——按手册判据属机器签名。这批会话平均时长 28.1 秒、页/会话 0.89，却贡献了 5 次点击（即前面提到的「扫射式」点击）。<b>剔除后搜索的真实自然会话约 {SEARCH[1]-SEARCH[1]*SEARCH[6]//100} 个</b>，有点击会话率的上限为 <b>8.0%</b>——仍显著低于 AI 的 28.3%。<br>
→ 也就是说：<b>剔掉机器流量能解释差距的一小部分，但解释不了 4.6 倍。</b></div>

<h2>四、失效入口页（次要，但有确定性修复）</h2>
<div class="warn">对会话数 TOP 120 的入口页逐一做线上存活探测：<b>{len(a4)} 个入口页中 {len([o for o in a4 if o['status']!=200])} 个返回非 200</b>，合计承载 {sum(o['sessions'] for o in a4 if o['status']!=200)} 个会话（占 TOP120 的 {100.0*sum(o['sessions'] for o in a4 if o['status']!=200)/sum(o['sessions'] for o in a4):.1f}%）。</div>
{tbl(["入口路径", "HTTP", "会话（30 天）", "点击"], bad_rows)}
<div class="note"><b>这不是搜索质量的主因（仅 2.0%），但修复成本为零且确定性高。</b><br>
另需说明：<b><code>/astrology/</code> 整段已于 2026-09-21 随提交 <code>381dadf</code> 删除</b>（3 个 Astro 文件 = 12 星座 + 78 配对），<code>_redirects</code> 与 <code>astro.config.mjs</code> 中都<b>没有对应的 301</b>。但 60 天内该段仅 {len(a2)} 个会话（其中 3 个是删除后的 404 命中，1 次点击）——<b>删除造成的流量代价极小，不必回滚，但建议补一条 <code>/astrology/* → /guides/</code> 的 301 以保住可能的残留索引</b>。</div>

<h2>五、为什么「感觉」和「数据」都对</h2>
<div class="card">
<p style="margin-top:0">你的直觉捕捉到的是<b>真实存在的现象</b>（搜索点击率 6.2% vs AI 28.3%），但日常感知会把它放大成「搜索流量不行」，原因有三：</p>
<ul>
<li><b>幸存者偏差反向作用：</b>出单时你看到的是「聊天入口来的单」，而搜索带来的 {SEARCH[1]} 个会话里 80% 只看一页就离开——它们在报表上只是数字，没有记忆点。</li>
<li><b>渠道命名掩盖了内部差异：</b>「搜索引擎」一个桶里混了 Google（{s1[0][1]} 会话，6.7%）和非 Google（{sum(r[1] for r in s1[1:])} 会话，3%）以及机器流量（{SEARCH[1]*SEARCH[6]//100} 会话）。按桶看效率，会把 Google 的真实表现和噪声一起平均掉。</li>
<li><b>缺少关键词级数据：</b>站点<b>没有接 GSC / Bing Webmaster 数据</b>，因此无法区分品牌词（「eastern alignment」）与非品牌信息词（「is keen legit」）——而这两类词的转化预期完全不同。这是当前最大的分析盲区。</li>
</ul>
</div>

<h2>六、行动项</h2>
<div class="card">
<h3 style="margin-top:0">P0 · 本周内</h3>
<ul>
<li><span class="badge b-red">P0</span> <b>恢复内容产出</b>。sitemap 最新 lastmod 停在 2026-09-21，最近的提交是 quiz v1 与 MCP v2.0（工具向）。搜索会话自 08-24 峰值后横盘 54–74 共 4 周，正符合手册 §8 描述的「停发内容后曲线线性走平」。<b>这是搜索量不再增长的最直接原因，优先级高于任何页面优化。</b></li>
<li><span class="badge b-red">P0</span> <b>补三条 301</b>：<code>/privacy-policy/</code>、<code>/how-we-test/</code>、<code>/contact/</code> 以及 <code>/sitemap.xml → /sitemap-index.xml</code>，外加 <code>/astrology/*</code> 通配。零成本、确定性收益。</li>
</ul>
<h3>P1 · 两周内</h3>
<ul>
<li><span class="badge b-amber">P1</span> <b>给搜索落点做「意图升级」</b>。搜索最大的两个落点是评测页（{s3[1][1]} 会话 / {s3[1][5]}%）与信息型榜单页。具体做法：在这两类页面首屏之后插入<b>对比表 + 明确的下一步</b>（这正是 LLM 抽取率最高、也是 AI 渠道用户已经在利用的结构）。手册 §4.8 已确认「内容质量不是瓶颈」（4,000+ 词 + FAQPage/Review/ItemList + 100+ 内链），所以不必重写内容，只需改推动路径。</li>
<li><span class="badge b-amber">P1</span> <b>单页优先修 <code>/reviews/keen/</code></b>：搜索渠道 {b3[0][1]} 会话、600 字以上的停留、却 <b class="red">0 点击</b>，同时它是全站最大的零点击入口。这是一个「有量、有阅读、无动作」的典型样本，改一页就能验证整个假设。</li>
<li><span class="badge b-amber">P1</span> <b>建立「读完不跳转」清单</b>：下列页面搜索渠道会话 ≥ 4、点击 = 0、且时长中位数偏高（用户真读了）——它们是 CTA 位置或文案问题，不是流量问题：<br>
<span class="mono" style="font-size:11.5px">{' ｜ '.join(esc(r[0]) for r in b3[:8])}</span></li>
</ul>
<h3>P2 · 一个月内</h3>
<ul>
<li><span class="badge b-blue">P2</span> <b>接 GSC + Bing Webmaster 数据</b>，补齐关键词与展示量维度。没有它就无法回答「哪些 query 带来浅意图流量」「哪些页面有展示无点击（CTR 低）」，本次诊断的全部结论都只能停留在「渠道级」而无法下钻到「词级」。</li>
<li><span class="badge b-blue">P2</span> <b>非 Google 引擎单独立账</b>：Yahoo / DuckDuckGo / Ecosia / Yandex 共 {sum(r[1] for r in s1[2:])} 会话 0 点击，建议在报表里与 Google 分开统计，避免长期污染「搜索渠道」的效率读数。</li>
<li><span class="badge b-gray">P3</span> <b>把 30 天窗口拉长到 90 天复测</b>。30 天样本下「reviews 5.2% vs guides 7.8%」的差值尚未通过泊松显著性检验（差 3 个会话），结论方向可信但幅度需更长窗口确认。</li>
</ul>
</div>

<h2>七、口径附录</h2>
<pre>搜索引擎渠道判定
  match(coalesce(properties.$session_entry_referring_domain,''),
        '(?i)(google|bing|yahoo|duckduckgo|ecosia|yandex|msn[.]|aol[.]|brave|startpage|qwant|naver|baidu|search[.])')

⚑ 正则必须用字符类 [.]；HogQL 不接受 反斜杠+点 形式的转义，直接写会 HTTP 400（且报错信息不指向正则）。

⚠ 渠道分桶会重叠，取数顺序必须是：AI 助手 → 搜索引擎 → 直接访问 → 外链引荐
  （chatgpt.com 的 referrer 不含搜索关键词，但内部跳转后 referrer 可能变化，故 AI 判定必须
   同时看 referrer + utm_source，且优先级最高）

会话级指标
  会话时长 = max(timestamp) - min(timestamp)（偏长，非真实浏览时长）
  单页会话 = countIf(event='$pageview') = 1
  有点击会话率 = 有点击的会话数 / 总会话数  ← 本报告统一用这个，不用「点击数/会话数」
  机器签名 = 无 $web_vitals（真浏览器即便立刻返回也会随 pagehide 上报）

失效页探测
  对 a1_entry_all（30 天入口页 TOP 120）逐个发 HEAD（失败回落 GET），UA 用 Mozilla 兼容串；
  统计口径 = 非 200 的入口页所承载的会话数 / 全部探测页承载会话数。

样本量与显著性
  30 天搜索 274 会话 / 直接 243 / AI 184 / 外链 38。渠道间倍数差异（4.6×）远超噪声；
  但页型内部差值（guides 7.8% vs reviews 5.2%）在 30 天窗口下尚未过泊松检验，需 90 天复测。</pre>

<div class="foot">
生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}（本地）｜数据源：PostHog Project 532954 ｜
查询脚本：<code>posthog_analysis/search_deep.py / search_deep2.py / search_deep3.py / probe_entries.py</code>｜
原始结果：<code>posthog_analysis/results/*.json</code>｜站点侧事实：sitemap-0.xml 378 URL（无 /astrology/）、git 提交 381dadf（2026-09-21）
</div>
</div></body></html>"""

os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w", encoding="utf-8").write(HTML)
print("written:", DST, len(HTML), "chars")
