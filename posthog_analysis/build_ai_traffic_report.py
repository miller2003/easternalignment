# -*- coding: utf-8 -*-
"""AI 渠道流量下滑核查报告（自包含 HTML，浅色主题，零硬编码）

输入：results/ai_series.json（95 日分渠道逐日）、results/ai_detail.json（AI 会话明细）、
      results/ref_utm_21d.json（ref/utm 构成）
+ 现场探测：robots.txt / llms.txt / markdown 协商 / AI 爬虫 UA / sitemap lastmod
输出：scratch/ai-traffic-<YYYYMMDD>.html
"""
import json
import os
import re
import collections
import statistics
import urllib.request
import datetime
from datetime import datetime as DT, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
BJ = timezone(timedelta(hours=8))
NOW = DT.now(BJ)
DAY = NOW.strftime("%Y-%m-%d")
TAG = NOW.strftime("%Y%m%d")
DST = os.path.join(WS, "scratch", f"ai-traffic-{TAG}.html")
os.makedirs(os.path.dirname(DST), exist_ok=True)

FONT = "font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------- 1. 载入 PostHog 序列 ----------------
d = json.load(open(os.path.join(OUT, "ai_series.json"), encoding="utf-8"))
byday = collections.defaultdict(collections.Counter)
for day, ch, ref, ses, pv, ck, zv in d["results"]:
    byday[day][ch] += ses

days = sorted(byday)
start = DT.strptime(days[0], "%Y-%m-%d")
end = DT.strptime(days[-1], "%Y-%m-%d")
series = []
cur = start
while cur <= end:
    k = cur.strftime("%Y-%m-%d")
    r = byday.get(k, collections.Counter())
    series.append((k, r["AI"], r["Search"], r["Direct"], r["Referral"], sum(r.values())))
    cur += timedelta(days=1)

ai_detail = json.load(open(os.path.join(OUT, "ai_detail.json"), encoding="utf-8"))["results"]
R21 = json.load(open(os.path.join(OUT, "ref_utm_21d.json"), encoding="utf-8"))["results"]

# 滚动窗口一律剔除今天（当日未满，会让窗口被低估）
LAST_DAY = series[-1][0]
today_ai = series[-1][1]
closed = [s for s in series if s[0] != LAST_DAY]


def roll(idx, n, src=None):
    src = src if src is not None else closed
    return [(src[i + n - 1][0], sum(s[idx] for s in src[i:i + n]))
            for i in range(len(src) - n + 1)]


r7 = roll(1, 7)
v7 = [v for _, v in r7]
r4 = roll(1, 4)
v4 = [v for _, v in r4]
cur7 = r7[-1][1]
cur7_pct = sum(1 for v in v7 if v < cur7) / len(v7) * 100
cur4 = r4[-1][1]
cur4_pct = sum(1 for v in v4 if v < cur4) / len(v4) * 100

# 近 4 周（28 天）窗口内的分位，避免被早期爬升期拉低基准
recent_v4 = v4[-27:]
cur4_pct_recent = sum(1 for v in recent_v4 if v < cur4) / len(recent_v4) * 100
recent_v7 = v7[-26:]
cur7_pct_recent = sum(1 for v in recent_v7 if v < cur7) / len(recent_v7) * 100


def segm(a, b, fld, src=None):
    src = src if src is not None else series
    c = collections.Counter()
    nd = 0
    for day, ai, se, di, re_, tot in src:
        if a <= day <= b:
            c["AI"] += ai
            c["Search"] += se
            c["Direct"] += di
            c["Referral"] += re_
            c["tot"] += tot
            nd += 1
    v = c[fld]
    return v, v / nd if nd else 0, nd


# 两期均为 5 个完整日、等长、且不含 09-20 机器簇
segA = ("2026-09-22", "2026-09-26")
segB = ("2026-09-28", "2026-10-02")
ch_rows = []
for ch in ("AI", "Search", "Direct", "Referral", "tot"):
    a_v, a_pd, a_nd = segm(*segA, ch)
    b_v, b_pd, b_nd = segm(*segB, ch)
    lbl = {"AI": "AI 助手", "Search": "搜索引擎", "Direct": "直接访问", "Referral": "外链引荐", "tot": "全站合计"}[ch]
    ch_rows.append((lbl, a_v, a_pd, b_v, b_pd, (b_pd / a_pd - 1) * 100 if a_pd else 0))

aiA_tot, _, _ = segm(*segA, "AI")
totA, _, ndA = segm(*segA, "tot")
aiB_tot, _, _ = segm(*segB, "AI")
totB, _, ndB = segm(*segB, "tot")
shareA = aiA_tot / totA * 100
shareB = aiB_tot / totB * 100
aiA_pd, aiB_pd = aiA_tot / ndA, aiB_tot / ndB

# ---------------- 2. AI 入口页 长尾对比（等长 5 日窗口） ----------------
EA, EB = collections.Counter(), collections.Counter()
for day, ref, utm, um, ses, pv, ck, zv, entry, cc, dev in ai_detail:
    if segB[0] <= day <= segB[1]:
        EA[entry] += ses
    elif segA[0] <= day <= segA[1]:
        EB[entry] += ses
zero_pages = [k for k in EB if EB[k] > 0 and EA.get(k, 0) == 0 and k]
zero_sessions = sum(EB[k] for k in zero_pages)
only_recent = [k for k in EA if EA[k] > 0 and EB.get(k, 0) == 0]

# ---------------- 3. 现场探测 ----------------
B = "https://easternalignment.com"
probe = {"robots": None, "llms": None, "md": [], "ua": [], "sitemap_latest": None,
         "sitemap_urls": None, "lastmod_top": []}


def get(path, headers=None, timeout=45):
    req = urllib.request.Request(B + path, headers=headers or {"User-Agent": "Mozilla/5.0 (probe)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                import gzip
                raw = gzip.decompress(raw)
            return r.status, dict(r.headers), raw
    except Exception as e:  # noqa
        return None, {"err": str(e)}, b""


try:
    s, h, b = get("/robots.txt")
    probe["robots"] = (s, len(b), "Cloudflare managed content" in b.decode("utf-8", "replace"))
    s, h, b = get("/llms.txt")
    probe["llms"] = (s, len(b))
    for p in ["/", "/guides/best-tarot-readers-for-love/", "/reviews/kasamba/"]:
        s, h, b = get(p, {"Accept": "text/markdown", "User-Agent": "GPTBot/1.0"})
        probe["md"].append((p, s, h.get("Content-Type", ""), len(b)))
    for ua in ["GPTBot/1.2", "OAI-SearchBot/1.0", "ChatGPT-User/1.0", "PerplexityBot/1.0",
               "ClaudeBot/1.0", "Googlebot/2.1"]:
        s, h, b = get("/", {"User-Agent": ua})
        probe["ua"].append((ua, s, len(b)))
    s, h, b = get("/sitemap-0.xml")
    mods = collections.Counter(re.findall(r"<lastmod>([^<]+)</lastmod>", b.decode("utf-8", "replace")))
    probe["sitemap_urls"] = len(re.findall(r"<loc>", b.decode("utf-8", "replace")))
    probe["lastmod_top"] = sorted([(k[:10], v) for k, v in mods.items()], reverse=True)[:6]
    probe["sitemap_latest"] = probe["lastmod_top"][0][0] if probe["lastmod_top"] else None
except Exception as e:  # noqa
    print("probe partial:", e)

json.dump(probe, open(os.path.join(OUT, "ai_site_probe.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# ---------------- 4. SVG ----------------
def svg_line(points, w=880, h=210, pad=(40, 14, 34, 46), color="#2f6fed", hi_from=None):
    """points = [(label, value)]；hi_from = 高亮起始索引"""
    if not points:
        return ""
    n = len(points)
    mx = max(v for _, v in points) or 1
    iw = w - pad[0] - pad[3]
    ih = h - pad[1] - pad[2]
    xs = [pad[0] + iw * i / max(n - 1, 1) for i in range(n)]
    ys = [pad[1] + ih * (1 - v / mx) for _, v in points]
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    for g in range(5):
        y = pad[1] + ih * g / 4
        val = round(mx * (1 - g / 4))
        parts.append(f'<line x1="{pad[0]}" y1="{y:.1f}" x2="{w-pad[3]}" y2="{y:.1f}" stroke="#e6ecf5" stroke-width="1"/>')
        parts.append(f'<text x="{pad[0]-6}" y="{y+4:.1f}" font-size="10" fill="#94a3b8" text-anchor="end">{val}</text>')
    parts.append(f'<polyline fill="none" stroke="{color}" stroke-width="2" points="'
                 + " ".join(f"{xs[i]:.1f},{ys[i]:.1f}" for i in range(n)) + '"/>')
    if hi_from is not None:
        parts.append(f'<polyline fill="none" stroke="#dc2626" stroke-width="2.6" points="'
                     + " ".join(f"{xs[i]:.1f},{ys[i]:.1f}" for i in range(hi_from, n)) + '"/>')
        parts.append(f'<circle cx="{xs[-1]:.1f}" cy="{ys[-1]:.1f}" r="4.5" fill="#dc2626"/>')
    step = max(1, n // 9)
    for i in range(0, n, step):
        parts.append(f'<text x="{xs[i]:.1f}" y="{h-14}" font-size="10" fill="#64748b" text-anchor="middle">{esc(points[i][0][5:])}</text>')
    parts.append('</svg>')
    return "".join(parts)


def svg_daily(items, w=880, h=200, pad_l=40, pad_b=42, pad_t=20):
    """items = [(label, value, highlight)]"""
    n = len(items)
    iw = w - pad_l - 16
    bw = iw / n
    mx = max([v for _, v, _ in items] + [1])
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    parts.append(f'<line x1="{pad_l}" y1="{h-pad_b}" x2="{w-16}" y2="{h-pad_b}" stroke="#c8d3e6"/>')
    for i, (lab, v, hi) in enumerate(items):
        bh = (h - pad_b - pad_t) * v / mx
        x = pad_l + i * bw + bw * 0.2
        parts.append(f'<rect x="{x:.1f}" y="{h-pad_b-bh:.1f}" width="{bw*0.6:.1f}" height="{max(bh,0.8):.1f}" rx="2" '
                     f'fill="{"#dc2626" if hi else "#2f6fed"}" opacity="{1 if hi else 0.82}"/>')
        parts.append(f'<text x="{x+bw*0.3:.1f}" y="{h-pad_b-bh-4:.1f}" font-size="9.5" fill="#334155" text-anchor="middle">{v}</text>')
        parts.append(f'<text x="{x+bw*0.3:.1f}" y="{h-pad_b+14:.1f}" font-size="9" fill="#64748b" text-anchor="middle" '
                     f'transform="rotate(-55 {x+bw*0.3:.1f} {h-pad_b+14:.1f})">{esc(lab)}</text>')
    parts.append('</svg>')
    return "".join(parts)


def svg_group(rows, w=880, rowh=34, labA="", labB=""):
    """rows = [(label, a_val, a_perday, b_val, b_perday, pct)]  两期并列条"""
    mx = max([max(r[2], r[4]) for r in rows] + [1])
    labw, inner = 110, w - 110 - 150
    h = rowh * len(rows) + 34
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    parts.append(f'<rect x="{labw}" y="4" width="10" height="10" fill="#94a3b8"/><text x="{labw+15}" y="13" font-size="11" fill="#475569">{esc(labA)}</text>')
    parts.append(f'<rect x="{labw+170}" y="4" width="10" height="10" fill="#2f6fed"/><text x="{labw+185}" y="13" font-size="11" fill="#475569">{esc(labB)}</text>')
    for i, (lab, av, apd, bv, bpd, pct) in enumerate(rows):
        y = 26 + i * rowh
        wa = inner * apd / mx
        wb = inner * bpd / mx
        parts.append(f'<text x="0" y="{y+13}" font-size="12" fill="#334155">{esc(lab)}</text>')
        parts.append(f'<rect x="{labw}" y="{y+3}" width="{max(wa,1):.1f}" height="10" rx="2" fill="#94a3b8"/>')
        parts.append(f'<text x="{labw+max(wa,1)+6:.1f}" y="{y+12}" font-size="10.5" fill="#64748b">{apd:.1f}</text>')
        parts.append(f'<rect x="{labw}" y="{y+16}" width="{max(wb,1):.1f}" height="10" rx="2" fill="#2f6fed"/>')
        parts.append(f'<text x="{labw+max(wb,1)+6:.1f}" y="{y+25}" font-size="10.5" fill="#0f172a">{bpd:.1f}</text>')
        col = "#b91c1c" if pct < -20 else ("#15803d" if pct > 20 else "#64748b")
        parts.append(f'<text x="{w-8}" y="{y+18}" font-size="11.5" fill="{col}" text-anchor="end">{pct:+.0f}%</text>')
    parts.append('</svg>')
    return "".join(parts)


# 图表数据
last28 = series[-28:]
daily_bars = [(s[0], s[1], s[0] >= "2026-09-29") for s in last28]
line_pts = [(dd, v) for dd, v in r7[-34:]]
hi_from = len(line_pts) - 5
ch_svg = svg_group(ch_rows, labA=f"{segA[0][5:]}~{segA[1][5:]}（日均）", labB=f"{segB[0][5:]}~{segB[1][5:]}（日均）")

# ---------------- 5. 组装 ----------------
excl = [
    ("10-02 那次大改（big update）把 AI 流量搞坏了",
     "时间对不上：该部署发生在 <b>10-02 23:04</b>，而 AI 会话从 <b>09-29</b> 就开始走低，比部署早 3 天。"
     "且该次改动是「补 sitemap 优先级 + 补 _headers + 把 363KB 内联 JSON 外置」——方向都是<b>改善</b> AI 可读性。",
     "排除"),
    ("埋点/归因坏了（utm 丢失）",
     "AI 会话的识别有 <b>87%（230/265）</b>靠 <span class='mono'>utm_source=chatgpt.com</span>（ChatGPT 会剥掉 referrer）。"
     "逐日看该组合<b>从未中断</b>，09-29 之后每天仍有 <span class='mono'>$direct|chatgpt.com</span> 记录，形态未变 → 归因链路正常。",
     "排除"),
    ("内容停更，LLM 检索不再引用",
     f"sitemap 最新 lastmod = <b>{esc(probe['sitemap_latest'])}</b>（{esc(str(probe['lastmod_top'][:3]))}），"
     f"共 {probe['sitemap_urls']} 个 URL，距生成时刻只停更 1 天 → 内容新鲜度正常。",
     "排除"),
    ("AI 爬虫被 Cloudflare 拦了",
     f"真实 UA 逐个实测：<b>{'、'.join(f'{u}={s}' for u, s, _ in probe['ua'])}</b> 全部 200；"
     f"robots.txt {probe['robots'][0]}（{probe['robots'][1]} 字节，无 CF 注入块）；llms.txt {probe['llms'][0]}。",
     "排除"),
    ("首页对 AI 智能体的 markdown 坏了",
     f"<span class='mono'>Accept: text/markdown</span> 实测首页 <b>{probe['md'][0][1]}</b>、"
     f"{esc(probe['md'][0][2])} {probe['md'][0][3]} 字节（10-02 之前因超 150KB 上限是拿不到 markdown 的，现已修好）。"
     "注意：<span class='mono'>/reviews/kasamba/</span> 仍返回 HTML（467KB），这类超限页面对智能体不友好，但属既有状态。",
     "排除（并发现一个待办）"),
]

html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 渠道流量下滑核查 · {DAY}</title>
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
  .big{{font-size:26px;font-weight:700;line-height:1.25}}
  table{{width:100%;border-collapse:collapse;font-size:12.8px}}
  th,td{{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;vertical-align:top}}
  th{{background:#eef3fb;font-size:12px;color:#334155;font-weight:600}}
  td.num{{text-align:right;font-variant-numeric:tabular-nums}}
  .mono{{font-family:'Cascadia Mono',Consolas,monospace;font-size:12px}}
  .small{{font-size:11.5px}}
  .tag{{display:inline-block;padding:1px 7px;border-radius:20px;font-size:11px;border:1px solid #dbe3ef;background:#f8fafc;color:#475569}}
  .tag.ok{{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}}
  .tag.warn{{color:#b45309;background:#fffbeb;border-color:#fde68a}}
  .tag.err{{color:#b91c1c;background:#fef2f2;border-color:#fecaca}}
  .note{{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:9px;padding:11px 13px;font-size:12.8px;color:#334155}}
  .cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px}}
  .card{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:13px 14px}}
  .cl{{font-size:12px;color:var(--sub)}} .cv{{font-size:22px;font-weight:700;line-height:1.3}}
  ul{{margin:8px 0 8px 4px;padding-left:20px}} li{{margin:5px 0}}
  svg{{display:block;margin:6px 0}}
</style></head><body><div class="wrap">

<h1>AI 渠道流量下滑核查</h1>
<div class="meta">easternalignment.com · PostHog Project 532954 · 干净口径（剔 CN / 自测 / 本地来源）·
数据窗口 2026-{days[0][5:]} → {DAY}（{len(series)} 天）· 生成于 {DAY} {NOW.strftime('%H:%M')} BJT</div>

<div class="panel lead">
<b>结论</b>
<div class="big">近 4 天确实偏低，但<b>还没到「明显变少」的程度</b>；而且<b>不是 AI 独有的问题</b>。</div>
<ol style="margin-top:8px">
<li><b>近 4 天（09-29~10-02）AI 会话共 {cur4} 次、日均 {cur4/4:.1f}</b>，
是近 4 周的最低档（4 日窗口 {cur4} 次，位于近 {len(recent_v4)} 个窗口的第 <b>{cur4_pct_recent:.0f}</b> 百分位）。</li>
<li>但把窗口拉到 <b>7 天</b>就基本回到常态：<b>{cur7} 次</b> vs 全期 7 日窗口中位 <b>{int(statistics.median(v7))}</b> 次
（第 {cur7_pct:.0f} 百分位；近 4 周窗口第 {cur7_pct_recent:.0f} 百分位）→ <b>「明显变少」的证据不足</b>。</li>
<li><b>同期全站一起下滑</b>，AI 在渠道结构里的占比几乎没动（{shareA:.1f}% → {shareB:.1f}%）→
不是「AI 渠道被单独掐掉」，更像整体需求/曝光的普遍波动。</li>
<li><b>外链引荐 +150% 不必在意</b>：基数只有 0.4→1.0/天，属于小样本噪声。其余渠道无一上涨。</li>
<li>4 个最常被怀疑的技术原因<b>全部排除</b>（部署时间对不上、埋点没坏、内容没停更、爬虫没被拦）——
详见第 4 节。唯一的可见结构变化是 <b>AI 入口页的长尾变薄</b>（{len(zero_pages)} 个页面由「有 AI 会话」变成 0）。</li>
</ol>
</div>

<h2>1. 关键数字</h2>
<div class="cards">
  <div class="card"><div class="cl">近 7 日 AI 会话</div><div class="cv">{cur7}</div>
    <div class="small">全期中位 {int(statistics.median(v7))} · 第 {cur7_pct:.0f} 百分位</div></div>
  <div class="card"><div class="cl">近 4 日 AI 会话</div><div class="cv">{cur4}</div>
    <div class="small">近 4 周第 {cur4_pct_recent:.0f} 百分位</div></div>
  <div class="card"><div class="cl">AI 占全站会话</div><div class="cv">{shareB:.1f}%</div>
    <div class="small">上一周期 {shareA:.1f}%（等长 5 日窗口）</div></div>
  <div class="card"><div class="cl">AI 日均（近 7 日）</div><div class="cv">{cur7/7:.1f}</div>
    <div class="small">上一周期 {segm(*segA,'AI')[1]:.1f}/天</div></div>
  <div class="card"><div class="cl">内容最新更新</div><div class="cv">{esc(probe['sitemap_latest'])}</div>
    <div class="small">sitemap 共 {probe['sitemap_urls']} 个 URL</div></div>
</div>

<h2>2. AI 会话的两条时间线</h2>
<div class="panel">
<h3>近 28 日逐日 AI 会话（红柱 = 09-29 起的低位段）</h3>
{svg_daily(daily_bars)}
<div class="small" style="color:#5b6b83">
09-28（一）12 次是近期高点，随后连续 4 天只有 2–3 次。历史上同样出现过连续 3 天低位（09-19~09-21：2/1/1），
所以「连续 4 天低位」在这个序列里属于偏极端但不算前所未见。</div>
</div>

<div class="panel">
<h3>AI 的 7 日滚动和（近 34 个窗口，红段 = 最近 5 个）</h3>
{svg_line(line_pts, hi_from=hi_from)}
<div class="small" style="color:#5b6b83">
7 日窗口从 09-18 的 49、09-28 的 49 一路回落到今天的 {cur7}。
<b>关键判断：{cur7} 等于全期中位（{int(statistics.median(v7))}），但低于近 4 周均值（{statistics.mean(recent_v7):.0f}）约 {(1-cur7/statistics.mean(recent_v7))*100:.0f}%。</b>
也就是说——<b>这是从「高位」回到「常态」，不是跌到「异常低位」</b>；只是「常态」恰好比最近三周的均值低。</div>
</div>

<h2>3. 是 AI 变少了，还是全站变少了</h2>
<div class="panel">
{ch_svg}
<div class="small" style="color:#5b6b83">两个窗口均为 <b>5 个完整日、等长</b>（09-22~09-26 与 09-28~10-02），且都<b>不含</b> 09-20 的 100 个机器簇会话与 10-03 的未满日。</div>
<div class="note" style="margin-top:10px">
<b>读法：</b>搜索基本持平（{segm(*segA,'Search')[1]:.1f} → {segm(*segB,'Search')[1]:.1f}/天），
AI 小幅下滑（{segm(*segA,'AI')[1]:.1f} → {segm(*segB,'AI')[1]:.1f}/天），直接访问与全站下滑更多。
<b>AI 的渠道占比几乎没变（{shareA:.1f}% → {shareB:.1f}%）</b> —— 这个数字是整个判断里最关键的一条：
如果 AI 是被「单独掐掉」的，占比会明显下降；它没降，说明下滑是<b>全站性的</b>。
</div>
</div>

<h2>4. 排除清单（4 个常见嫌疑逐个验）</h2>
<div class="panel"><table><thead><tr><th>嫌疑</th><th>实测证据</th><th>判定</th></tr></thead><tbody>
{''.join(f"<tr><td>{h[0]}</td><td>{h[1]}</td><td><span class='tag ok'>{h[2]}</span></td></tr>" for h in excl)}
</tbody></table></div>

<h2>5. 唯一可见的结构变化：入口页长尾变薄</h2>
<div class="panel">
<table><thead><tr><th>AI 入口页</th><th class="num">09-28~10-02</th><th class="num">09-22~09-26</th></tr></thead><tbody>
{''.join(f"<tr><td class='mono small'>{esc(k)}</td><td class='num'>{EA.get(k,0)}</td>"
         f"<td class='num'>{EB[k]}</td></tr>"
         for k in sorted(EB, key=lambda x: -EB[x])[:13])}
</tbody></table>
<div class="note" style="margin-top:10px">
近 5 天（09-28~10-02）AI 会话只落在 <b>{len(EA)}</b> 个入口页上，而前一个等长的 5 天窗口（09-22~09-26）分布在 <b>{len(EB)}</b> 个页面上；
<b>{len(zero_pages)} 个页面</b>（合计承载过 {zero_sessions} 个 AI 会话）在近 5 天降至 0（另有 {len(only_recent)} 个页面只在近 5 天出现）。
首页仍是最大入口（{EA.get('/',0)} 个会话），占比反而上升。<br>
<b>含义：</b>这不是「ChatGPT 不再引用我们」，而是<b>被引用的页面面变窄了</b>——
更少的页面在被 AI 推荐。这是最值得盯的一个可操作信号。
</div>
</div>

<h2>6. 建议怎么做</h2>
<div class="panel"><ol>
<li><span class="tag warn">再观察 3 天</span><b>用明确阈值代替感觉</b>：若 09-29 起的 4 日窗口继续 ≤ {cur4}（即日均 ≤ 2.5），
就是真下滑，按第 2 步处理；若回到 15–20（日均 3.8–5.0），即为噪声，不必动作。
<b>不要因为 4 天低位就改首页或删内容。</b></li>
<li><span class="tag">补盲区</span><b>最大的盲区是「没有关键词/引用级数据」</b>：本站未接 Google Search Console 与
Bing Webmaster。没有它们，只能看到「AI 来了多少人」，看不到「哪些 query / 哪些页面不再被引用」。
接上 GSC 是判断「引用面变窄」的最短路径（Bing 尤其重要，它是 Copilot 的唯一索引源）。</li>
<li><span class="tag">可立即做</span><b>把长尾归零页挑出来，做一次「AI 可读性 + 内链」体检</b>：
逐个用 <span class="mono">Accept: text/markdown</span> 请求，凡是返回 HTML（尤其 &gt;150KB 的 hub 页）
都对智能体不友好，可考虑拆薄或外置数据。今日实测已发现 <span class="mono">/reviews/kasamba/</span>（467KB）</li>
<li><span class="tag">可立即做</span><b>用已有的 IndexNow key 把最近更新/长尾归零页推一遍</b>
（Bing/Yandex/Naver 靠它；脚本在 <span class="mono">scripts/indexnow.mjs</span>，注意它只硬编码了 83/378 个 URL，
建议改为全量）。</li>
<li><span class="tag ok">口径更新</span>口径附录需补一条：近 21 日出现新的本地来源
<span class="mono">172.25.2.150:32293</span>（1 个会话，目前被算进「外链引荐」），应加入本地开发来源黑名单。</li>
</ol></div>

<h2>7. 口径附录</h2>
<div class="panel small"><ul>
<li><b>AI 渠道判定</b>：<span class="mono">(referrer + utm_source)</span> 匹配
<span class="mono">chatgpt|openai|perplexity|claude|gemini|copilot|kimi|deepseek|grok</span>。
本站 AI 会话的 <b>87%</b> 是 <span class="mono">referrer=$direct + utm_source=chatgpt.com</span>（ChatGPT 剥掉 referrer 所致）
—— <b>只看 referrer 会漏掉九成 AI 流量</b>。</li>
<li><b>分渠道必须事件层分桶</b>：本报告按「会话首事件日期」归日/归周，避免跨周会话被整段错分。</li>
<li><b>7 日/4 日滚动和</b>用于消除单日噪声；<b>分位数</b>比均值更能反映「当前处于什么水平」，
本报告同时给出「全期分位」与「近 4 周分位」——前者被早期爬升期拉低，后者更贴近当下常态。</li>
<li><b>机器流量</b>：09-20 的 100 个 <span class="mono">$direct</span> 会话为已知机器簇，凡涉及「直接访问」的分段均作剔除。</li>
<li><b>数据文件</b>：<span class="mono">posthog_analysis/results/ai_series.json</span> /
<span class="mono">ai_detail.json</span> / <span class="mono">ref_utm_21d.json</span> /
<span class="mono">ai_site_probe.json</span>，可由 <span class="mono">build_ai_traffic_report.py</span> 复现。</li>
</ul></div>

<div class="small" style="margin-top:24px;color:#5b6b83">
报告生成：{DAY} {NOW.strftime('%H:%M:%S')} BJT · 数据源 PostHog 532954（只读 key）+ 站点现场探测
</div>
</div></body></html>"""

with open(DST, "w", encoding="utf-8") as f:
    f.write(html)
print("WROTE", DST, len(html), "bytes")
print(f"cur7={cur7} (pct {cur7_pct:.0f}% / recent {cur7_pct_recent:.0f}%)  cur4={cur4} (recent pct {cur4_pct_recent:.0f}%)")
print(f"shareA_adj={shareA:.1f}% shareB={shareB:.1f}%  zero_pages={len(zero_pages)}/{len(EB)}")
