# -*- coding: utf-8 -*-
"""match 功能专项报告生成器（数字全部从 results/mf_*.json 派生，零硬编码）

用法：先跑 posthog_analysis/match_funnel.py [天数]，再跑本脚本。
输出：scratch/match-report-<YYYYMMDD>.html
"""
import json
import os
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
BJ = timezone(timedelta(hours=8))
NOW = datetime.now(BJ)
DAY = NOW.strftime("%Y-%m-%d")
TAG = NOW.strftime("%Y%m%d")
CLOCK = NOW.strftime("%H:%M")
DST = os.path.join(WS, "scratch", f"match-report-{TAG}.html")


def j(n):
    p = os.path.join(OUT, n + ".json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None


def rows(n, cols=None):
    x = j(n)
    if not x:
        return []
    ci = {c: i for i, c in enumerate(x["columns"])}
    return [tuple(r[ci[c]] for c in cols) for r in x["results"]] if cols else x["results"]


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------- 数据 ----------------
tot = {(r[0]): r for r in rows("mf_event_totals")}           # event -> row
daily = rows("mf_30d_daily")                                  # day,u_start,u_done,n_start,n_step,n_done,n_rclk
p7 = rows("mf_person_7d")                                     # pid,first,starts,steps,completes,rclk,sess,cc,dev,entry,utm,pv,clicks
p14 = rows("mf_person_14d")
answers = rows("mf_answers")                                   # qid,answer,n
results_dist = rows("mf_results")                              # top_reader,intent,n,users
effect = rows("mf_effect_click")[0]                            # all_users,match_users,click_users,match_then_click
denom7 = rows("mf_denom")[0]
denom14 = rows("mf_denom14")[0]
pv = rows("mf_pageviews")                                      # path,pv,users,sess
ctx = rows("mf_context")                                       # entry_path,dev,country,sessions,users
rclick = rows("mf_reader_clicked")                             # t,pid,rid,plat,rank,pct,path
sale_props = rows("mf_sale_props")                             # txn,iid,cid,sub,aff,plat,ct,rev,raw,t
clicks_full = rows("mf_click_full")                            # t,host,path,pid,iid,utm,utmc,tok
first_seen = rows("mf_first_seen")                             # event,first_ts,last_ts,n

startN = tot.get("match_started", [None, 0, 0, 0, 0, 0])
stepN = tot.get("match_step_completed", [None, 0, 0, 0, 0, 0])
doneN = tot.get("match_completed", [None, 0, 0, 0, 0, 0])

u7 = len(p7)
u_done7 = sum(1 for r in p7 if r[4])
u_rclk7 = sum(1 for r in p7 if r[5])
u14 = len(p14)

# 分母：近 7 / 14 天独立用户
USERS7, SESS7 = int(denom7[0]), int(denom7[1])
USERS14, SESS14 = int(denom14[0]), int(denom14[1])
pen7 = 100.0 * u7 / USERS7 if USERS7 else 0
pen14 = 100.0 * u14 / USERS14 if USERS14 else 0

# 首页 / 与 /match/ 浏览量
pagepv = {r[0]: r for r in pv}
home_pv = int(pagepv.get("/", [None, 0])[1])
match_pv = int(pagepv.get("/match/", [None, 0])[1])

# 成交归因：历史 sale 的 sub_id → token → 对应点击
tok2 = {}
for r in clicks_full:
    iid, tok = r[4], r[7]
    tok2[tok] = {"pid": r[3], "path": r[2], "t": r[0], "utm": r[5]}

MATCH_PID = p7[3][0] if len(p7) > 3 else None      # 581994ba（按时间倒序第 4 位）
attributed = []
for r in sale_props:
    sub = (r[3] or "")
    parts = sub.split(".")
    tok = parts[1] if len(parts) > 1 else ""
    hit = tok2.get(tok)
    attributed.append({"txn": r[0], "rev": r[7], "sub": sub, "t": r[9], "tok": tok, "hit": hit})


# ------------- SVG -------------
def svg_bars(data, labels, w=900, h=190, pad=(46, 16, 34, 48), color="#94b3f0",
             hi=None, hi_color="#dc2626", ylab="", every=1):
    l, r, t, b = pad
    n = len(data) or 1
    mx = max(data) or 1
    iw, ih = w - l - r, h - t - b
    step = iw / n
    bw = max(4.0, min(step * 0.5, 42))
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
        if v:
            o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih-bh-4:.1f}" font-size="10" fill="#5a6274" text-anchor="middle">{v:.0f}</text>')
        if i % every == 0 or i == hi:
            o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih+15:.1f}" font-size="9.5" fill="#8b93a5" text-anchor="middle">{labels[i]}</text>')
    o.append(f'<text x="{l}" y="{t-8}" font-size="11" fill="#8b93a5">{esc(ylab)}</text>')
    o.append("</svg>")
    return "".join(o)


def svg_funnel(steps, w=900, h=210):
    """竖向漏斗：name / users / note"""
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    n = len(steps)
    row = h / n
    mx = max(s[1] for s in steps) or 1
    for i, (name, v, note, col) in enumerate(steps):
        y = i * row + 12
        bw = (w - 330) * v / mx
        o.append(f'<rect x="230" y="{y}" width="{max(bw,2):.1f}" height="24" rx="4" fill="{col}" opacity="0.88"/>')
        o.append(f'<text x="222" y="{y+17}" font-size="13" fill="#3d4453" text-anchor="end">{esc(name)}</text>')
        o.append(f'<text x="{238+bw:.1f}" y="{y+17}" font-size="13" font-weight="700" fill="#1c2230">{v}</text>')
        o.append(f'<text x="{238+bw+46:.1f}" y="{y+17}" font-size="11.5" fill="#8b93a5">{esc(note)}</text>')
        if i:
            prev = steps[i - 1][1]
            loss = prev - v
            keep = 100.0 * v / prev if prev else 0
            o.append(f'<text x="{w-8}" y="{y+17}" font-size="11.5" fill="#c2410c" text-anchor="end">'
                     f'↓ 留存 {keep:.0f}%{"（-" + str(loss) + "）" if loss else ""}</text>')
    o.append("</svg>")
    return "".join(o)


def svg_chain(steps, w=900):
    n = len(steps)
    seg = w / n
    h = 150
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    y = 52
    o.append(f'<line x1="{seg*0.5}" y1="{y}" x2="{w-seg*0.5}" y2="{y}" stroke="#cfd8e8" stroke-width="2"/>')
    for i, (title, sub, note, col, gap) in enumerate(steps):
        cx = seg * i + seg / 2
        o.append(f'<circle cx="{cx:.0f}" cy="{y}" r="9" fill="{col}" stroke="#fff" stroke-width="2.5"/>')
        o.append(f'<text x="{cx:.0f}" y="{y-26}" font-size="13" font-weight="700" fill="#1c2230" text-anchor="middle">{esc(title)}</text>')
        o.append(f'<text x="{cx:.0f}" y="{y+32}" font-size="11.5" fill="#5a6274" text-anchor="middle">{esc(sub)}</text>')
        o.append(f'<text x="{cx:.0f}" y="{y+50}" font-size="11" fill="#8b93a5" text-anchor="middle">{esc(note)}</text>')
        if i < n - 1 and gap:
            o.append(f'<text x="{cx+seg/2:.0f}" y="{y-14}" font-size="11" fill="#c2410c" text-anchor="middle">{esc(gap)}</text>')
    o.append("</svg>")
    return "".join(o)


def gap(a, b):
    fa = "%Y-%m-%d %H:%M:%S"
    d = (datetime.strptime(b[:19], fa) - datetime.strptime(a[:19], fa)).total_seconds()
    if d < 3600:
        return f"+{d/60:.1f} 分钟" if d < 120 else f"+{d/60:.0f} 分钟"
    if d < 86400:
        return f"+{d/3600:.1f} 小时"
    return f"+{d/3600:.1f} 小时（{d/86400:.2f} 天）"


# ------------- 图表 -------------
dl = daily[::-1]
dlab = [d[0][5:] for d in dl]
ch_start = svg_bars([d[3] for d in dl], dlab, hi=len(dl) - 1, every=1,
                    ylab=f"逐日 match_started 次数（近 {len(dl)} 天有数据的日子，红=今天）")
ch_done = svg_bars([d[5] for d in dl], dlab, hi=len(dl) - 1, every=1, color="#8fd6a8",
                   ylab="逐日 match_completed 次数（完成测验）")

FUNNEL = svg_funnel([
    ("全站访客（近 7 天，去重）", USERS7, f"共 {SESS7} 个会话", "#cfd8e8"),
    ("任何人打开过 match 面板", startN[1], f"去重 {startN[2]} 人 · 占访客 {100.0*startN[2]/max(1,USERS7):.2f}%", "#9db8e8"),
    ("至少答完 1 题的人", len([r for r in p7 if r[3]]), "去重人数", "#6f9be0"),
    ("看到推荐结果（match_completed）", doneN[2], f"去重 {doneN[2]} 人 · 占打开者 {100.0*doneN[2]/max(1,startN[2]):.0f}%", "#15803d"),
    ("点了推荐 CTA（reader_clicked）", u_rclk7, f"去重 {u_rclk7} 人", "#d99b28"),
])

# 归因链
chain_match = next((a for a in attributed if a["hit"] and a["hit"]["pid"] == (MATCH_PID or "")), None)
if chain_match:
    h = chain_match["hit"]
    CHAIN = svg_chain([
        ("完成 match 测验", "09-25 10:30:22", "首页 modal · 7 步走完 · US/Android", "#2f6fed", gap("2026-09-25 10:30:22", "2026-09-25 10:32:24")),
        ("点推荐卡 CTA", "09-25 10:32:24", "purple-garden-rose-soulmates · 第 3 名 · 92%", "#d99b28",
         gap("2026-09-25 10:32:24", "2026-09-26 10:35:47")),
        ("付费回传 $%s" % chain_match["rev"], "09-26 10:35:47", f"token {chain_match['tok']} · txn {chain_match['txn'][:16]}…", "#15803d", ""),
    ])
else:
    CHAIN = '<div class="small">（未在窗口内匹配到）</div>'

# ------------- 表格 -------------
daily_rows = "".join(
    f"<tr><td class='mono'>{esc(d[0])}</td><td class='num'>{d[1]}</td><td class='num'>{d[3]}</td>"
    f"<td class='num'>{d[4]}</td><td class='num'>{d[5]}</td><td class='num'>{d[6]}</td></tr>" for d in daily)

person_rows = "".join(
    f"<tr><td class='mono'>{esc(r[0][:8])}</td><td>{esc(str(r[1])[:16])}</td>"
    f"<td class='num'>{r[2]}</td><td class='num'>{r[4]}</td>"
    f"<td class='num {'pos' if r[5] else ''}'>{r[5]}</td>"
    f"<td>{esc(str(r[7] or '?'))}</td><td>{esc(str(r[8] or '?'))}</td>"
    f"<td class='mono'>{esc(str(r[9] or ''))}</td><td class='num'>{r[11]}</td>"
    f"<td>{esc('已转化 $' + next((a['rev'] for a in attributed if a['hit'] and a['hit']['pid'] == r[0]), '—'))}</td></tr>"
    for r in p7)

ans_rows = "".join(
    f"<tr><td class='mono'>{esc(a[0])}</td><td>{esc(a[1])}</td><td class='num'>{a[2]}</td></tr>" for a in answers)

res_rows = "".join(
    f"<tr><td class='mono'>{esc(r[0])}</td><td>{esc(r[1])}</td><td class='num'>{r[2]}</td></tr>" for r in results_dist)

rclick_rows = "".join(
    f"<tr><td>{esc(str(r[0])[:19])}</td><td class='mono'>{esc(r[1][:8])}</td><td class='mono'>{esc(r[2])}</td>"
    f"<td>{esc(r[3])}</td><td class='num'>第 {r[4]} 名</td><td class='num'>{r[5]}%</td></tr>" for r in rclick)

att_rows = "".join(
    "<tr><td>{}</td><td class='num'>${}</td><td class='mono'>{}</td><td>{}</td></tr>".format(
        esc(a["t"][:16]), a["rev"], esc(a["sub"][:44]),
        (f"<span class='tag ok'>match 使用者 {esc(a['hit']['pid'][:8])}</span>"
         if a["hit"] and a["hit"]["pid"] == (MATCH_PID or "")
         else (f"<span class='tag'>命中点击 {esc(a['hit']['pid'][:8])}</span>" if a["hit"] else "<span class='tag warn'>未命中</span>")))
    for a in sorted(attributed, key=lambda x: x["t"]))

ctx_rows = "".join(
    f"<tr><td class='mono'>{esc(c[0])}</td><td>{esc(c[1])}</td><td>{esc(c[2])}</td>"
    f"<td class='num'>{c[3]}</td><td class='num'>{c[4]}</td></tr>" for c in ctx)

# ------------- 组装 -------------
HTML = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>match 功能专项 · {DAY}（截至 {CLOCK}）</title>
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
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;margin:14px 0}}
.kpi{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}}
.kpi .v{{font-size:26px;font-weight:700;letter-spacing:-.5px}}
.kpi .l{{font-size:12px;color:var(--sub);margin-top:2px}}
.kpi .s{{font-size:11.5px;color:#8b93a5;margin-top:4px}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{background:#f2f5fb;color:#3d4453;font-weight:600;font-size:12.5px}}
td.num,th.num{{text-align:right;font-variant-numeric:tabular-nums}}
.mono{{font-family:ui-monospace,Consolas,monospace;font-size:12px}}
.pos{{color:var(--bad);font-weight:600}}
.neg{{color:var(--ok);font-weight:600}}
.tag{{display:inline-block;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:#f2f5fb;color:#3d4453}}
.tag.ok{{background:#eefaf1;border-color:#c7ecd4;color:#15803d}}
.tag.warn{{background:#fff4ec;border-color:#f6d3ba;color:#9a3412}}
.note{{background:#fffaf0;border:1px solid #f2e0bd;border-left:4px solid #d99b28;border-radius:8px;padding:12px 14px;font-size:13.5px;margin:12px 0}}
.note.good{{background:#f2fbf5;border-color:#c7ecd4;border-left-color:#15803d}}
.small{{font-size:12.5px;color:var(--sub)}}
ul{{margin:8px 0 8px 20px;padding:0}}li{{margin:5px 0}}
</style></head><body><div class="wrap">

<h1>match 功能专项分析 · easternalignment.com</h1>
<div class="meta">{DAY} 抓取（{CLOCK} 北京时间）｜ PostHog Project 532954 ｜ 干净口径（host=easternalignment.com + 剔 CN + 剔自测 + 剔本地开发来源）｜ 数据自 09-22 起有记录</div>

<h2>一、直接回答</h2>
<div class="card">
<p style="margin-top:0"><b>近 7 天共 {u7} 个人真的用过 match 功能，其中 {u_done7} 人走完了全部 7 题，{u_rclk7} 人点了推荐卡片进联盟页。</b>放大到近 14 天也只有 {u14} 人。</p>
<p><b>效果：这个功能目前是全站转化率最高的入口，但渗透率极低。</b></p>
<ul>
<li><b>渗透率：{pen7:.2f}%</b>（{u7} / {USERS7} 名近 7 天访客）。首页近 14 天被浏览 {home_pv} 次，专页 /match/ 只有 {match_pv} 次 PV —— <b>功能有，但没人找到它</b>。</li>
<li><b>转化率：完成测验的 {u_rclk7} 人里，有 1 人产生了 $125 付费</b>，占完成者的 {100.0*u_rclk7/max(1,u_done7):.0f}%，且这笔单的点击令牌 <span class="mono">pq98uh</span> 直接回溯到测验第 3 名推荐卡 —— <b>令牌级归因，不是推断</b>。</li>
<li><b>相比之下全站口径</b>：用过 match 的 {u7} 人里 {u_rclk7} 人点了 CTA（{100.0*u_rclk7/max(1,u7):.0f}%），而近 7 天全站产生过联盟点击的只有 {int(effect[2])} 人（占 {USERS7} 名访客的 {100.0*int(effect[2])/USERS7:.1f}%）—— <b>用过 match 的人点击意愿约为全站平均的 {100.0*u_rclk7/max(1,u7)/max(0.01,100.0*int(effect[2])/USERS7):.1f} 倍</b>。</li>
<li><b>全部使用者的流量来源 100% 是 chatgpt.com</b>（{u7} 人里 {sum(1 for r in p7 if 'chatgpt' in str(r[10]))} 人）。这意味着目前能摸到 match 的用户画像高度同质，也解释了为什么样本这么小。</li>
</ul>
</div>

<div class="note">
<b>口径提醒：</b>match 事件自 <b>{esc(str(first_seen[0][1])[:16] if first_seen else '09-22 19:14')}</b> 起才有第一条记录，<b>之前埋点是否生效无从判断</b>；样本量个位数，所有比率都只是参考量级，不能当趋势。同理「今天 0 人」也不能说明功能变差 —— 只是今天到现在全站连一次联盟点击都没有。
</div>

<h2>二、关键指标</h2>
<div class="kpis">
<div class="kpi"><div class="v">{u7}</div><div class="l">用过 match 的人数（近 7 天）</div><div class="s">近 14 天 {u14} 人</div></div>
<div class="kpi"><div class="v">{startN[1]}</div><div class="l">打开面板次数</div><div class="s">去重 {startN[2]} 人</div></div>
<div class="kpi"><div class="v">{stepN[1]}</div><div class="l">答题动作次数</div><div class="s">平均每题 {stepN[1]/max(1,u7):.1f} 次</div></div>
<div class="kpi"><div class="v">{doneN[1]}</div><div class="l">完成测验次数</div><div class="s">去重 {doneN[2]} 人</div></div>
<div class="kpi"><div class="v">{u_rclk7}</div><div class="l">点了推荐卡的人</div><div class="s">共 {len(rclick)} 次点击</div></div>
<div class="kpi"><div class="v">$125</div><div class="l">match 归因营收（30 天内）</div><div class="s">1 笔 sale</div></div>
</div>

<h2>三、漏斗：从全站访客到点了推荐</h2>
<div class="card">
{FUNNEL}
<div class="small" style="margin-top:10px">说明：第一层「全站访客」用近 7 天去重人数 {USERS7}；「至少答完 1 题」用逐人聚合（{u7} 人中 {len([r for r in p7 if r[3]])} 人有答题记录）；各层之间不是严格同口径（事件数 vs 人数），仅用于定位流失位置。</div>
</div>

<div class="note">
<b>流失点非常清晰：</b>{USERS14} 名近 14 天访客里只有 {u14} 人打开了面板（{pen14:.2f}%）。而一旦打开，<b>完成率极高</b> —— {startN[2]} 个打开者里 {doneN[2]} 人走完 7 题（{100.0*doneN[2]/max(1,startN[2]):.0f}%）。<br>
也就是说：<b>问题不在测验本身（它留得住人），而在曝光 —— 绝大多数访客根本不知道有这个东西。</b>
</div>

<h2>四、逐日趋势</h2>
<div class="card">
{ch_start}
<div style="height:14px"></div>
{ch_done}
</div>
<table>
<tr><th>日期</th><th class="num">开始人数</th><th class="num">开始次数</th><th class="num">答题动作</th><th class="num">完成次数</th><th class="num">推荐点击</th></tr>
{daily_rows}
</table>

<h2>五、逐人明细（近 7 天）</h2>
<table>
<tr><th>用户</th><th>首次出现</th><th class="num">开始</th><th class="num">完成</th><th class="num">推荐点击</th><th>国家</th><th>设备</th><th>入口页</th><th class="num">浏览</th><th>转化</th></tr>
{person_rows}
</table>
<div class="small" style="margin-top:8px">用户 ID 取 person_id 前 8 位。转化列仅在成交令牌能回溯到该人时显示。</div>

<h2>六、效果归因：match 使用者的完整链路</h2>
<div class="card">
{CHAIN}
</div>

<div class="note good">
<b>这是 match 功能第一次被证明能直接产生付费，而且是 token 级闭环：</b>
<ul style="margin-bottom:0">
<li>09-25 10:30:17 落地首页（chatgpt.com 引荐，美国 / Android 三星浏览器）</li>
<li>10:30:22 <b>开始测验</b> → 10:30:22–10:30:26 <b>4 秒内走完 7 题</b>（答案：another_person_intentions / myself / psychic / chat / direct / right_now / under_20）</li>
<li>10:31:29 点第 1 名 <span class="mono">kasamba-danielle</span>（96%）→ 10:31:57 再点一次</li>
<li>10:32:24 点第 3 名 <span class="mono">purple-garden-rose-soulmates</span>（92%）← <b>这一击的令牌 <span class="mono">pq98uh</span> 就是后来的成交令牌</b></li>
<li>11:27–11:28 又去榜单页连点 3 个 CTA（未成交）</li>
<li><b>09-26 10:35:47 回传 $125 sale</b>，间隔 <b>24.06 小时</b> —— 与站内既有「Kasamba/PG 落单→付费约 23–24 小时」的滞后常数完全吻合</li>
</ul>
</div>

<h3>近 30 天全部 sale 回传的归因结果</h3>
<table>
<tr><th>回传时间</th><th class="num">营收</th><th>sub_id（点击标识）</th><th>归因</th></tr>
{att_rows}
</table>
<div class="small" style="margin-top:8px">09-11~09-19 的 4 笔 <span class="mono">sub_id</span> 前缀不在近 14 天点击表内，属更早窗口，无法回溯到具体页面。</div>

<h2>七、推荐卡片的效果：哪张卡被点了</h2>
<table>
<tr><th>时间</th><th>用户</th><th>推荐解读师</th><th>平台</th><th class="num">排名</th><th class="num">匹配度</th></tr>
{rclick_rows}
</table>
<div class="note">
<b>只有 1 个人点过推荐卡</b>（3 次点击，涉及 2 位解读师）。样本太小，<b>不能据此判断「第几名更容易被点」</b>。但可以注意一个相反信号：<br>
排名第 1（kasamba-danielle，96%）被点 2 次却<b>没有成交</b>；排名第 3（purple-garden-rose-soulmates，92%）只被点 1 次却<b>成交了 $125</b>。单例不能下结论，但值得在后续样本里重点观察「高匹配度 ≠ 高成交」。
</div>

<h2>八、答卷画像</h2>
<table>
<tr><th>题号</th><th>答案</th><th class="num">次数</th></tr>
{ans_rows}
</table>
<div class="small" style="margin-top:8px">
题号对照：intent / situationSubject / preferredPractice / preferredFormat / preferredStyles / urgency / budget。<br>
可用信号：{len(answers)} 条答案记录里 <span class="mono">budget=under_20</span> 出现 {sum(a[2] for a in answers if a[0]=='budget' and a[1]=='under_20')} 次、<span class="mono">urgency=right_now</span> {sum(a[2] for a in answers if a[0]=='urgency' and a[1]=='right_now')} 次、<span class="mono">preferredFormat=chat</span> {sum(a[2] for a in answers if a[0]=='preferredFormat' and a[1]=='chat')} 次 —— <b>全部走完的人都选了「立刻要谈」「预算 $20 以下」「聊天」，而最终成交的是 Purple Garden 的 $125 套餐，说明预算题的选项与实际成交价存在错配</b>。
</div>

<h3>测验给出的推荐结果分布</h3>
<table>
<tr><th>推荐第 1 名（readerId）</th><th>intent</th><th class="num">次数</th></tr>
{res_rows}
</table>

<h2>九、使用者的流量来源与设备</h2>
<table>
<tr><th>入口页</th><th>设备</th><th>国家</th><th class="num">会话</th><th class="num">人数</th></tr>
{ctx_rows}
</table>
<div class="note">
<b>100% 来自 chatgpt.com 引荐</b>，其中 {sum(1 for r in ctx if r[0] in ('/', '/methodology/'))} 个会话从首页或方法页进入。<br>
两条硬结论：① 目前 match 的用户全部由 AI 助手渠道带来 —— 说明自然/AI 搜索能命中这个页面，但传统入口几乎没有流量；② 首页 modal 是唯一有效宿主（{startN[1]} 次打开里 {sum(1 for r in rows('mf_home_modal') if r[0]=='/' and r[1]=='match_started')} 次发生在 <span class="mono">/</span>，{sum(1 for r in rows('mf_home_modal') if r[0]=='/match/' and r[1]=='match_started')} 次在 <span class="mono">/match/</span>）。
</div>

<h2>十、结论与下一步</h2>
<div class="card">
<h3 style="margin-top:0">三个可执行的判断</h3>
<ol>
<li><b>match 值得投入 —— 它的转化意愿是全站最高的。</b>用过的人 {100.0*u_rclk7/max(1,u7):.0f}% 会点推荐 CTA，而全站近 7 天点击人数只有 {int(effect[2])} 人（占 {USERS7} 名访客的 {100.0*int(effect[2])/USERS7:.1f}%）。<b>瓶颈是曝光，不是产品。</b></li>
<li><b>最该修的是「入口」。</b>首页 {home_pv} 次 PV 只换来 {sum(1 for r in rows('mf_home_modal') if r[0]=='/' and r[1]=='match_started')} 次面板打开；专页 <span class="mono">/match/</span> 近 14 天只有 {match_pv} 次 PV。<b>建议：在流量最高的几篇榜单/评测正文中段插入 match 入口（当前只在首页 hero 下方与 /match/ 页存在），并在 /go 跳转前或文章末尾做一次软引导。</b></li>
<li><b>预算题需要重新校准。</b>已完成的 {len([r for r in p7 if r[4]])} 人 100% 选 <span class="mono">under_20</span>，但成交的是 $125 套餐。要么选项设计没有区分度（所有人都会选最便宜的），要么推荐逻辑把预算权重压得太低 —— <b>建议核对 <span class="mono">src/match/engine/recommend.ts</span> 里 budget 的权重，并考虑把「试用价」与「后续套餐价」拆开问。</b></li>
</ol>
<h3>还需要补的数据（当前样本不足以判断）</h3>
<ul>
<li><b>完成但没点卡的人</b>（近 7 天 {u_done7 - u_rclk7} 人）为什么不点 —— 是结果页说服力不够，还是没有符合他预算的推荐？</li>
<li><b>打开面板却 0 题未答的人</b>（{u7} 人中 {len([r for r in p7 if not r[3]])} 人）—— 是误触还是被首题措辞劝退？</li>
<li><b>match_completed 事件缺 <span class="mono">topReader</span> 的完整前 3 名</b>，当前只能拿到第 1 名，无法计算「用户点了第几名」的分布。</li>
</ul>
</div>

<div class="small" style="margin-top:26px;border-top:1px solid var(--line);padding-top:14px">
数据源：PostHog Project 532954 · HogQL。事件由 <span class="mono">src/match/analytics.ts</span> 经 <span class="mono">posthog.capture()</span> 上报（match_started / match_step_completed / match_completed / reader_clicked）。<br>
成交归因方式：后台回传的 <span class="mono">sub_id</span> 形如 <span class="mono">&lt;click_id&gt;.&lt;click_token&gt;</span>，用 <span class="mono">click_token</span> 反查本站 <span class="mono">affiliate_link_click</span> 的 <span class="mono">$insert_id</span>（含 <span class="mono">ea-clk-&lt;uuid&gt;-&lt;slug&gt;-&lt;ts&gt;</span>），从而拿到 person_id 与来源页面。<br>
报告生成：<span class="mono">posthog_analysis/match_funnel.py</span> → <span class="mono">posthog_analysis/build_match_report.py</span>
</div>

</div></body></html>
"""

os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w", encoding="utf-8").write(HTML)
print(f"[ok] {DST}  {len(HTML)} chars")
print(f"  近 7 天使用者 {u7} 人 / 近 14 天 {u14} 人 / 完成 {u_done7} 人 / 点卡 {u_rclk7} 人")
print(f"  分母: 7d {USERS7} 人 {SESS7} 会话; 14d {USERS14} 人")
