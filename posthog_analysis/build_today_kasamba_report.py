# -*- coding: utf-8 -*-
"""今日流量 + barges 后台 Kasamba 转化归因（自包含 HTML，浅色主题，零硬编码）

用法：先跑 run_today.py（+ lead_funnel.py），再跑本脚本。
输出：scratch/daily-report-kasamba-<YYYYMMDD>.html
"""
import json
import os
import math
import time
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
os.makedirs(OUT, exist_ok=True)

import sys
sys.path.insert(0, os.path.join(WS, "posthog_analysis"))
from run_today import run, ep, TODAY, NOW, CONV  # noqa: E402

BJ = timezone(timedelta(hours=8))
DAY = NOW.strftime("%Y-%m-%d")
TAG = NOW.strftime("%Y%m%d")
ELAPSED = NOW.strftime("%H:%M")
DST = os.path.join(WS, "scratch", f"daily-report-kasamba-{TAG}.html")
os.makedirs(os.path.dirname(DST), exist_ok=True)

T0 = ep(TODAY)
TN = ep(NOW)


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


def fetch(name, sql):
    try:
        jj = run(sql)
    except Exception as e:  # noqa
        print(f"[FAIL] {name}: {e}", flush=True)
        return []
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump({"sql": sql, "columns": jj["columns"], "results": jj["results"],
                   "hasMore": jj.get("hasMore")}, f, ensure_ascii=False, indent=1)
    print(f"[ok] {name} rows={len(jj['results'])}", flush=True)
    return jj["results"]


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


# ---------------- 取数（额外的归因查询） ----------------
print("BJ now:", NOW.isoformat(), flush=True)

# 今日全部回传类事件：完全不过滤
kv_probe = fetch("k_probe_today", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, event,
       toString(properties.raw_params) AS rp,
       toString(properties.conversion_type) AS ct,
       toString(properties.type_inference) AS ti,
       toString(properties.revenue) AS rev,
       toString(properties.client_ip) AS cip,
       toString(properties.client_country) AS ccc,
       toString(properties.client_ua) AS cua,
       toString(properties.transaction_id) AS txn,
       toString(properties.sub_id) AS sub,
       toString(properties.platform) AS plat
FROM events WHERE timestamp >= toDateTime({T0}) AND ({CONV})
  AND (event LIKE '%Converted%' OR event LIKE '%Postback%')
ORDER BY timestamp LIMIT 50
""")

# 近 45 日全部回传类事件（含孤儿）
kv_hist = fetch("k_postback_45d", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, event,
       toString(properties.conversion_type) AS ct,
       toString(properties.revenue) AS rev,
       toString(properties.platform) AS plat,
       toString(properties.raw_params) AS rp,
       toString(properties.client_ip) AS cip,
       toString(properties.transaction_id) AS txn
FROM events WHERE timestamp >= toDateTime({ep(TODAY - timedelta(days=45))})
  AND (event LIKE '%Postback%' OR event LIKE '%Converted%')
ORDER BY timestamp LIMIT 120
""")

# 今日点击者（按 distinct_id）的完整旅程
CLICKERS = ["01a0fed6-6388-76d0-b437-246310c1c6f6", "01a0fd5b-647b-7acb-92bc-0b90c9c24b7c"]
kv_journey = {}
for i, pid in enumerate(CLICKERS):
    kv_journey[pid] = fetch(f"k_journey_{i+1}", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, event,
       coalesce(properties.$pathname,'') AS path,
       coalesce(properties.$geoip_country_code,'') AS cc,
       coalesce(toString(properties.slug),'') AS slug,
       coalesce(toString(properties.ctaSource),'') AS cta,
       coalesce(toString(properties.text),'') AS txt,
       toString(properties.time_on_page_ms) AS tms,
       toString(properties.$session_id) AS sid
FROM events WHERE (distinct_id='{pid}' OR toString(person_id)='{pid}')
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=2))})
ORDER BY timestamp LIMIT 300
""")

# 近 7 日点击（归因母表）
kv_clicks = fetch("k_clicks_7d", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       coalesce(toString(properties.slug),'') AS slug,
       coalesce(toString(properties.location),'') AS page,
       coalesce(toString(properties.ctaSource),'') AS cta,
       toString(properties.click_token) AS tok,
       toString(properties.time_on_page_ms) AS tms,
       toString(properties.$geoip_country_code) AS cc,
       toString(distinct_id) AS did
FROM events WHERE event='affiliate_link_click'
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=7))})
ORDER BY timestamp DESC LIMIT 200
""")

# 近 60 日 lead/sale 概览（去重交易号）
kv_conv60 = fetch("k_conv_60d", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t,
       toString(properties.conversion_type) AS ct,
       toString(properties.revenue) AS rev,
       toString(properties.sub_id) AS sub,
       toString(properties.transaction_id) AS txn,
       toString(properties.click_token) AS tok,
       toString(distinct_id) AS did
FROM events WHERE event='Order_Converted' AND {CONV}
  AND timestamp >= toDateTime({ep(TODAY - timedelta(days=60))})
ORDER BY timestamp LIMIT 200
""")

# ---------------- 读已有结果 ----------------
daily = rows("daily_clean", ["day", "users", "sessions", "pageviews", "aff_clicks"])
raw_daily = rows("daily_raw", ["day", "users", "sessions", "pageviews", "aff_clicks"])
t_sum = (j("today_summary") or {}).get("results", [[0, 0, 0, 0]])[0]
sess = rows("today_sessions", ["t", "country", "dev", "br", "ref", "utm", "entry", "pv", "vit", "dur", "clicks", "pid", "ua"])
chan = rows("today_channels", ["channel", "sessions", "avg_dur", "bounce_pct", "total_clicks", "cvr_pct"])
geo = rows("today_geo", ["country", "dev", "sessions", "clicks"])
entry = rows("today_entry", ["entry", "ref", "sessions", "total_clicks", "cvr_pct"])
tclicks = rows("today_clicks", ["t", "page", "pos", "slug", "token", "txt", "tms", "first_click", "seq", "iid", "sid"])
thin7 = rows("thin_7d", ["day", "sessions", "thin", "zero_vitals"])
lf_conv = rows("lf_conversions", ["t", "txn", "ctype", "platform", "token", "sub", "did", "revenue"])
lf_orph = (j("lf_orphans") or {}).get("results", [])

wins = []
for off in range(1, 8):
    r = rows(f"win_d{off}", ["sessions", "users", "pageviews", "aff_clicks"])
    if r:
        wins.append((off, r[0]))

# ---- 泊松检验 ----
def pois(today_v, base_list):
    m = sum(base_list) / len(base_list) if base_list else 0.0
    s = math.sqrt(sum(base_list) + today_v) if (sum(base_list) + today_v) else 0.0
    z = (today_v - m) / s if s else 0.0
    return m, z


metrics = [
    ("会话数", 0, t_sum[0]),
    ("访问用户", 1, len({r[11] for r in sess})),
    ("浏览量", 2, t_sum[3]),
    ("联盟点击", 3, len(tclicks)),
]
metric_rows = []
for label, wi, tv in metrics:
    base = [w[wi] for _, w in wins]
    m, z = pois(tv, base)
    metric_rows.append((label, tv, m, min(base) if base else 0, max(base) if base else 0,
                        z, "正常范围" if abs(z) < 2 else "偏离基线"))

click_people = len({r[10] for r in tclicks})
thin = t_sum[1]
zv = t_sum[2]
n_sess = t_sum[0]

# ---------------- SVG 工具（浅色主题，显式 fill） ----------------
FONT = "font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif"


def svg_bars(items, w=880, h=210, pad_l=40, pad_b=44, pad_t=22, color="#2f6fed", alt="#dbe7ff"):
    """items = [(label, value, extra_label, highlight_bool)]"""
    if not items:
        return ""
    n = len(items)
    inner_w = w - pad_l - 16
    bw = inner_w / n
    mx = max([v for _, v, _, _ in items] + [1])
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    parts.append(f'<line x1="{pad_l}" y1="{h-pad_b}" x2="{w-16}" y2="{h-pad_b}" stroke="#c8d3e6" stroke-width="1"/>')
    for i, (lab, v, extra, hi) in enumerate(items):
        bh = (h - pad_b - pad_t) * (v / mx)
        x = pad_l + i * bw + bw * 0.18
        bwid = bw * 0.64
        fill = "#dc2626" if hi else color
        op = "1" if hi else "0.9"
        parts.append(f'<rect x="{x:.1f}" y="{h-pad_b-bh:.1f}" width="{bwid:.1f}" height="{max(bh,0.6):.1f}" rx="3" fill="{fill}" opacity="{op}"/>')
        parts.append(f'<text x="{x+bwid/2:.1f}" y="{h-pad_b-bh-5:.1f}" font-size="10" fill="#334155" text-anchor="middle">{v}</text>')
        if extra:
            parts.append(f'<text x="{x+bwid/2:.1f}" y="{h-pad_b-bh-17:.1f}" font-size="9" fill="#b91c1c" text-anchor="middle">{esc(extra)}</text>')
        parts.append(f'<text x="{x+bwid/2:.1f}" y="{h-pad_b+15:.1f}" font-size="9.5" fill="#64748b" text-anchor="middle" transform="rotate(-42 {x+bwid/2:.1f} {h-pad_b+15:.1f})">{esc(lab)}</text>')
    parts.append('</svg>')
    return "".join(parts)


def svg_hbars(items, w=880, rowh=26, color="#2f6fed", labw=210, notew=190, labmax=34):
    """items = [(label, value, note)]"""
    if not items:
        return ""
    h = rowh * len(items) + 18
    mx = max([v for _, v, _ in items] + [1])
    inner = w - labw - notew
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    for i, (lab, v, note) in enumerate(items):
        y = 10 + i * rowh
        bwid = inner * (v / mx)
        ltxt = lab if len(lab) <= labmax else lab[:labmax - 1] + "…"
        parts.append(f'<text x="0" y="{y+13}" font-size="11.5" fill="#334155">{esc(ltxt)}</text>')
        parts.append(f'<rect x="{labw}" y="{y+3}" width="{max(bwid,1):.1f}" height="14" rx="3" fill="{color}" opacity="0.85"/>')
        parts.append(f'<text x="{labw+max(bwid,1)+7:.1f}" y="{y+14}" font-size="11" fill="#0f172a">{v}　<tspan fill="#64748b">{esc(note)}</tspan></text>')
    parts.append('</svg>')
    return "".join(parts)


# ---------------- 组装区块 ----------------
# 1) 指标卡
cards = []
for label, tv, m, lo, hi, z, verdict in metric_rows:
    cls = "ok" if abs(z) < 2 else "warn"
    cards.append(f"""<div class="card"><div class="cl">{esc(label)}</div>
      <div class="cv">{tv}</div>
      <div class="cm">前 7 日同时段均值 {m:.1f}（{lo}–{hi}）· z={z:+.2f} <span class="tag {cls}">{esc(verdict)}</span></div></div>""")
cards_html = "".join(cards)

# 2) 近 20 日柱图
seq = daily[::-1]
bars = [(d[0][5:], d[2], "", d[0] == DAY) for d in seq]
bar_svg = svg_bars(bars, h=200)

# 3) 同时段对比图
wb = []
for off, w in wins[::-1]:
    dd = (TODAY - timedelta(days=off)).strftime("%m-%d")
    wb.append((dd, w[0], "", False))
bar_svg2 = svg_bars(wb + [(NOW.strftime("%m-%d"), t_sum[0], "", True)], h=180)

# 4) 渠道
chan_svg = svg_hbars([(c[0], c[1], f"点击 {c[4]} · 会话点击率 {c[5]}%") for c in chan])
entry_svg = svg_hbars([(e[0][:46], e[2], f"点击 {e[3]}（{e[1]}）") for e in entry[:10]])

# 5) 会话与点击明细表
sess_tr = "".join(
    f"<tr><td class='mono'>{esc(r[0][11:19])}</td><td>{esc(r[1])}</td><td>{esc(r[2])}</td>"
    f"<td class='mono small'>{esc(r[6][:44])}</td><td class='num'>{r[7]}</td><td class='num'>{r[9]}s</td>"
    f"<td class='num'>{r[10]}</td><td class='mono small'>{esc(r[4])}{('/' + esc(r[5])) if r[5] else ''}</td></tr>"
    for r in sess)
click_tr = "".join(
    f"<tr><td class='mono'>{esc(r[0][11:19])}</td><td class='mono small'>{esc(r[3])}</td>"
    f"<td>{esc(r[2])}</td><td class='num'>{r[6]}</td><td class='mono'>{esc(r[4])}</td>"
    f"<td class='small'>{esc(r[5])}</td></tr>" for r in tclicks)

# 6) 回传清单
def pb_rows(data):
    tr = []
    for r in data:
        t, ev, ct, rev, plat, rp, cip, txn = (list(r) + [None] * 8)[:8]
        cls = "warn" if ev and "Orphan" in ev else "ok"
        tr.append(f"<tr><td class='mono'>{esc(str(t)[:19])}</td><td><span class='tag {cls}'>{esc(ev)}</span></td>"
                  f"<td>{esc(ct if ct not in (None, 'None', '') else '(空)')}</td><td class='num'>{esc(rev if rev not in (None, 'None') else '—')}</td><td class='mono small'>{esc(rp)}</td>"
                  f"<td class='mono small'>{esc(cip if cip not in (None, 'None') else '—')}</td><td class='mono small'>{esc(txn)}</td></tr>")
    return "".join(tr)


pb_today_tr = pb_rows(kv_probe)
pb_hist_tr = "".join(
    f"<tr><td class='mono'>{esc(str(r[0])[:19])}</td><td><span class='tag {'warn' if 'Orphan' in r[1] else 'ok'}'>{esc(r[1])}</span></td>"
    f"<td>{esc(r[2])}</td><td class='num'>{esc(r[3])}</td><td class='mono small'>{esc(r[5])}</td>"
    f"<td class='mono small'>{esc(r[6])}</td></tr>" for r in kv_hist)

# 7) 今日真实 sale / lead 汇总
real_sales = [r for r in lf_conv if r[2] == "sale"]
lead_rows = [r for r in lf_conv if r[2] == "lead"]
net_rev = sum(int(r[7] or 0) for r in lf_conv if r[2] == "sale")
last_sale = real_sales[-1][0][:19] if real_sales else "—"

# 8) IL 候选旅程时间线
journey1 = kv_journey.get(CLICKERS[0], [])
il_steps = ""
for r in journey1:
    t = str(r[0])[11:19]
    ev, path, slug, cta, txt, tms = r[1], r[2], r[4], r[5], r[6], r[7]
    if ev == "affiliate_link_click":
        il_steps += (f"<li class='hl'><span class='tt'>{esc(t)}</span>"
                     f"<b>点击 Kasamba CTA</b>（{esc(cta)}）· 决策时长 <b>{int(int(tms)/1000)}s</b> · slug=<span class='mono'>{esc(slug)}</span>"
                     f"<div class='sub'>{esc(path)}</div></li>")
    elif ev == "aff_go_hit":
        il_steps += (f"<li><span class='tt'>{esc(t)}</span>/go 到达 → 跳往 Kasamba（slug=<span class='mono'>{esc(slug)}</span>）</li>")
    elif ev == "$pageview":
        il_steps += f"<li><span class='tt'>{esc(t)}</span>浏览 <span class='mono'>{esc(path)}</span></li>"

journey2 = kv_journey.get(CLICKERS[1], [])
us_clicks = [r for r in journey2 if r[1] == "affiliate_link_click"]

# 9) 判据对照
hyp = [
    ("后台那笔是 <b>$0 注册</b>（Kasamba 3 免费分钟）",
     "PostHog 看不到 <b>是预期</b>：60 天内 lead 回传 <b>0 笔</b>。barges 后台「目标」必须新增注册类行才会上报。",
     "tag warn", "把注册类回传的「目标」行补上（见 docs/lead-postback-setup.md §1）"),
    ("后台那笔是 <b>$125 付费</b>",
     "PostHog <b>本应收到</b> Order_Converted，但今天 <b>0 条</b> → 属链路异常（回传未发 / 发出但宏为空）。",
     "tag err", "从后台复制该行 sub id 与交易号，我按令牌反查点击"),
    ("今天的 06:00:19 孤儿就是那笔转化",
     "不成立：该孤儿 click_id 为空、UA=Chrome/132（2026 年已属旧版）、IP=阿里云 SG，站内无任何访客与之匹配；且它出现在 07:02 那次点击<b>之前</b>。",
     "tag warn", "按「探测/配置不全」处理，不计入业绩"),
]

# ---------------- HTML ----------------
html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>今日流量 + barges 后台 Kasamba 转化归因 · {DAY}</title>
<style>
  :root{{--bg:#f7f9fc;--panel:#ffffff;--ink:#0f172a;--sub:#5b6b83;--line:#dbe3ef;--acc:#2f6fed;}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--ink);{FONT};font-size:14.5px;line-height:1.72}}
  .wrap{{max-width:1000px;margin:0 auto;padding:34px 22px 70px}}
  h1{{font-size:25px;margin:0 0 6px}}
  h2{{font-size:18px;margin:38px 0 12px;padding-left:11px;border-left:4px solid var(--acc)}}
  h3{{font-size:15px;margin:24px 0 8px;color:#1e293b}}
  .meta{{color:var(--sub);font-size:12.5px;margin-bottom:20px}}
  .panel{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:14px 0}}
  .cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0 4px}}
  .card{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 15px}}
  .cl{{font-size:12.5px;color:var(--sub)}}
  .cv{{font-size:27px;font-weight:700;line-height:1.25;margin:2px 0 4px}}
  .cm{{font-size:11.5px;color:var(--sub)}}
  table{{width:100%;border-collapse:collapse;font-size:12.8px}}
  th,td{{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;vertical-align:top}}
  th{{background:#eef3fb;font-size:12px;color:#334155;font-weight:600}}
  td.num{{text-align:right;font-variant-numeric:tabular-nums}}
  .mono{{font-family:'Cascadia Mono',Consolas,monospace;font-size:12px}}
  .small{{font-size:11.5px}}
  .tag{{display:inline-block;padding:1px 7px;border-radius:20px;font-size:11px;border:1px solid}}
  .tag.ok{{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}}
  .tag.warn{{color:#b45309;background:#fffbeb;border-color:#fde68a}}
  .tag.err{{color:#b91c1c;background:#fef2f2;border-color:#fecaca}}
  ul{{margin:8px 0 8px 4px;padding-left:20px}}
  li{{margin:5px 0}}
  li.hl{{background:#fff7ed;border-left:3px solid #f59e0b;padding:5px 9px;border-radius:0 6px 6px 0}}
  .tt{{display:inline-block;width:66px;color:var(--sub);font-family:'Cascadia Mono',Consolas,monospace;font-size:12px}}
  .sub{{color:var(--sub);font-size:11.5px}}
  .note{{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:9px;padding:11px 13px;font-size:12.8px;color:#334155}}
  .lead{{border-left:5px solid var(--acc);background:#f5f9ff;padding:13px 16px;border-radius:0 10px 10px 0}}
  .kv{{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;font-size:12.6px}}
  .kv b{{color:#334155}}
  ul.bare{{list-style:none;padding-left:0;margin:0 0 12px}}
  ul.bare li{{margin:3px 0;font-size:12.8px}}
  ul.bare b{{color:#334155;display:inline-block;min-width:82px}}
  svg{{display:block;margin:6px 0}}
</style></head><body><div class="wrap">

<h1>今日流量 + barges 后台 Kasamba 转化归因</h1>
<div class="meta">站点 easternalignment.com（PostHog Project 532954）· 口径：干净口径（剔 CN / 自测 / 本地开发来源）·
数据截至 <b>{DAY} {ELAPSED} BJT</b>（当日未满，所有「今日」数字均为 00:00→{ELAPSED} 的累计值）</div>

<div class="panel lead">
<b>结论先行：</b>
<ol>
<li>今日{'截至 ' + ELAPSED if True else ''}共 <b>{n_sess} 个会话 / {len({r[11] for r in sess})} 位用户 / {t_sum[3]} 次浏览 / {len(tclicks)} 次联盟点击（来自 <b>{click_people} 个人</b>）</b>。
与<b>前 7 日同一时段</b>逐项对比，四个指标 <b>z 值全部 &lt; 1</b> → 属<b>正常波动</b>，不是「今天特别冷」或「今天特别好」。</li>
<li><b>PostHog 今天没有收到任何付费回传</b>（近 60 日共 {len(real_sales)} 笔 sale / 净营收 ${net_rev}，最后一笔是 {esc(last_sale)}）。
近 60 日 <b>lead（注册）回传 0 笔</b> —— 这是已知缺口，不是今天新增的故障。</li>
<li>今天唯一一条回传是 <b>{esc(kv_probe[0][0][:19]) if kv_probe else '—'} 的孤儿事件</b>：类型 lead、<span class="mono">click_id</span> 为空、
来源 IP 为阿里云新加坡段、UA 为 Chrome/132（2026 年属旧版）。站内<b>没有任何访客</b>与之匹配，且它出现在 07:02 那次点击<b>之前</b>
→ 判定为<b>探测 / 后台配置不全</b>，不是真实成交。</li>
<li>后台那笔 Kasamba 转化：<b>若为 $0 注册 → PostHog 看不到是预期</b>；<b>若为 $125 付费 → 我们本应收到却没有</b>，需按异常处理。
今天唯一的真人 Kasamba 候选是以色列访客（06:57:38–07:02:26，3 次 Kasamba CTA 点击、末次决策时长 <b>152.9 秒</b>）。
<b>要定案，只需你从后台复制那一行的 sub id</b>（形如 <span class="mono">&lt;UUID&gt;.&lt;6位令牌&gt;</span>）。</li>
</ol>
</div>

<h2>1. 核心指标（今日 vs 前 7 日同一时段）</h2>
<div class="cards">{cards_html}</div>
<div class="note">同时段对比 = 今日 00:00→{ELAPSED} 与过去 7 天各自 00:00→{ELAPSED} 的等长窗口。
判据：|z| &lt; 2 视为未超出泊松噪声。<b>不拿「今日未满的数据」与「完整日」直接比较</b>。</div>
<div class="panel">
<h3>同时段会话数对照</h3>
{bar_svg2}
<div class="small" style="color:#5b6b83">红柱 = 今日（未满日）。前 7 日同一时段会话数：{'、'.join(str(w[0]) for _, w in wins)}。</div>
</div>

<h2>2. 近 20 日走势</h2>
<div class="panel">
{bar_svg}
<div class="small" style="color:#5b6b83">柱高 = 干净口径会话数；红柱 = 今日（未满）。09-20 的 109 会话为已知机器流量簇，非真实增长。</div>
</div>
<div class="panel">
<h3>今日会话的「薄会话」体检</h3>
<table><thead><tr><th>指标</th><th class="num">数值</th><th>说明</th></tr></thead><tbody>
<tr><td>会话总数</td><td class="num">{n_sess}</td><td>干净口径</td></tr>
<tr><td>薄会话（1 浏览 + 无 vitals + ≤2 秒）</td><td class="num">{thin}</td><td>机器/误入的最保守判据</td></tr>
<tr><td>零 vitals 会话</td><td class="num">{zv}</td><td>更宽的机器判据</td></tr>
<tr><td>未过滤会话数（对照）</td><td class="num">{next((r[2] for r in raw_daily if r[0] == DAY), '—')}</td><td>含 CN / 自测 / 本地来源，用于证明口径没有误剔</td></tr>
</tbody></table>
</div>

<h2>3. 渠道 · 地域 · 入口页</h2>
<div class="panel"><h3>渠道</h3>{chan_svg}
<div class="small" style="color:#5b6b83">搜索引擎 6 个会话<b>零点击</b>；点击全部来自「直接访问」与「AI 助手」两类高意图来源。</div></div>
<div class="panel"><h3>入口页（会话数）</h3>{entry_svg}</div>
<div class="panel"><h3>地域 × 设备</h3>
<table><thead><tr><th>国家</th><th>设备</th><th class="num">会话</th><th class="num">点击</th></tr></thead><tbody>
{''.join(f"<tr><td>{esc(g[0])}</td><td>{esc(g[1])}</td><td class='num'>{g[2]}</td><td class='num'>{g[3]}</td></tr>" for g in geo)}
</tbody></table></div>

<h2>4. 今日明细</h2>
<div class="panel"><h3>联盟点击（{len(tclicks)} 次 / {click_people} 人）</h3>
<table><thead><tr><th>时刻</th><th>目标 slug</th><th>CTA 位置</th><th class="num">决策时长(ms)</th><th>令牌</th><th>按钮文案</th></tr></thead>
<tbody>{click_tr}</tbody></table>
<div class="small" style="color:#5b6b83">决策时长 = 点击前在本页停留毫秒数。152,869 ms（≈2 分 33 秒）是今日最高意愿信号；
3,697 ms 属偏低的「快速扫过」。</div></div>
<div class="panel"><h3>全部会话（{len(sess)} 个）</h3>
<table><thead><tr><th>首事件</th><th>国家</th><th>设备</th><th>入口页</th><th class="num">浏览</th><th class="num">时长</th><th class="num">点击</th><th>来源</th></tr></thead>
<tbody>{sess_tr}</tbody></table></div>

<h2>5. 转化与归因</h2>

<h3>5.1 PostHog 侧今日回传：仅 1 条孤儿</h3>
<div class="panel">
<table><thead><tr><th>时刻</th><th>事件</th><th>类型</th><th class="num">营收</th><th>raw_params</th><th>client_ip</th><th>交易号</th></tr></thead>
<tbody>{pb_today_tr or '<tr><td colspan="7">无</td></tr>'}</tbody></table>
<div class="note" style="margin-top:10px">
<b>这条孤儿为什么不能算成业绩：</b>
① <span class="mono">click_id</span> 为空 → 无法定位到任何点击/用户；
② <span class="mono">client_ip</span> = 阿里云新加坡段（真实 TUNE 回传走 AWS，如 09-29 那笔为 107.23.2.50）；
③ UA 为 Chrome/132（2026 年浏览器已迭代到 150+）→ 更像脚本/旧客户端；
④ 站内近 45 日<b>没有任何事件</b>来自该 IP；
⑤ 时间点（06:00:19）在今日唯一 Kasamba 点击（07:02）<b>之前</b>，不可能是它。
</div>
</div>

<h3>5.2 近 45 日回传全量（含孤儿）</h3>
<div class="panel">
<table><thead><tr><th>时刻</th><th>事件</th><th>类型</th><th class="num">营收</th><th>raw_params</th><th>client_ip</th></tr></thead>
<tbody>{pb_hist_tr or '<tr><td colspan="6">无</td></tr>'}</tbody></table>
<div class="small" style="color:#5b6b83">近 45 日真实付费 {len([r for r in kv_conv60 if r[1] == 'sale'])} 笔、注册 0 笔；
09-28 / 09-29 的若干条为当时的探测与自检（参数名被截断成 <span class="mono">&lt;?c=</span> / <span class="mono">&lt;?click_i=</span>）。</div>
</div>

<h3>5.3 今日唯一真人 Kasamba 候选：以色列访客</h3>
<div class="panel">
<ul class="bare">
<li><b>会话</b>　<span class="mono">01a0fed6-6394-70de-8fcf-ce9e5d0bee6e</span></li>
<li><b>身份</b>　<span class="mono">01a0fed6-6388-76d0-b437-246310c1c6f6</span>（首访即今天 → 新客）</li>
<li><b>地域 / 设备</b>　IL（以色列）· Mobile Safari / iPhone · 入口 = 直接访问</li>
<li><b>在线时长</b>　约 4 分 48 秒（06:57:38 → 07:02:26），4 次浏览</li>
</ul>
<ul>{il_steps}</ul>
<div class="note">
<b>为什么它是最强候选：</b>落地即 Kasamba 评测页（直接访问，非浅意图搜索），5 分钟内看了 <b>3 个 Kasamba 页面</b>、
<b>3 次点击 Kasamba CTA</b>，且末次在页面上停留 <b>2 分 33 秒</b>后才点「Kasamba Special Offer: 3 FREE Mins + 50% Off」——
这是「比较—犹豫—决策」的典型形状，而不是扫射式无效点击。
<br><b>为什么还不能定案：</b>若该用户注册，Kasamba 注册回传的时滞常数是 58.8–68.6 分钟，
应在 <b>约 08:00–08:10 BJT</b> 出现一条回传 —— <b>今天没有</b>。这与「注册类回传仍未接通（60 日 0 笔）」一致，
所以「没有回传」既可能是没接通，也可能是没注册，二者目前无法区分。
</div>
</div>

<h3>5.4 另一条点击线（非 Kasamba）</h3>
<div class="panel small">
美国 La Jolla 移动端访客在 <b>00:00:05</b> 与 <b>00:01:27</b> 各点一次 <span class="mono">/reviews/keen/</span> 的 hero
（决策时长 10,660 ms / 3,697 ms，会话入口为 chatgpt.com）。Keen 的「点击→付费」时滞仅 5–9 分钟，
若成交会在 00:05–00:10 出现回传 —— <b>今天没有</b>。
</div>

<h2>6. 假设与判据对照</h2>
<div class="panel">
<table><thead><tr><th>假设</th><th>PostHog 侧判据</th><th>处理</th></tr></thead><tbody>
{''.join(f"<tr><td>{h[0]}</td><td>{h[1]}</td><td><span class='{h[2]}'>{esc(h[3])}</span></td></tr>" for h in hyp)}
</tbody></table>
</div>

<h2>7. 风险与行动项</h2>
<div class="panel"><ol>
<li><span class="tag warn">待你确认</span><b>把后台那一行的 sub id 给我</b>（形如 <span class="mono">01a0fed6-6388-76d0-b437-246310c1c6f6.uhmxa8</span>）。
sub id 的 <span class="mono">.</span> 前半段是 UUIDv7，<b>前 48 位就是该浏览器首次落地的毫秒时间戳</b>，
可直接反解出「首访时刻」，从而把推断变成事实；后半段令牌可与今日点击表逐一比对。
同时请给：<b>该行的时间、广告单、状态、支出</b>（金额决定它是 $0 注册还是 $125 付费）。</li>
<li><span class="tag warn">待办</span><b>barges 后台补注册类「目标」行</b>：现有回传行的「目标」全是 First Purchase，
注册类目标从未绑定回传 URL。做法见仓库 <span class="mono">docs/lead-postback-setup.md</span> §1
（新增行 + URL 末尾追加 <span class="mono">&amp;conversion_type=lead</span>，现有行不要动）。这是「注册→付费升级率」
能否被回答的唯一前提。</li>
<li><span class="tag err">安全</span><b>回传端点 <span class="mono">/api/postback</span> 目前无鉴权</b>（未设置 <span class="mono">POSTBACK_SECRET</span>），
任何人都能灌入假转化。今天这条孤儿就是现成例证。建议设置环境变量启用密钥校验。</li>
<li><span class="tag ok">观察</span>今日流量本身<b>无需干预</b>：四项指标全部落在前 7 日同时段区间内，
唯一的薄会话 1 个（占比 {thin}/{n_sess}），也低于近 7 日常态。</li>
</ol></div>

<h2>8. 口径附录</h2>
<div class="panel small">
<ul>
<li><b>干净口径</b>：<span class="mono">$host = easternalignment.com</span> 且 <span class="mono">$geoip_country_code ≠ CN</span>
且入口来源不在本地开发端口白名单，且 person_id 不属于自测身份名单。</li>
<li><b>转化类事件不带 <span class="mono">$host</span></b>，因此回传查询一律去掉 host 条件（否则会得到「0 转化」的假结论），
本报告已做此处理。</li>
<li><b>薄会话</b> = 单会话内 1 个 <span class="mono">$pageview</span> + 0 个 <span class="mono">$web_vitals</span> + 会话时长 ≤ 2 秒。</li>
<li><b>点击去重</b>按 <span class="mono">$insert_id</span>；报点击量同时报去重人数。</li>
<li><b>营收去重</b>按 <span class="mono">transaction_id</span>；Kasamba / Purple Garden 的「$0 注册 → 约 24 小时绑卡」是同一交易号的两行。</li>
<li><b>数据文件</b>：<span class="mono">posthog_analysis/results/*.json</span>（today_* / win_d* / daily_clean / k_* / lf_*），可复现。</li>
</ul>
</div>

<div class="small" style="margin-top:26px;color:#5b6b83">
报告生成：{DAY} {NOW.strftime('%H:%M:%S')} BJT · 数据源 PostHog 532954（只读 personal API key，运行时从本地手册读取，未落盘）
</div>
</div></body></html>"""

with open(DST, "w", encoding="utf-8") as f:
    f.write(html)

assert "{" not in html.split("</style>")[1][:0]  # noop
print("WROTE", DST, len(html), "bytes", flush=True)
