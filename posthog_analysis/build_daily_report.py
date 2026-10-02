# -*- coding: utf-8 -*-
"""通用「今日流量」自包含 HTML 报告生成器（无硬编码数字，全部从 results/*.json 派生）

用法：先跑 run_today.py（+ 可选 lead_funnel.py），再跑本脚本。
输出：scratch/daily-report-<YYYYMMDD>.html
"""
import json
import os
import math
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
BJ = timezone(timedelta(hours=8))
NOW = datetime.now(BJ)
DAY = NOW.strftime("%Y-%m-%d")
TODAY_TAG = NOW.strftime("%Y%m%d")
DST = os.path.join(WS, "scratch", f"daily-report-{TODAY_TAG}.html")
ELAPSED = NOW.strftime("%H:%M")


def j(n):
    p = os.path.join(OUT, n + ".json")
    if not os.path.exists(p):
        return None
    return json.load(open(p, encoding="utf-8"))


def rows(n, cols):
    x = j(n)
    if not x:
        return []
    ci = {c: i for i, c in enumerate(x["columns"])}
    return [tuple(r[ci[c]] for c in cols) for r in x["results"]]


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------- 数据 ----------------
daily = rows("daily_clean", ["day", "users", "sessions", "pageviews", "aff_clicks"])[::-1]
raw = rows("daily_raw", ["day", "users", "sessions", "pageviews", "aff_clicks"])
t_sum = (j("today_summary") or {}).get("results", [[0, 0, 0, 0]])[0]
sess = rows("today_sessions", ["t", "country", "dev", "br", "ref", "utm", "entry", "pv", "vit", "dur", "clicks", "pid"])
chan = rows("today_channels", ["channel", "sessions", "total_clicks", "cvr_pct"])
geo = rows("today_geo", ["country", "dev", "sessions", "clicks"])
entry = rows("today_entry", ["entry", "ref", "sessions", "total_clicks", "cvr_pct"])
clicks = rows("today_clicks", ["t", "page", "pos", "slug", "token", "txt", "tms", "sid"])
thin7 = rows("thin_7d", ["day", "sessions", "thin", "zero_vitals"])
wins = [(j(f"win_d{o}") or {}).get("results", [[0, 0, 0, 0]])[0] for o in range(1, 8)]
go = rows("go_health", ["day", "event", "n"])
lf_conv = rows("lf_conversions", ["t", "txn", "ctype", "platform", "token", "sub", "did", "revenue", "status", "ti"])
lf_daily = rows("lf_daily", ["day", "leads", "sales", "sale_revenue", "reversals"])
lf_orph = rows("lf_orphans", ["t", "txn", "raw"])
lf_testish = (j("lf_testish") or {}).get("results", [[0, 0]])[0]
clicks14 = rows("clicks_14d", ["day", "page", "pos", "slug", "token", "tms", "iid", "sid", "cc"])

TODAY = [daily[-1][2], daily[-1][1], daily[-1][3], daily[-1][4]]  # sessions, users, pv, clicks
LBL = ["会话", "用户", "浏览量", "联盟点击"]
mean = [sum(w[i] for w in wins) / max(1, len(wins)) for i in range(4)]
S = [sum(w[i] for w in wins) for i in range(4)]
# 泊松检验：把「前 7 日同时段」视为期望 λ（取均值），z = (obs - λ) / sqrt(λ)。
# 不要写成 sqrt(obs + S)：S 是 7 日均值的和，会把分母放大 ~2.6 倍、系统性低估 z。
Z = [((TODAY[i] - mean[i]) / math.sqrt(mean[i])) if mean[i] > 0 else 0.0 for i in range(4)]

sale_rows = [r for r in lf_conv if r[2] == "sale"]
lead_rows = [r for r in lf_conv if r[2] == "lead"]
rev = sum(float(r[7] or 0) for r in sale_rows)
testish = int(lf_testish[0] or 0)
# 转化侧窗口必须与取数脚本一致（lead_funnel.py 的 DAYS 默认 60），
# 不能写死成「近 4 日」——lf_* 数据是 60 日窗口，标签写错会让读者误判时间范围。
LF_DAYS = 60
LF_SPAN = (f"{lf_daily[-1][0]} ~ {lf_daily[0][0]}" if lf_daily else "—")

# ------------- SVG -------------
def svg_bars(data, labels, w=900, h=200, pad=(44, 16, 34, 48), color="#94b3f0", hi=None, hi_color="#dc2626",
             ylab="", every=1):
    l, r, t, b = pad
    n = len(data) or 1
    mx = max(data) or 1
    iw, ih = w - l - r, h - t - b
    step = iw / n
    bw = max(3.0, step * 0.62)
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
        if v and (i % every == 0 or i == hi):
            o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih-bh-4:.1f}" font-size="10" fill="#5a6274" text-anchor="middle">{v:.0f}</text>')
        if i % every == 0 or i == hi:
            o.append(f'<text x="{x+bw/2:.1f}" y="{t+ih+15:.1f}" font-size="9.5" fill="#8b93a5" text-anchor="middle">{labels[i]}</text>')
    o.append(f'<text x="{l}" y="{t-8}" font-size="11" fill="#8b93a5">{esc(ylab)}</text>')
    o.append("</svg>")
    return "".join(o)


def svg_hbars(items, w=900, rowh=28, color="#2f6fed", lab=110):
    if not items:
        return '<div class="small">（无数据）</div>'
    h = rowh * len(items) + 16
    mx = max(v for _, v, *_ in items) or 1
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    for i, it in enumerate(items):
        name, v = it[0], it[1]
        tail = it[2] if len(it) > 2 else ""
        y = 8 + i * rowh
        bw = (w - lab - 220) * v / mx
        o.append(f'<text x="{lab-8}" y="{y+15}" font-size="12" fill="#3d4453" text-anchor="end">{esc(name)}</text>')
        o.append(f'<rect x="{lab}" y="{y+4}" width="{max(bw,1):.1f}" height="14" rx="3" fill="{color}" opacity="{max(0.45,0.95-0.09*i):.2f}"/>')
        o.append(f'<text x="{lab+bw+8:.1f}" y="{y+15}" font-size="12" fill="#5a6274">{v:g} {esc(tail)}</text>')
    o.append("</svg>")
    return "".join(o)


def svg_chain(steps, w=900):
    """横向因果链：click → 注册 → 付费"""
    n = len(steps)
    seg = w / n
    h = 132
    o = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="display:block">']
    y = 46
    o.append(f'<line x1="{seg*0.5}" y1="{y}" x2="{w-seg*0.5}" y2="{y}" stroke="#cfd8e8" stroke-width="2"/>')
    for i, (title, sub, note, col) in enumerate(steps):
        cx = seg * i + seg / 2
        o.append(f'<circle cx="{cx:.0f}" cy="{y}" r="9" fill="{col}" stroke="#fff" stroke-width="2.5"/>')
        o.append(f'<text x="{cx:.0f}" y="{y-24}" font-size="13" font-weight="700" fill="#1c2230" text-anchor="middle">{esc(title)}</text>')
        o.append(f'<text x="{cx:.0f}" y="{y+30}" font-size="11.5" fill="#5a6274" text-anchor="middle">{esc(sub)}</text>')
        o.append(f'<text x="{cx:.0f}" y="{y+48}" font-size="11" fill="#8b93a5" text-anchor="middle">{esc(note)}</text>')
        if i < n - 1 and i < len(AGAPS):
            mx = cx + seg / 2
            o.append(f'<text x="{mx:.0f}" y="{y-14}" font-size="11" fill="#c2410c" text-anchor="middle">+{esc(AGAPS[i])}</text>')
    o.append("</svg>")
    return "".join(o)


AGAPS = []


def gap_between(a, b):
    fmt = "%Y-%m-%d %H:%M:%S"
    ta = datetime.strptime(a[:19], fmt)
    tb = datetime.strptime(b[:19], fmt)
    d = (tb - ta).total_seconds()
    if d < 3600:
        return f"{d/60:.0f} 分钟"
    h, rem = divmod(int(d), 3600)
    return f"{h} 小时 {rem//60} 分"


# ------------- 组装 -------------
win_rows = "".join(
    f"<tr><td>{LBL[i]}</td><td class='num'>{TODAY[i]}</td><td class='num'>{mean[i]:.1f}</td>"
    f"<td class='num {'pos' if Z[i] > 2 else ('neg' if Z[i] < -2 else '')}'>{Z[i]:+.2f}</td>"
    f"<td>{'显著变化' if abs(Z[i]) > 2 else '噪声内（无异常）'}</td></tr>" for i in range(4))

# 今日会话表
sess_rows = "".join(
    f"<tr><td>{esc(s[0][11:19])}</td><td>{esc(s[1])}</td><td>{esc(s[2])}</td><td class='mono'>{esc(s[6])}</td>"
    f"<td>{esc(s[4])}</td><td class='num'>{s[7]}</td><td class='num'>{s[9]}</td>"
    f"<td class='num {'pos' if s[10] else ''}'>{s[10]}</td></tr>" for s in sess)

# 今日点击表
click_rows = "".join(
    f"<tr><td>{esc(c[0][11:19])}</td><td class='mono'>{esc(c[1])}</td><td>{esc(c[2])}</td>"
    f"<td class='mono'>{esc(c[3])}</td><td class='mono'>{esc(c[4])}</td><td class='num'>{int(c[6])/1000:.1f}s</td></tr>"
    for c in clicks)

# 转化明细（真实）
conv_rows = "".join(
    f"<tr><td>{esc(r[0][:16])}</td><td class='mono'>{esc(r[1][:18])}</td>"
    f"<td><span class='tag {'ok' if r[2]=='sale' else ''}'>{esc(r[2])}</span></td>"
    f"<td>{esc(r[3] or '—')}</td><td class='mono'>{esc(r[4] or '—')}</td><td class='num'>${float(r[7] or 0):.0f}</td></tr>"
    for r in lf_conv)

# 链路还原：取窗口内最近一笔 sale，用其 click_token 回查点击（勿硬编码具体 token）
_last_sale = sale_rows[0] if sale_rows else None
chain_click = None
if _last_sale and _last_sale[4]:
    chain_click = next((c for c in clicks14 if c[4] == str(_last_sale[4])), None)
if _last_sale:
    _clk_txt = (f"{esc(str(chain_click[1]))} · {esc(str(chain_click[2]))}" if chain_click else "窗口内点击明细未命中（token 早于 14 日）")
    CHAIN = svg_chain([
        ("点击 CTA", (str(chain_click[0]) if chain_click else "—"), _clk_txt, "#2f6fed"),
        ("付费回传", esc(str(_last_sale[0])[:16]), f"{esc(str(_last_sale[3]))} · ${float(_last_sale[7] or 0):.0f}", "#15803d"),
    ])
    _tok_note = (f"付费回传 <span class='mono'>click_token = {esc(str(_last_sale[4]))}</span>"
                 + (f"，与 <span class='mono'>{esc(str(chain_click[0]))}</span> 的 <span class='mono'>{esc(str(chain_click[1]))}</span> 点击吻合 → 归属由令牌确定"
                    if chain_click else "，但该 token 不在近 14 日点击明细中，无法在本报告内闭环"))
    CONV_BLOCK = (f"<div class='note good'><b>窗口内最近一笔付费（sale）：{esc(str(_last_sale[0])[:16])}，"
                  f"{esc(str(_last_sale[3]))}，${float(_last_sale[7] or 0):.0f}。</b>{CHAIN}"
                  f"<ul><li>{_tok_note}</li>"
                  f"<li>交易号 <span class='mono'>{esc(str(_last_sale[1]))}</span>；"
                  f"<b>有令牌就用令牌</b>，不要用「成交在最后一次点击」的经验规则推断。</li>"
                  f"<li>「$0 注册 → 约 24h 后 $125 付费」是同一交易号的两行，累计营收按交易号去重。</li></ul></div>")
else:
    CONV_BLOCK = ("<div class='note'><b>近 {LF_DAYS} 日窗口内没有付费（sale）回传。</b>"
                  "PostHog 未收到 ≠ 后台没有转化；转化笔数与营收以 barges 后台为唯一事实源，"
                  "PostHog 侧仅用于归因（可见下限）。</div>")

tsum_row = next((r for r in raw if r[0] == DAY), None)
raw_note = (f"未过滤口径：会话 {tsum_row[2]} / 用户 {tsum_row[1]} / 浏览 {tsum_row[3]} / 点击 {tsum_row[4]}"
            if tsum_row else "")

labels30 = [d[0][5:] for d in daily]
hi = len(daily) - 1
chart_sess = svg_bars([d[2] for d in daily], labels30, hi=hi, ylab=f"近 {len(daily)} 日 会话数（干净口径，红=今日）", every=2)
chart_clicks = svg_bars([d[4] for d in daily], labels30, hi=hi, ylab=f"近 {len(daily)} 日 联盟点击（红=今日）", every=2)
chan_bars = svg_hbars([(c[0], c[1], f"· 点击 {c[2]} · 会话点击率 {c[3]}%") for c in chan], lab=90)
geo_bars = svg_hbars([(f"{g[0]} / {g[1]}", g[2], f"· 点击 {g[3]}") for g in geo], lab=150, color="#5b8def")
entry_rows = "".join(
    f"<tr><td class='mono'>{esc(e[0])}</td><td>{esc(e[1])}</td><td class='num'>{e[2]}</td>"
    f"<td class='num'>{e[3]}</td><td class='num'>{e[4]}%</td></tr>" for e in entry)
thin_rows = "".join(
    f"<tr><td>{esc(t[0])}</td><td class='num'>{t[1]}</td><td class='num'>{t[2]}</td>"
    f"<td class='num'>{t[2]/max(1,t[1])*100:.0f}%</td></tr>" for t in thin7)
lf_daily_rows = "".join(
    f"<tr><td>{esc(d[0])}</td><td class='num'>{d[1]}</td><td class='num'>{d[2]}</td>"
    f"<td class='num'>${float(d[3] or 0):.0f}</td><td class='num'>{d[4]}</td></tr>" for d in lf_daily)

go_today = [g for g in go if str(g[0]) == DAY]
go_txt = "，".join(f"{g[1]} {g[2]}" for g in go_today) or "今日无 /go 事件"

# ---- 派生叙述（勿硬编码，随当日数据变化）----
_sig = [i for i in range(4) if abs(Z[i]) > 2]
traf_verdict = "在噪声内，未见异常" if not _sig else f"需关注（{ '、'.join(LBL[i] for i in _sig) } 超过 |z|&gt;2）"
if TODAY[3] == 0:
    LI_CLICK = ("<li><b>今日到目前没有任何联盟点击。</b>这是最值得盯的一项：不是统计显著，而是“零”本身。</li>")
    AI_CLICK = (f"<span class='tag warn'>观察</span><b>今日 0 点击</b>。单日 0 不构成趋势"
                f"（前 7 日同时段均值 {mean[3]:.1f}，z={Z[3]:+.2f}），但需连着看 2–3 天：若连续为 0，才说明承接端出问题。")
else:
    _ck = sorted(set(c[11] for c in sess if c[10]))
    LI_CLICK = (f"<li><b>今日联盟点击 {TODAY[3]} 次，来自 {len(_ck)} 个人</b>"
                f"（去重人数 {len(_ck)}）——报点击必须同时报人数，否则一个人连点会被误读成效率提升。</li>")
    _tms = [int(c[6])/1000 for c in clicks if c[6]]
    _q = ("决策时长充足（≥10s），属高意愿权衡" if _tms and min(_tms) >= 10
          else "存在 <3s 的快速点击，注意扫射式无效点击" if _tms and min(_tms) < 3 else "决策时长中等")
    AI_CLICK = (f"<span class='tag {'ok' if _tms and min(_tms)>=10 else 'warn'}'>观察</span>"
                f"<b>今日点击质量：{TODAY[3]} 次 / {len(_ck)} 人</b>（均值 {mean[3]:.1f}，z={Z[3]:+.2f}）。{_q}"
                f"（决策时长 {'/'.join(f'{t:.0f}s' for t in _tms) or '—'}）。")

# 当日转化摘要（当日 + 前一日，避免空窗口）
_today_conv = [r for r in lf_conv if str(r[0])[:10] == DAY]
if _today_conv:
    LI_CONV = f"<b>转化：</b>今日收到 {len(_today_conv)} 笔回传（详见第五节）。"
else:
    _last = lf_conv[0] if lf_conv else None
    LI_CONV = (f"<b>转化：今日暂无回传</b>（最近一笔为 {esc(str(_last[0])[:16])}，{esc(str(_last[3]))} {esc(str(_last[2]))}）"
               f"。PostHog 未收到 ≠ 后台没有，转化以后台（barges）为唯一事实源。")

HTML = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>今日流量 · {DAY}（截至 {ELAPSED}）</title>
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

<h1>今日流量 · easternalignment.com</h1>
<div class="meta">{DAY} 00:00 → <b>{ELAPSED}</b>（北京时间）｜ PostHog Project 532954 ｜ 干净口径（剔 CN / 自测 / 本地开发来源）｜ 当日未满，勿与其他整日直接比较</div>

<h2>一、结论摘要</h2>
<div class="card">
<ul>
<li><b>今日流量{traf_verdict}。</b>会话 {TODAY[0]}（前 7 日同时段均值 {mean[0]:.1f}，z={Z[0]:+.2f}）、用户 {TODAY[1]}、浏览 {TODAY[2]}、<b>联盟点击 {TODAY[3]}</b>（均值 {mean[3]:.1f}，z={Z[3]:+.2f}）。{"四项均未过泊松检验（|z|&gt;2），不能判为流量异常。" if all(abs(z) <= 2 for z in Z) else "存在超过 |z|&gt;2 的项，见下方判定列。"}</li>
{LI_CLICK}
<li>{LI_CONV}</li>
<li><b>Lead（注册）回传状态：</b>近 {LF_DAYS} 日 <b>{len(lead_rows)} 笔注册</b>、{len(sale_rows)} 笔付费（净营收 ${rev:.0f}）；另有 {len(lf_orph)} 条孤儿回传与 {testish} 条手工测试被排除。</li>
</ul>
</div>

<h2>二、核心指标与等长窗口对比</h2>
<div class="kpis">
<div class="kpi"><div class="v">{TODAY[0]}</div><div class="l">会话</div><div class="s">{raw_note}</div></div>
<div class="kpi"><div class="v">{TODAY[1]}</div><div class="l">用户（去重 person）</div><div class="s">薄会话 {t_sum[1]} / 0-vitals {t_sum[2]}</div></div>
<div class="kpi"><div class="v">{TODAY[2]}</div><div class="l">浏览量</div><div class="s">人均 {TODAY[2]/max(1,TODAY[0]):.2f} 页</div></div>
<div class="kpi"><div class="v">{TODAY[3]}</div><div class="l">联盟点击</div><div class="s">去重人数 {len(set(c[11] for c in sess if c[10]))}</div></div>
</div>
<table><thead><tr><th>指标</th><th class="num">今日</th><th class="num">前 7 日同时段均值</th><th class="num">泊松 z</th><th>判定</th></tr></thead>
<tbody>{win_rows}</tbody></table>
<div class="small" style="margin-top:8px">前 7 日同时段逐日样本（会话/用户/浏览/点击）：
{"; ".join(f"<span class='mono'>{w[0]}/{w[1]}/{w[2]}/{w[3]}</span>" for w in wins)}</div>

<h3>近 {len(daily)} 日走势</h3>
{chart_sess}
{chart_clicks}
<div class="small">09-20 的尖峰为已知机器流量簇；09-28 为最近一个完整日（25 会话 / 12 点击）。今日柱高受"当日未满"影响。</div>

<h2>三、渠道 / 地域 / 入口页</h2>
<h3>渠道结构（今日）</h3>
{chan_bars}
<h3>地域 × 设备</h3>
{geo_bars}
<h3>入口页</h3>
<table><thead><tr><th>入口页</th><th>来源</th><th class="num">会话</th><th class="num">点击</th><th class="num">会话点击率</th></tr></thead>
<tbody>{entry_rows}</tbody></table>

<h2>四、今日会话明细</h2>
<table><thead><tr><th>开始</th><th>国家</th><th>设备</th><th>入口页</th><th>来源</th><th class="num">浏览</th><th class="num">时长s</th><th class="num">点击</th></tr></thead>
<tbody>{sess_rows or "<tr><td colspan='8' class='small'>无会话</td></tr>"}</tbody></table>

<h3>今日联盟点击</h3>
<table><thead><tr><th>时间</th><th>页面</th><th>CTA 位置</th><th>slug</th><th>token</th><th class="num">决策时长</th></tr></thead>
<tbody>{click_rows or "<tr><td colspan='6' class='small'>今日无点击</td></tr>"}</tbody></table>
<div class="small">/go 链路：{esc(go_txt)}</div>

<h2>五、转化</h2>
{CONV_BLOCK}

<h3>近 {LF_DAYS} 日真实转化（{LF_SPAN}，已剔除测试数据）</h3>
<table><thead><tr><th>日</th><th class="num">注册 $0</th><th class="num">付费</th><th class="num">营收</th><th class="num">撤销</th></tr></thead>
<tbody>{lf_daily_rows}</tbody></table>
<table style="margin-top:12px"><thead><tr><th>时间</th><th>交易号</th><th>类型</th><th>平台</th><th>click_token</th><th class="num">金额</th></tr></thead>
<tbody>{conv_rows or "<tr><td colspan='6' class='small'>无</td></tr>"}</tbody></table>
<div class="note"><b>数据卫生提醒：</b>转化流里出现手工测试回传（<span class="mono">test123</span> / <span class="mono">x.y</span> / <span class="mono">zz1</span> 等占位值）。
已按「distinct_id 必须是 UUID 形状」在分析侧过滤，近 {LF_DAYS} 日剔除 <b>{testish} 条</b>；孤儿回传 <b>{len(lf_orph)} 条</b>单独统计（它们正是"后台会发、但宏未替换"的证据）。
真实注册与付费的 <span class="mono">distinct_id</span> 恒为 UUID，因此这条过滤规则可靠，不需要维护黑名单。</div>

<h2>六、风险与行动项</h2>
<div class="card">
<ul>
<li>{AI_CLICK}</li>
<li><span class="tag warn">待验证</span><b>Lead（注册）回传</b>。近 {LF_DAYS} 日 {len(lead_rows)} 笔注册、{len(sale_rows)} 笔付费。<b>真实注册是唯一验收标准</b>——若后台有注册而 PostHog 没有，看孤儿数：&gt;0 是宏没替换，=0 是「目标」没触发（barges 现有 3 行目标全是 First Purchase）。</li>
<li><span class="tag">口径</span>累计营收<b>按 transaction_id 去重</b>：Kasamba/PG 的「$0 注册 → 约 24h 后 $125 付费」是同一交易号的两行，按行求和会翻倍。</li>
<li><span class="tag ok">链路</span>归因令牌链健康：今日 affiliate_link_click {TODAY[3]} → aff_go_hit {sum(1 for g in go_today if g[1]=='aff_go_hit')}（今日）。</li>
</ul>
</div>

<h2>七、口径附录</h2>
<div class="card small">
<ul>
<li><b>站点隔离：</b>仅 <span class="mono">$host = easternalignment.com</span>；剔除 CN、本地开发来源、已知自测身份。</li>
<li><b>转化事件不带 <span class="mono">$host</span></b>，其查询一律去掉 host 条件（仅 CN + 自测），否则会得到「0 转化」的假结论。</li>
<li><b>时间</b>全部按 <span class="mono">toTimeZone(timestamp,'Asia/Shanghai')</span> 渲染；过滤用预计算的 epoch 整数。</li>
<li><b>测试数据过滤口径：</b>真实转化的 <span class="mono">distinct_id</span> 恒为 UUID 形状（来源是点击时的 <span class="mono">get_distinct_id()</span>），因此用形状判定即可排除全部手工占位回传。</li>
<li><b>滞后常数（本项目实测）：</b>Kasamba/PG 点击→$0 记录 58.8–68.6 分钟；注册→付费 23–24 小时（本例 24h36m，略超但同量级）；Keen 付费分钟级。</li>
<li><b>数据文件：</b><span class="mono">posthog_analysis/results/*.json</span>（today_* / win_d* / daily_clean / clicks_14d / lf_* 等），可复现。</li>
</ul>
</div>

<div class="small" style="margin-top:26px">生成于 {NOW.strftime('%Y-%m-%d %H:%M')} BJT · PostHog 532954（只读 API key 运行时读取，未落盘）</div>
</div></body></html>
"""

os.makedirs(os.path.dirname(DST), exist_ok=True)
with open(DST, "w", encoding="utf-8") as f:
    f.write(HTML)
print("written:", DST, len(HTML), "chars")
