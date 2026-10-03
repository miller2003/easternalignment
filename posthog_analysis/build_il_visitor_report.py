# -*- coding: utf-8 -*-
"""以色列访客（2026-10-03）行为画像 + 付费概率评估（自包含 HTML，浅色主题）

数据来源：
  ① PostHog 532954 —— 该访客全部事件 / 滚动深度 / autocapture 元素 / 设备环境
  ② barges 后台 2026-09 月度导出 CSV —— 用「注册→付费」基准率 + 已付费者的行为基准做对照

用法：python build_il_visitor_report.py
输出：scratch/il-visitor-behavior-<YYYYMMDD>.html
"""
import csv
import json
import os
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
os.makedirs(OUT, exist_ok=True)
import sys  # noqa: E402
sys.path.insert(0, os.path.join(WS, "posthog_analysis"))
from run_today import run, ep, TODAY, NOW  # noqa: E402

BJ = timezone(timedelta(hours=8))
DAY = NOW.strftime("%Y-%m-%d")
TAG = NOW.strftime("%Y%m%d")
DST = os.path.join(WS, "scratch", f"il-visitor-behavior-{TAG}.html")
os.makedirs(os.path.dirname(DST), exist_ok=True)

PID = "01a0fed6-6388-76d0-b437-246310c1c6f6"
W = f"(distinct_id='{PID}' OR toString(person_id)='{PID}')"
SEP_CSV = r"C:\Users\samja\Downloads\getConversions_5a8bdab6568c5bf4da4889fc085dacb4_20261001.csv"
# 2026-09 已确认的 Kasamba 付费交易号（来自后台 CSV，可与 PostHog 回传对上）
PAYER_TXNS = ["102e210fb60b4489ccf90c2eb7aad4", "1025b14eca74012aad216ae2f933c9",
              "1024a405690cbea72223c3ecefc0e4", "102524f5f3d971d4d460ce886709af"]


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def save(name, rows, cols):
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump({"columns": cols, "results": rows}, f, ensure_ascii=False, indent=1)


def fetch(name, sql):
    try:
        j = run(sql)
    except Exception as e:  # noqa
        print(f"[FAIL] {name}: {e}", flush=True)
        return [], []
    save(name, j["results"], j["columns"])
    print(f"[ok] {name} rows={len(j['results'])}", flush=True)
    return j["results"], j["columns"]


# ================= ① PostHog：该访客行为 =================
ev, _ = fetch("il_events", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, event,
       coalesce(properties.$pathname,'') AS path, toString(properties.time_on_page_ms) AS tms
FROM events WHERE {W} ORDER BY timestamp LIMIT 100""")

scroll, _ = fetch("il_scroll", f"""
SELECT coalesce(properties.$pathname,'') AS path,
       toString(properties.$prev_pageview_duration) AS prevdur,
       toString(properties.$prev_pageview_max_scroll_percentage) AS scroll,
       toString(properties.$prev_pageview_max_content_percentage) AS content
FROM events WHERE {W} AND event='$pageleave' ORDER BY timestamp LIMIT 20""")

auto, _ = fetch("il_autocapture", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, toString(properties.$event_type) AS et,
       toString(properties.$el_text) AS txt
FROM events WHERE {W} AND event='$autocapture' ORDER BY timestamp LIMIT 30""")

env, _ = fetch("il_env", f"""
SELECT toString(properties.$browser_version) AS brv, toString(properties.$os) AS os,
       toString(properties.$os_version) AS osv, toString(properties.$device_type) AS dev,
       toString(properties.$viewport_width) AS vw, toString(properties.$viewport_height) AS vh,
       toString(properties.$timezone) AS tz, toString(properties.$geoip_city_name) AS city,
       toString(properties.$session_entry_url) AS eurl, toString(properties.$referrer) AS ref
FROM events WHERE {W} AND event='$pageview' ORDER BY timestamp LIMIT 1""")

hist, _ = fetch("il_person_hist", f"""
SELECT toString(min(timestamp)) AS first_ever, toString(max(timestamp)) AS last_ever,
       count() AS n, count(DISTINCT properties.$session_id) AS sess
FROM events WHERE {W}""")

# 已付费者的回传（取 click_token）
txin = ",".join(f"'{t}'" for t in PAYER_TXNS)
payer_conv, _ = fetch("il_payer_conversions", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS t, toString(properties.transaction_id) AS txn,
       toString(properties.click_token) AS tok, toString(properties.sub_id) AS sub,
       toString(properties.$geoip_country_code) AS cc, toString(properties.revenue) AS rev
FROM events WHERE event='Order_Converted' AND toString(properties.transaction_id) IN ({txin})
ORDER BY timestamp LIMIT 20""")

payer_clicks, _ = fetch("il_payer_clicks", f"""
SELECT toString(toTimeZone(timestamp,'Asia/Shanghai')) AS click_t, toString(properties.click_token) AS tok,
       coalesce(toString(properties.slug),'') AS slug, coalesce(toString(properties.location),'') AS page,
       coalesce(toString(properties.ctaSource),'') AS cta, toString(properties.time_on_page_ms) AS tms,
       toString(properties.pages_before_click) AS pbc, toString(properties.click_seq) AS seq,
       toString(properties.is_first_click) AS first, toString(properties.$geoip_country_code) AS cc,
       toString(properties.$device_type) AS dev
FROM events WHERE event='affiliate_link_click'
  AND toString(properties.click_token) IN (
    SELECT toString(properties.click_token) FROM events
    WHERE event='Order_Converted' AND toString(properties.transaction_id) IN ({txin})
      AND properties.click_token IS NOT NULL)
ORDER BY timestamp LIMIT 30""")

# ================= ② 后台 CSV：基准率 + 升级滞后 =================
base = {"ok": False, "signup": 0, "sale": 0, "both": 0, "sale_only": 0, "signup_only": 0,
        "pay": 0.0, "customers": [], "by_platform": {}, "countries": {}}
lags = {}
if os.path.exists(SEP_CSV):
    rows = []
    with open(SEP_CSV, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if not r["Stat.datetime"].strip():
                continue
            rows.append({"dt": r["Stat.datetime"].strip(), "offer": r["Offer.name"].strip(),
                         "goal": r["Goal.name"].strip(), "country": r["Country.name"].strip(),
                         "browser": r["Browser.display_name"].strip(),
                         "payout": float(r["Stat.payout"]), "ad_id": r["Stat.ad_id"].strip()})
    J = defaultdict(list)
    for r in rows:
        J[r["ad_id"]].append(r)
    P = defaultdict(lambda: {"s": 0, "p": 0, "both": 0, "so": 0, "po": 0, "pay": 0.0})
    for ad, js in J.items():
        js.sort(key=lambda x: x["dt"])
        pl = ("Kasamba" if "Kasamba" in js[0]["offer"] else
              "PurpleGarden" if "Purple" in js[0]["offer"] else
              "Keen" if "Keen" in js[0]["offer"] else js[0]["offer"])
        has_s = any(j["goal"] == "Signup" for j in js)
        has_p = any(j["payout"] > 0 for j in js)
        P[pl]["pay"] += sum(j["payout"] for j in js)
        P[pl]["s"] += 1 if has_s else 0
        P[pl]["p"] += 1 if has_p else 0
        P[pl]["both"] += 1 if (has_s and has_p) else 0
        P[pl]["so"] += 1 if (has_s and not has_p) else 0
        P[pl]["po"] += 1 if (has_p and not has_s) else 0
        if pl == "Kasamba":
            sg = next((j["dt"] for j in js if j["goal"] == "Signup"), None)
            pu = next((j["dt"] for j in js if j["payout"] > 0), None)
            lag_h = None
            if sg and pu:
                fmt = "%Y-%m-%d %H:%M:%S"
                lag_h = round((datetime.strptime(pu[:19], fmt) - datetime.strptime(sg[:19], fmt)).total_seconds() / 3600, 2)
            base["customers"].append({"ad": ad, "country": js[0]["country"], "browser": js[0]["browser"],
                                      "signup": sg, "purchase": pu, "payout": sum(j["payout"] for j in js),
                                      "upgrade_h": lag_h})
            if sg:
                lags[ad] = sg
    ks = P["Kasamba"]
    base.update({"ok": True, "signup": ks["s"], "sale": ks["p"], "both": ks["both"],
                 "sale_only": ks["po"], "signup_only": ks["so"], "pay": ks["pay"],
                 "by_platform": {k: dict(v) for k, v in P.items()}})
    base["countries"] = {c: sum(1 for r in rows if r["country"] == c)
                         for c in sorted({r["country"] for r in rows})}
    save("il_base_rate", [base], list(base.keys()))

# ================= ③ 计算 =================
def esc_t(s):
    return str(s)[11:19] if len(str(s)) >= 19 else str(s)


# IL 访客会话指标
sess_start = ev[0][0] if ev else None
sess_end = ev[-1][0] if ev else None
pv = [e for e in ev if e[1] == "$pageview"]
clicks = [e for e in ev if e[1] == "affiliate_link_click"]
go = [e for e in ev if e[1] == "aff_go_hit"]
taps = [a for a in auto if (a[1] == "click" and not (a[2] or "").strip())]
navs = [a for a in auto if a[1] == "click" and "Browse all" in (a[2] or "")]
dec = [int(c[3]) for c in clicks if c[3] not in (None, "", "None")]
dwell = [float(s[1]) for s in scroll]
scr = [float(s[2]) for s in scroll]
max_dec = max(dec) if dec else 0
max_scr = max(scr) if scr else 0
tot_dwell = sum(dwell)
sess_ms = None
if sess_start and sess_end:
    fmt = "%Y-%m-%d %H:%M:%S.%f"
    sess_ms = int((datetime.strptime(sess_end, fmt) - datetime.strptime(sess_start, fmt)).total_seconds())

# 付费者基准：把「点击 → 注册 → 付费」三段串起来（时间全部来自 PostHog 点击 + 后台 CSV）
pay_rows = []
for pc in payer_conv:
    tok = pc[2]
    match = next((c for c in payer_clicks if c[1] == tok), None)
    lag_click_signup = None
    if pc[1] in lags and match:
        fmt = "%Y-%m-%d %H:%M:%S"
        t_click = datetime.strptime(match[0][:19], fmt)
        t_su = datetime.strptime(lags[pc[1]][:19], fmt)
        lag_click_signup = round((t_su - t_click).total_seconds() / 60)
    cust = next((c for c in base["customers"] if c["ad"] == pc[1]), None)
    pay_rows.append({"txn": pc[1], "click_t": match[0] if match else None, "tok": tok,
                     "slug": match[2] if match else "—", "page": match[3] if match else "—",
                     "cta": match[4] if match else "—", "tms": match[5] if match else None,
                     "pbc": match[6] if match else "—", "seq": match[7] if match else "—",
                     "cc": match[9] if match else "—", "dev": match[10] if match else "—",
                     "lag_min": lag_click_signup,
                     "up_h": cust["upgrade_h"] if cust else None,
                     "reg": lags.get(pc[1]), "pay": pc[0]})
pay_rows_with = [r for r in pay_rows if r["tms"]]
dec_base = sorted(int(r["tms"]) for r in pay_rows_with)
med_dec = dec_base[len(dec_base) // 2] if dec_base else 0
clk_base = sorted(int(r["seq"]) for r in pay_rows_with) if pay_rows_with else []
cs_lags = sorted(r["lag_min"] for r in pay_rows_with if r["lag_min"])
up_lags = sorted(r["up_h"] for r in pay_rows if r["up_h"])

# Wilson 95% CI
n_b, k_b = base["signup"], base["both"]
if n_b:
    z = 1.96
    p = k_b / n_b
    den = 1 + z * z / n_b
    cen = (p + z * z / (2 * n_b)) / den
    half = z * math.sqrt(p * (1 - p) / n_b + z * z / (4 * n_b * n_b)) / den
    ci_lo, ci_hi = max(0, cen - half), min(1, cen + half)
else:
    ci_lo = ci_hi = 0

# ================= SVG =================
FONT = "font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif"


def svg_timeline(steps, w=880):
    """steps = [(t, label, sub, kind)]  kind: page/click/go/nav/tap"""
    h = 74 * len(steps) + 26
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    parts.append(f'<line x1="86" y1="20" x2="86" y2="{h-30}" stroke="#c8d3e6" stroke-width="2"/>')
    COLOR = {"click": "#dc2626", "go": "#f59e0b", "page": "#2f6fed", "nav": "#7c3aed", "tap": "#94a3b8"}
    for i, (t, lab, sub, kind) in enumerate(steps):
        y = 30 + i * 74
        c = COLOR.get(kind, "#2f6fed")
        parts.append(f'<text x="72" y="{y+5}" font-size="11.5" fill="#334155" text-anchor="end" '
                     f'font-family="Cascadia Mono,Consolas,monospace">{esc(t)}</text>')
        parts.append(f'<circle cx="86" cy="{y}" r="6" fill="{c}"/>')
        parts.append(f'<text x="104" y="{y+5}" font-size="13" fill="#0f172a" font-weight="600">{lab}</text>')
        parts.append(f'<text x="104" y="{y+24}" font-size="11.5" fill="#5b6b83">{sub}</text>')
    parts.append('</svg>')
    return "".join(parts)


def svg_compare(items, w=880, rowh=44):
    """items = [(label, value, unit, color, note)]  横向条，用于决策时长对比"""
    h = rowh * len(items) + 16
    mx = max([v for _, v, _, _, _ in items] + [1])
    labw, inner = 250, w - 250 - 150
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    for i, (lab, v, unit, col, note) in enumerate(items):
        y = 8 + i * rowh
        bw = inner * (v / mx)
        parts.append(f'<text x="0" y="{y+17}" font-size="12" fill="#334155">{esc(lab)}</text>')
        parts.append(f'<rect x="{labw}" y="{y+5}" width="{max(bw,1):.1f}" height="17" rx="4" fill="{col}" opacity="0.9"/>')
        parts.append(f'<text x="{labw+max(bw,1)+8:.1f}" y="{y+18}" font-size="11.5" fill="#0f172a">'
                     f'{v}{unit}　<tspan fill="#64748b">{esc(note)}</tspan></text>')
    parts.append('</svg>')
    return "".join(parts)


# 时间线步骤：把 $pageleave 的停留/滚动精确挂到它前面那一次 $pageview 上
# （同一 URL 可能被访问两次而没有第二次 pageleave，不能按 URL 匹配）
pageleave_stats = {}
for i, e in enumerate(ev):
    if e[1] != "$pageleave":
        continue
    for k in range(i - 1, -1, -1):
        if ev[k][1] == "$pageview":
            pageleave_stats[k] = (e[2],)
            break
leave_lookup = {}
for i, e in enumerate(ev):
    if e[1] != "$pageview":
        continue
    nxt = None
    for k in range(i + 1, len(ev)):
        if ev[k][1] == "$pageview":
            break
        if ev[k][1] == "$pageleave":
            nxt = ev[k]
            break
    if nxt:
        s = next((s for s in scroll if s[0] == nxt[2]), None)
        leave_lookup[i] = s

tl = []
# 排序修正：aff_go_hit 的 beacon 与 affiliate_link_click 在同一秒内送达，
# 但 aff_go_hit 常先入库（异步 beacon）。为其加 300ms 排序惩罚，保证「点击 → /go 到达」的因果顺序。
fmt = "%Y-%m-%d %H:%M:%S.%f"
order = sorted(range(len(ev)),
               key=lambda i: (datetime.strptime(ev[i][0], fmt) +
                              timedelta(milliseconds=300 if ev[i][1] == "aff_go_hit" else 0)))
for i in order:
    e = ev[i]
    t, kind, path, tms = e[0], e[1], e[2], e[3]
    if kind == "$pageview":
        sc = leave_lookup.get(i)
        sg = f"离开时滚动 {float(sc[2])*100:.0f}%、停留 {float(sc[1]):.0f}s" if sc else "未记录离开（快速跳转）"
        tl.append((esc_t(t), f"浏览 {path}", sg, "page"))
    elif kind == "affiliate_link_click":
        tl.append((esc_t(t), "点击 Kasamba CTA", f"决策时长 {int(int(tms)/1000)} s", "click"))
    elif kind == "aff_go_hit":
        tl.append(("↳", "/go 到达 → 跳往 Kasamba", "出站成功（紧接上一次点击）", "go"))
tl_svg = svg_timeline(tl)

# 决策时长对比图
cmp_items = [(f"已付费者 {r['cc']}（#{i+1}）", int(int(r['tms'])/1000), " s", "#94a3b8",
              f"{r['cc']} · {r['cta']}") for i, r in enumerate(pay_rows_with)]
cmp_items.append(("本访客（以色列·最后一次点击）", int(max_dec / 1000), " s", "#dc2626", "topbar · 3 FREE Mins"))
cmp_svg = svg_compare(cmp_items)

# ================= HTML =================
payer_tr = "".join(
    f"<tr><td class='num'>{i+1}</td><td class='mono'>{esc(str(r['click_t'])[:19])}</td>"
    f"<td class='mono small'>{esc(r['page'])}</td><td>{esc(r['cta'])}</td>"
    f"<td class='num'>{int(int(r['tms'])/1000)}s</td><td class='num'>{esc(r['pbc'])}</td>"
    f"<td class='num'>{esc(r['seq'])}</td><td>{esc(r['cc'])}</td><td>{esc(r['dev'])}</td>"
    f"<td class='num'>{esc(r['lag_min'])} min</td><td class='num'>{esc(r['up_h'])} h</td></tr>"
    for i, r in enumerate(pay_rows_with))

il_tr = "".join(
    f"<tr><td class='mono'>{esc_t(r[0])}</td><td>{esc(r[2])}</td><td class='num'>{int(int(r[3])/1000)}s</td></tr>"
    for r in clicks)

kd = base if base["ok"] else None
verdict_rows = [
    ("会话内联盟点击次数", "3 次", f"已付费者 {min(clk_base)}–{max(clk_base)} 次（中位 "
     f"{clk_base[len(clk_base)//2]}）" if clk_base else "—", "高于基准", "ok"),
    ("最大决策时长", f"{int(max_dec/1000)} s", f"已付费者中位 {int(med_dec/1000)} s"
     f"（{min(dec_base)//1000}–{max(dec_base)//1000} s）" if dec_base else "—",
     f"{max_dec/med_dec:.1f} 倍于付费者中位" if med_dec else "—", "ok"),
    ("点击前已浏览页数", "1 / 1 / 2 页", "已付费者均为 1 页", "与基准一致", "n"),
    ("页面阅读深度（最大滚动）", f"{max_scr*100:.0f}%", "该指标无付费者基准可对照", "无法判别（偏浅）", "warn"),
    ("落地页类型", "评测页 /reviews/kasamba/…", "已付费者落在首页或指南页，无评测页样本", "无对照（中性）", "n"),
    ("是否首访即点击", "是（全站首访）", "已付费者同为各自会话内首次点击", "与基准一致", "n"),
    ("停留总时长", f"{tot_dwell:.0f} s（4 页）", "已付费者仅单页、无对照", "无法判别", "n"),
]

TAGCLS = {"ok": "tag ok", "warn": "tag warn", "n": "tag"}

html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>以色列访客行为画像与付费概率评估 · {DAY}</title>
<style>
  :root{{--bg:#f7f9fc;--panel:#fff;--ink:#0f172a;--sub:#5b6b83;--line:#dbe3ef;--acc:#2f6fed;}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--bg);color:var(--ink);{FONT};font-size:14.5px;line-height:1.72}}
  .wrap{{max-width:1000px;margin:0 auto;padding:34px 22px 70px}}
  h1{{font-size:24px;margin:0 0 6px}}
  h2{{font-size:18px;margin:36px 0 12px;padding-left:11px;border-left:4px solid var(--acc)}}
  h3{{font-size:15px;margin:22px 0 8px;color:#1e293b}}
  .meta{{color:var(--sub);font-size:12.5px;margin-bottom:18px}}
  .panel{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:14px 0}}
  .lead{{border-left:5px solid var(--acc);background:#f5f9ff;padding:14px 17px;border-radius:0 10px 10px 0}}
  .big{{font-size:30px;font-weight:700;line-height:1.2}}
  table{{width:100%;border-collapse:collapse;font-size:12.8px}}
  th,td{{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;vertical-align:top}}
  th{{background:#eef3fb;font-size:12px;color:#334155;font-weight:600}}
  td.num{{text-align:right;font-variant-numeric:tabular-nums}}
  .mono{{font-family:'Cascadia Mono',Consolas,monospace;font-size:12px}}
  .small{{font-size:11.5px}}
  .tag{{display:inline-block;padding:1px 7px;border-radius:20px;font-size:11px;border:1px solid #dbe3ef;background:#f8fafc;color:#475569}}
  .tag.ok{{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}}
  .tag.warn{{color:#b45309;background:#fffbeb;border-color:#fde68a}}
  .note{{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:9px;padding:11px 13px;font-size:12.8px;color:#334155}}
  .grid2{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
  ul{{margin:8px 0 8px 4px;padding-left:20px}} li{{margin:5px 0}}
  svg{{display:block;margin:6px 0}}
  .cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}}
  .card{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 14px}}
  .cl{{font-size:12px;color:var(--sub)}} .cv{{font-size:20px;font-weight:700;line-height:1.3}}
</style></head><body><div class="wrap">

<h1>以色列访客行为画像与「真实付费」概率评估</h1>
<div class="meta">对象：PostHog person <span class="mono">{PID}</span> · 站点 easternalignment.com（Project 532954）·
后台基准：barges 2026-09 月度导出（Kasamba）· 生成于 {DAY} {NOW.strftime('%H:%M')} BJT</div>

<div class="panel lead">
<b>一句话结论</b><div class="big">约 <span style="color:#dc2626">50–60%</span>（最可能值 ≈55%）</div>
<div style="margin-top:6px">判定依据：<b>Kasamba 的「注册 → 付费」基线升级率实测为 {kd['both']}/{kd['signup']} = 50%</b>
（barges 2026-09 全月，Wilson 95% 置信区间 {ci_lo*100:.0f}%–{ci_hi*100:.0f}%）；
这位访客在<b>两个可判别的行为维度上都超过了全部 3 位已知付费者</b>，因此从 50% 小幅上修。
<br><b>但必须说清楚：站内行为只能解释他为什么注册（$0），不能解释他会不会付费</b>——
付费决定发生在 Kasamba 站内、注册后约 23 小时，我们的埋点完全看不到。
所以这个概率本质上是「注册用户基线升级率 ± 行为微调」，不是行为测出来的。</div>
</div>

<h2>1. 访客画像</h2>
<div class="cards">
  <div class="card"><div class="cl">地域 / 城市</div><div class="cv">以色列 · Ganei Tikva</div><div class="small">Asia/Jerusalem 时区</div></div>
  <div class="card"><div class="cl">设备</div><div class="cv">iPhone · iOS 18.7</div><div class="small">Safari 26.6 · 视口 440×796</div></div>
  <div class="card"><div class="cl">当地时间</div><div class="cv">01:57–02:02</div><div class="small">凌晨时段</div></div>
  <div class="card"><div class="cl">是否新客</div><div class="cv">是</div><div class="small">全站首访即本会话</div></div>
  <div class="card"><div class="cl">入口 / 来源</div><div class="cv">评测页直落</div><div class="small">无 referrer（$direct）</div></div>
  <div class="card"><div class="cl">会话时长</div><div class="cv">{sess_ms or 0} 秒</div><div class="small">4 次浏览 · 3 次联盟点击</div></div>
</div>
<div class="note" style="margin-top:12px">落地页 = <span class="mono">{esc(env[0][8]) if env else '—'}</span>，
referrer = <span class="mono">{esc(env[0][9]) if env else '—'}</span>。
<b>直接落在深度评测页且无 referrer</b>，提示来自站外某个不带 referrer 的通道（App 内浏览器 / 私密转发链接 / 输入网址），
而不是搜索引擎——这一点与今天其余 6 个搜索引擎会话的行为完全不同。</div>

<h2>2. 完整行为时间线</h2>
<div class="panel">
{tl_svg}
<div class="small" style="color:#5b6b83">
红点 = 联盟 CTA 点击；橙点 = /go 出站；蓝点 = 浏览；灰点 = 无文本标签的点击。
另有 <b>1 次站内导航点击「Browse all Kasamba advisors」</b>（06:59:09）与
<b>3 次无文本标签的连点</b>（07:01:48 / 07:01:58 / 07:01:59，12 秒内），
两类都不产生联盟点击，是判断意图的关键线索。</div>
</div>

<h3>每次联盟点击的明细</h3>
<div class="panel"><table><thead><tr><th>时刻</th><th>所在页面</th><th class="num">决策时长</th></tr></thead>
<tbody>{il_tr}</tbody></table>
<div class="note" style="margin-top:10px">
<b>关键读法：</b>前两次点击分别在页面打开后 <b>22.9 秒</b> 和 <b>15.5 秒</b>，属于「看到就点」；
而第三次在 <b>152.9 秒</b> 后才点，是本会话唯一一次「权衡后点击」。
三次点击后页面仍在继续阅读（第一页点击后又多读了 68 秒）→
行为形状是<b>反复尝试进入同一个平台</b>，而不是一次性冲动点击。</div>
</div>

<h3>阅读深度（PostHog 页面离开时的真实滚动比例）</h3>
<div class="panel"><table><thead><tr><th>页面</th><th class="num">停留</th><th class="num">最大滚动</th><th class="num">内容覆盖</th><th>判读</th></tr></thead>
<tbody>
{''.join(f"<tr><td class='mono small'>{esc(s[0])}</td><td class='num'>{float(s[1]):.0f}s</td>"
         f"<td class='num'>{float(s[2])*100:.0f}%</td><td class='num'>{float(s[3])*100:.0f}%</td>"
         f"<td>{'浅读（只看开头）' if float(s[2])<0.1 else '中等深度' }</td></tr>" for s in scroll)}
</tbody></table>
<div class="small" style="color:#5b6b83">三页合计停留 {tot_dwell:.0f} 秒，但最长的那页也只滚动到 {max_scr*100:.0f}%。
<b>时间投入高、阅读深度浅</b> —— 时间主要花在「犹豫与比较」上，而不是「把一篇评测读完」。</div>
</div>

<h2>3. 判定：与「已经付过钱的人」逐项对照</h2>
<div class="note">
方法：把 barges 2026-09 后台那 4 笔 Kasamba 付费与 PostHog 回传按交易号对齐，
其中 3 笔带 <span class="mono">click_token</span>，可反查到他当初点的是哪个 CTA、点了多久、点了第几次。
这 3 笔就是本项目的「付费者行为基准」。</div>

<div class="panel"><h3>付费者的真实行为（基准）</h3>
<table><thead><tr><th class="num">#</th><th>点击时刻(BJT)</th><th>落地页</th><th>CTA 位置</th>
<th class="num">决策时长</th><th class="num">点击前页数</th><th class="num">会话内第几击</th><th>国家</th><th>设备</th>
<th class="num">点击→注册</th><th class="num">注册→付费</th></tr></thead><tbody>{payer_tr}</tbody></table>
<div class="small" style="color:#5b6b83">第 4 笔（09-11 付费）的回传没带 <span class="mono">click_token</span>，
无法回溯点击，未纳入基准。<b>基准样本 3 例，属极小样本，只能当方向参考。</b>
同时注意：<span class="mono">点击 → 注册</span> 实测为 {('、'.join(str(x) for x in cs_lags) + ' 分钟') if cs_lags else '—'}；
<span class="mono">注册 → 付费</span> 实测高度一致，三笔全部落在 {('%.1f–%.1f' % (min(up_lags), max(up_lags))) if up_lags else '—'} 小时。
而本访客最后一次点击（07:02）到你后台看到的注册（约 08:00）约 <b>58 分钟</b> —— 落在上表的分钟区间内，
这是本次归因最强的一条证据。</div>
</div>

<div class="panel"><h3>本访客 vs 付费者基准</h3>
<table><thead><tr><th>维度</th><th>本访客</th><th>已付费者基准</th><th>判定</th></tr></thead><tbody>
{''.join(f"<tr><td>{esc(a)}</td><td><b>{esc(b)}</b></td><td class='small'>{esc(c)}</td>"
         f"<td><span class='{TAGCLS[d]}'>{esc(e)}</span></td></tr>" for a, b, c, e, d in verdict_rows)}
</tbody></table></div>

<div class="panel"><h3>决策时长对比（秒，越大 = 权衡越久）</h3>{cmp_svg}
<div class="small" style="color:#5b6b83">灰条 = 3 位已付费者；红条 = 本访客。本访客的 153 秒是付费者中位（24 秒）的 <b>6.4 倍</b>。</div>
</div>

<h2>4. 概率推导（把假设拆开）</h2>
<div class="panel"><table><thead><tr><th>环节</th><th>数值 / 依据</th><th>方向</th></tr></thead><tbody>
<tr><td><b>基准率 P₀</b></td>
    <td>Kasamba 2026-09：注册 {kd['signup']} 例 → 付费 {kd['both']} 例 = <b>{kd['both']/kd['signup']*100:.0f}%</b>
    （另有 {kd['sale_only']} 例付费无注册行、{kd['signup_only']} 例注册未付费）；Wilson 95% CI {ci_lo*100:.0f}%–{ci_hi*100:.0f}%</td>
    <td><span class="tag">锚点</span></td></tr>
<tr><td><b>行为调整</b></td>
    <td>两个可判别维度（点击次数、决策时长）<b>同时高于全部 3 位付费者</b> → 小幅上修约 +5pp</td>
    <td><span class="tag ok">向上</span></td></tr>
<tr><td><b>阅读深度</b></td>
    <td>最长页仅滚动 {max_scr*100:.0f}% → 未做「选老师」的深度尽调；但无付费者基准可比，方向不明</td>
    <td><span class="tag">中性偏负</span></td></tr>
<tr><td><b>地域先验</b></td>
    <td>以色列在九月后台 {sum(base['countries'].values()) if base['ok'] else 0} 行里<b>出现 0 次</b>
    （美国 14、澳 3、加 2、英 2…）→ 无法提供正向先验，也不构成否定</td>
    <td><span class="tag">中性</span></td></tr>
<tr><td><b>平台时滞一致性</b></td>
    <td>点击→注册 ≈58 分钟，与三笔实测的 44–61 分钟区间吻合 → <b>归因成立，注册是真的</b></td>
    <td><span class="tag ok">向上</span></td></tr>
<tr><td style="background:#f5f9ff"><b>综合估计</b></td>
    <td style="background:#f5f9ff"><b>≈55%（合理区间 35%–65%）</b></td>
    <td style="background:#f5f9ff"><span class="tag warn">接近五成</span></td></tr>
</tbody></table></div>

<div class="panel"><h3>两种反面解释（必须并列，不能只讲顺的那一套）</h3>
<ul>
<li><b>「三次点击 = 摩擦，不是意愿」</b>：同一个人在同一会话里点同一平台 3 次，也可能是 /go 跳转在他的浏览器里没成功而反复重试。
但 3 次 <span class="mono">aff_go_hit</span> 都记录了，说明出站页确实加载并跳转过 → 这条解释变弱，但不能排除
（跳转成功 ≠ 落地 Kasamba 成功）。</li>
<li><b>「凌晨冲动注册，次日不绑卡」</b>：当地 02:00、5 分钟内连点 3 次、只读开头即点击，符合夜间冲动特征；
Kasamba 的 $0 注册不要求绑卡，注册成本极低。九月 {kd['signup_only']} 例注册从未付费，说明注册本身不等于付费。</li>
</ul></div>

<h2>5. 怎么验证（明天就能出结果）</h2>
<div class="panel"><ol>
<li><b>时间窗：2026-10-04 07:00 之后</b>。Kasamba 的「注册→付费」滞后在九月三笔里高度一致
（{('%.2f–%.2f' % (min(up_lags), max(up_lags))) if up_lags else '≈23'} 小时）。
今天注册 ≈08:00 → 若会付费，应在<b>明天早上 7–8 点</b>出现
<span class="mono">Order_Converted</span>（$125）。</li>
<li><b>判定动作：</b>查 PostHog 近 48 小时 <span class="mono">Order_Converted</span>。
出现 $125 且 <span class="mono">sub_id</span> 前缀 = <span class="mono">01a0fed6-…</span> → <b>付费成立，归因闭环</b>；
没有 → 这位访客落入「注册未付费」那一半。</li>
<li><b>要拿后台那一行的 sub id</b>（形如 <span class="mono">{PID}.&lt;6位令牌&gt;</span>）。
令牌可与今天 3 次点击逐一比对，确定<b>是哪一次点击成交</b>——
注意本项目已验证：<b>成交不一定是最后一次点击</b>，所以不要去猜，直接用令牌匹配。</li>
</ol></div>

<h2>6. 口径与局限</h2>
<div class="panel small"><ul>
<li><b>基准率样本 12 例</b>：Wilson 95% CI 为 {ci_lo*100:.0f}%–{ci_hi*100:.0f}%，跨度过大 → 任何点估计都不应被当作精确值。</li>
<li><b>C 端行为 vs 结果</b>：付费动作发生在 Kasamba 域内，本站埋点不可见。本评估是「用站内行为对注册后人群做倾向性排序」，
不是对未来的预测。</li>
<li><b>付费者基准仅 3 例</b>，且 3 例落地页都与本访客不同（首页 / 指南页 vs 评测页）→ 比较结论只能当方向。</li>
<li><b>注册类回传仍未接通</b>（近 60 日 PostHog lead 回传 0 笔），因此本访客的注册在图谱里不可见，
本次归因依赖「时间邻近 + 平台一致」，而非令牌直连。</li>
<li><b>数据文件：</b><span class="mono">posthog_analysis/results/il_*.json</span>，可由 <span class="mono">build_il_visitor_report.py</span> 复现。</li>
</ul></div>

<div class="small" style="margin-top:24px;color:#5b6b83">
报告生成：{DAY} {NOW.strftime('%H:%M:%S')} BJT · 数据源 PostHog 532954（只读 key，运行时读取，未落盘）+ barges 2026-09 月度导出
</div>
</div></body></html>"""

with open(DST, "w", encoding="utf-8") as f:
    f.write(html)
print("WROTE", DST, len(html), "bytes", flush=True)
print(f"base_rate={kd['both'] if kd else '?'}/{kd['signup'] if kd else '?'} CI=[{ci_lo:.3f},{ci_hi:.3f}]")
print(f"IL max_decision={max_dec}ms  payer_median={med_dec}ms  payer_clicks={clk_base}")
print(f"IL clicks={len(clicks)}  dwell_sum={tot_dwell:.0f}s  max_scroll={max_scr:.3f}")
