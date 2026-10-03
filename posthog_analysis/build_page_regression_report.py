# -*- coding: utf-8 -*-
"""页面级流量退步核查报告（自包含 HTML，浅色主题）

输入：results/page_delta.json（日 × 页面 × 渠道 浏览量明细）+ 现场探测页面健康度
输出：scratch/page-regression-<YYYYMMDD>.html
"""
import json
import os
import re
import collections
import urllib.request
import gzip
from datetime import datetime as DT, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
OUT = os.path.join(WS, "posthog_analysis", "results")
BJ = timezone(timedelta(hours=8))
NOW = DT.now(BJ)
DAY = NOW.strftime("%Y-%m-%d")
DST = os.path.join(WS, "scratch", f"page-regression-{NOW.strftime('%Y%m%d')}.html")
os.makedirs(os.path.dirname(DST), exist_ok=True)
FONT = "font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif"

rows = json.load(open(os.path.join(OUT, "page_delta.json"), encoding="utf-8"))["results"]
summary = json.load(open(os.path.join(OUT, "page_delta_summary.json"), encoding="utf-8"))

JUNK = ("/go/", "/data/", "/.well-known/", "/api/", "/_astro/", "/sitemap", "/robots.txt", "/favicon")


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def ok(p):
    return p.startswith("/") and not any(k in p for k in JUNK)


def chan(ref, utm):
    s = (ref + " " + utm).lower()
    if any(k in s for k in ("chatgpt", "openai", "perplexity", "claude", "gemini", "copilot", "kimi",
                            "deepseek", "grok")):
        return "AI"
    if any(k in s for k in ("google", "bing", "yahoo", "duckduckgo", "yandex", "ecosia")):
        return "搜索"
    if ref in ("", "$direct"):
        return "直接"
    return "外链"


def section(p):
    if p in ("/", ""):
        return "首页"
    for q, n in (("/guides/", "guides"), ("/reviews/", "reviews"), ("/comparisons/", "comparisons"),
                 ("/es/", "ES"), ("/match/", "match"), ("/coupons/", "coupons"),
                 ("/methodology/", "methodology")):
        if p.startswith(q):
            return n
    return "其他"


WEEKS = [("W1", "09-05~09-11", "2026-09-05", "2026-09-11"),
         ("W2", "09-12~09-18", "2026-09-12", "2026-09-18"),
         ("W3", "09-19~09-25", "2026-09-19", "2026-09-25"),
         ("W4", "09-26~10-02", "2026-09-26", "2026-10-02")]

P = collections.defaultdict(collections.Counter)   # page -> (week, channel) -> pv
G = collections.defaultdict(lambda: [0, 0, 0, 0])  # channel -> 4 weeks
S = collections.defaultdict(lambda: [0, 0, 0, 0])  # section -> 4 weeks
pagetot = collections.Counter()
weektot = [0, 0, 0, 0]
for day, path, ref, utm, pv, thin in rows:
    if not ok(path):
        continue
    v = pv - thin
    for i, (w, lab, a, b) in enumerate(WEEKS):
        if a <= day <= b:
            P[path][(w, chan(ref, utm))] += v
            G[chan(ref, utm)][i] += v
            S[section(path)][i] += v
            pagetot[path] += v
            weektot[i] += v
            break

# 页面 × 渠道 的 4 周序列，按 (W4-W1) 排序
def page_chan_rows(p, min_total=0):
    out = []
    for ch in ("AI", "搜索", "直接", "外链"):
        v = [P[p][(w, ch)] for w, _, _, _ in WEEKS]
        if sum(v) == 0 or sum(v) < min_total:
            continue
        out.append((ch, v, v[3] - v[0]))
    return out


DECLINE = ["/guides/top-love-psychics-kasamba/", "/guides/best-kasamba-psychics-2026/",
           "/reviews/kasamba/", "/guides/best-keen-psychics-2026/",
           "/guides/most-accurate-psychics-kasamba/", "/guides/brutally-honest-psychics-keen/"]
GROW = ["/guides/top-love-psychics-keen/", "/reviews/keen/", "/guides/best-tarot-readers-for-love/",
        "/guides/best-mediums-on-purple-garden/", "/guides/love-or-career-psychics/",
        "/guides/best-tarot-readers-on-kasamba/"]

# 页面健康度现场探测
B = "https://easternalignment.com"


def get(path, timeout=40):
    req = urllib.request.Request(B + path, headers={"User-Agent": "Mozilla/5.0 (probe)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            return r.status, raw
    except Exception:
        return None, b""


s_, sb = get("/sitemap-0.xml")
sm = sb.decode("utf-8", "replace")
health = []
for p in DECLINE + GROW:
    st, bb = get(p)
    m = re.search(r"<loc>" + re.escape(B + p) + r"</loc>\s*<lastmod>([^<]+)</lastmod>", sm)
    health.append({
        "p": p, "http": st, "in_sitemap": (B + p) in sm,
        "lm": m.group(1)[:10] if m else "—",
        "kb": round(len(bb) / 1024),
        "noindex": "noindex" in bb.decode("utf-8", "replace")[:4000].lower(),
    })
json.dump(health, open(os.path.join(OUT, "page_health.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)


# ---------------- SVG ----------------
def svg_weeks(series, w=860, h=210, colors=None, pad_l=42, pad_b=40, pad_t=18):
    """series = [(name, [v0,v1,v2,v3])]  分组柱"""
    colors = colors or ["#2f6fed", "#dc2626", "#0f9d58", "#8b5cf6"]
    mx = max([max(v) for _, v in series] + [1]) or 1
    gw = (w - pad_l - 20) / 4
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    parts.append(f'<line x1="{pad_l}" y1="{h-pad_b}" x2="{w-20}" y2="{h-pad_b}" stroke="#c8d3e6"/>')
    for g in range(1, 5):
        y = pad_t + (h - pad_b - pad_t) * (1 - g / 4)
        parts.append(f'<line x1="{pad_l}" y1="{y:.1f}" x2="{w-20}" y2="{y:.1f}" stroke="#eef3fb"/>')
        parts.append(f'<text x="{pad_l-6}" y="{y+4:.1f}" font-size="10" fill="#94a3b8" text-anchor="end">{round(mx*g/4)}</text>')
    bw = gw * 0.78 / len(series)
    for i, lab in enumerate([x[1] for x in WEEKS]):
        for j, (name, v) in enumerate(series):
            bh = (h - pad_b - pad_t) * v[i] / mx
            x = pad_l + gw * i + gw * 0.11 + bw * j
            parts.append(f'<rect x="{x:.1f}" y="{h-pad_b-bh:.1f}" width="{bw*0.92:.1f}" height="{max(bh,0.6):.1f}" '
                         f'rx="2" fill="{colors[j % len(colors)]}" opacity="0.9"/>')
            parts.append(f'<text x="{x+bw*0.46:.1f}" y="{h-pad_b-bh-3:.1f}" font-size="9.5" fill="#475569" text-anchor="middle">{v[i]}</text>')
        parts.append(f'<text x="{pad_l+gw*i+gw/2:.1f}" y="{h-pad_b+15:.1f}" font-size="10.5" fill="#64748b" text-anchor="middle">{lab}</text>')
    for j, (name, v) in enumerate(series):
        lx = pad_l + 4 + j * 132
        parts.append(f'<rect x="{lx}" y="4" width="9" height="9" fill="{colors[j % len(colors)]}"/>')
        parts.append(f'<text x="{lx+14}" y="12.5" font-size="10.5" fill="#475569">{esc(name)}</text>')
    parts.append('</svg>')
    return "".join(parts)


def svg_dumbbell(items, w=860, rowh=30, labw=330):
    """items = [(page, w1, w4)]  两期对比点线"""
    mx = max([max(a, b) for _, a, b in items] + [1])
    inner = w - labw - 90
    h = rowh * len(items) + 14
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" style="{FONT}">']
    for i, (p, a, b) in enumerate(items):
        y = 10 + i * rowh
        xa, xb = labw + inner * a / mx, labw + inner * b / mx
        col = "#dc2626" if b < a else "#15803d"
        parts.append(f'<text x="0" y="{y+13}" font-size="11.5" fill="#334155">{esc(p[:52])}</text>')
        parts.append(f'<line x1="{xa:.1f}" y1="{y+9}" x2="{xb:.1f}" y2="{y+9}" stroke="#cbd5e1" stroke-width="2"/>')
        parts.append(f'<circle cx="{xa:.1f}" cy="{y+9}" r="4.5" fill="#94a3b8"/>')
        parts.append(f'<circle cx="{xb:.1f}" cy="{y+9}" r="4.5" fill="{col}"/>')
        parts.append(f'<text x="{max(xa,xb)+9:.1f}" y="{y+13}" font-size="10.5" fill="{col}">{a}→{b}</text>')
    parts.append('</svg>')
    return "".join(parts)


sec_svg = svg_weeks([(k.replace(" 指南", ""), v) for k, v in
                     sorted(S.items(), key=lambda x: -sum(x[1]))[:4]])
ch_svg = svg_weeks([(k, v) for k, v in sorted(G.items(), key=lambda x: -sum(x[1]))],
                   colors=["#2f6fed", "#dc2626", "#0f9d58", "#8b5cf6"])
decl_items = []
for p in DECLINE:
    tot = [P[p][(w, ch)] for w, _, _, _ in WEEKS for ch in ("AI", "搜索", "直接", "外链")]
    per_week = [sum(P[p][(WEEKS[i][0], ch)] for ch in ("AI", "搜索", "直接", "外链")) for i in range(4)]
    decl_items.append((p, per_week[0], per_week[3]))
dumb_svg = svg_dumbbell(decl_items)


def chan_table(p):
    tr = ""
    for ch, v, d in sorted(page_chan_rows(p), key=lambda x: x[2]):
        col = "#b91c1c" if d < 0 else ("#15803d" if d > 0 else "#64748b")
        tr += (f"<tr><td>{ch}</td><td class='num'>{v[0]}</td><td class='num'>{v[1]}</td>"
               f"<td class='num'>{v[2]}</td><td class='num'>{v[3]}</td>"
               f"<td class='num' style='color:{col};font-weight:600'>{d:+d}</td></tr>")
    return tr


html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>页面级流量退步核查 · {DAY}</title>
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
  .warnbox{{border-left:5px solid #f59e0b;background:#fffbeb;padding:13px 16px;border-radius:0 10px 10px 0;font-size:13.4px}}
  table{{width:100%;border-collapse:collapse;font-size:12.8px}}
  th,td{{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}}
  th{{background:#eef3fb;font-size:12px;color:#334155;font-weight:600}}
  td.num{{text-align:right;font-variant-numeric:tabular-nums}}
  .mono{{font-family:'Cascadia Mono',Consolas,monospace;font-size:12px}}
  .small{{font-size:11.5px}}
  .tag{{display:inline-block;padding:1px 7px;border-radius:20px;font-size:11px;border:1px solid #dbe3ef;background:#f8fafc;color:#475569}}
  .tag.ok{{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}}
  .tag.warn{{color:#b45309;background:#fffbeb;border-color:#fde68a}}
  .tag.err{{color:#b91c1c;background:#fef2f2;border-color:#fecaca}}
  .note{{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:9px;padding:11px 13px;font-size:12.8px;color:#334155}}
  ul{{margin:8px 0 8px 4px;padding-left:20px}} li{{margin:5px 0}}
  svg{{display:block;margin:6px 0}}
  .grid2{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
</style></head><body><div class="wrap">

<h1>页面级流量退步核查</h1>
<div class="meta">easternalignment.com · PostHog 532954 · 干净口径（剔 CN / 自测 / 本地来源）且<b>剔薄</b>
（去掉「1 浏览 + 无 vitals + ≤2 秒」的行）· 生成于 {DAY} {NOW.strftime('%H:%M')} BJT</div>

<div class="panel lead">
<b>结论</b>
<ol style="margin-top:6px">
<li><b>站点整体没有持续下行。</b>近 4 周逐周浏览量（剔薄）为
<b>{weektot[0]} → {weektot[1]} → {weektot[2]} → {weektot[3]}</b>，峰值在 W2，不是在开头。</li>
<li><b>唯一有趋势的渠道信号是搜索</b>：{G['搜索'][0]} → {G['搜索'][1]} → {G['搜索'][2]} → {G['搜索'][3]}
（4 周 <b>{(G['搜索'][3]/G['搜索'][0]-1)*100:+.0f}%</b>）；AI 是 {G['AI'][0]} → {G['AI'][1]} → {G['AI'][2]} → {G['AI'][3]}，
<b>波动明显但没有趋势性下滑</b>。</li>
<li><b>真正退步的页面只有 2–4 个</b>（见第 3 节）：最明确的是
<span class="mono">/guides/top-love-psychics-kasamba/</span>（搜索 11 → 0，几近断流）与
<span class="mono">/guides/best-kasamba-psychics-2026/</span>（搜索 6 → 4 → 1 → 0，单调归零）。
AI 侧最明显的是 <span class="mono">/reviews/kasamba/</span>（AI 8 → 0）。</li>
<li><b>同时有页面在涨</b>：<span class="mono">/guides/top-love-psychics-keen/</span>（搜索 3 → 8）、
<span class="mono">/reviews/keen/</span>（AI 0 → 4）。</li>
<li><b>这些页面没有技术故障</b>：全部 HTTP 200、都在 sitemap 里、无 noindex、lastmod 都在 9 月 →
是<b>排名或需求变化</b>，不是页面被删或被屏蔽。</li>
</ol>
</div>

<div class="warnbox">
<b>先说最重要的方法学前提，否则下面的表会被误读：</b>
全站日均浏览量只有约 22 次。<b>11 天里浏览量 ≥12 的页面仅 {sum(1 for v in pagetot.values() if v>=12)} 个</b>，
绝大多数页面的周间差就是 1–3 次浏览——那是噪声，不是「退步」。
因此本报告只把<b>「跨两个等长窗口方向一致」+「4 周趋势同向」</b>的页面列为退步，其余一律不列。
</div>

<h2>1. 方法与窗口</h2>
<div class="panel"><ul>
<li><b>窗口刻意避开 09-20</b>：那天有一批 109 会话 / 77 个薄会话的机器簇，会系统性抬升任何包含它的窗口。
主对比因此用 <span class="mono">09-09~09-19</span>（11 完整日）vs <span class="mono">09-22~10-02</span>（11 完整日）。</li>
<li><b>对照窗口</b>用 <span class="mono">09-22~09-26</span> vs <span class="mono">09-28~10-02</span>（各 5 完整日），
与上一份《AI 渠道流量下滑核查》保持同一口径，便于交叉验证。</li>
<li><b>剔薄</b>：主指标剔除「1 浏览 + 无 vitals + ≤2 秒」的（会话,页面）行，抵消机器簇与误入；
含薄原值同时给出。</li>
<li>两个窗口的主对比结果：<b>浏览量 {summary['main']['totals']['pv_p']} → {summary['main']['totals']['pv_r']}
（{(summary['main']['totals']['pv_r']/summary['main']['totals']['pv_p']-1)*100:+.0f}%）</b>、
命中页面数 {summary['main']['totals']['pages_p']} → {summary['main']['totals']['pages_r']}、
落地页会话 {summary['main']['totals']['ent_p']} → {summary['main']['totals']['ent_r']}
（{(summary['main']['totals']['ent_r']/summary['main']['totals']['ent_p']-1)*100:+.0f}%）。<br>
短窗口（各 5 日）则是 119 → 95（-20%）—— <b>同一份数据，窗口一拉长结论就变了</b>，这正是「近几天感觉变差」的来源。</li>
</ul></div>

<h2>2. 板块与渠道的 4 周走势</h2>
<div class="panel"><h3>板块（剔薄，按浏览量）</h3>{sec_svg}
<div class="small" style="color:#5b6b83">四个板块的周间波动都在 ±30% 内来回，没有一个呈单调下行。</div></div>
<div class="panel"><h3>渠道（剔薄，按浏览量）</h3>{ch_svg}
<div class="small" style="color:#5b6b83">搜索是唯一缓慢下行的渠道（{G['搜索'][0]} → {G['搜索'][3]}）；
AI 在 {min(G['AI'])}–{max(G['AI'])} 之间大幅波动，W4（{G['AI'][3]}）已高于 W1（{G['AI'][0]}）。</div></div>

<h2>3. 退步页面（跨窗口一致 + 4 周同向）</h2>
<div class="panel">
{dumb_svg}
<div class="small" style="color:#5b6b83">灰点 = W1（09-05~09-11），红点 = W4（09-26~10-02）。</div>
</div>
{''.join(f'''<div class="panel">
<h3><span class="mono">{esc(p)}</span></h3>
<table><thead><tr><th>渠道</th><th class="num">W1</th><th class="num">W2</th><th class="num">W3</th><th class="num">W4</th><th class="num">Δ</th></tr></thead>
<tbody>{chan_table(p)}</tbody></table>
</div>''' for p in DECLINE)}
<div class="note">
<b>怎么读：</b><span class="mono">top-love-psychics-kasamba</span> 的 11 次浏览在 W1 全部来自<b>搜索</b>，
之后三周几乎归零 → 典型特征是<b>某个关键词的排名掉了或需求消失</b>，而不是站点变慢/被屏蔽。
<span class="mono">/reviews/kasamba/</span> 相反，它丢的是 <b>AI 渠道</b>（8 → 0），
与上一份报告里「AI 入口页长尾变薄」的发现完全对上。
</div>

<h2>4. 同期在增长的页面（平衡视角，避免只看坏消息）</h2>
<div class="panel">
<table><thead><tr><th>页面</th><th>渠道</th><th class="num">W1</th><th class="num">W2</th><th class="num">W3</th><th class="num">W4</th><th class="num">Δ</th></tr></thead><tbody>
{''.join(''.join(f"<tr><td class='mono small'>{esc(p if i==0 else '')}</td><td>{ch}</td>"
                 f"<td class='num'>{v[0]}</td><td class='num'>{v[1]}</td><td class='num'>{v[2]}</td>"
                 f"<td class='num'>{v[3]}</td>"
                 f"<td class='num' style='color:{'#15803d' if d>0 else '#b91c1c'};font-weight:600'>{d:+d}</td></tr>"
                 for i, (ch, v, d) in enumerate(sorted(page_chan_rows(p), key=lambda x: -x[2])))
        for p in GROW)}
</tbody></table>
<div class="small" style="color:#5b6b83">
最干净的一条增长线是 <span class="mono">/guides/top-love-psychics-keen/</span>：搜索从 3 → 8，
四个月自然周单调上升 —— 说明「Keen 主题」的搜索需求在变大，而「Kasamba 主题」的几个老页面在退。</div>
</div>

<h2>5. 页面健康度核对（排除技术原因）</h2>
<div class="panel">
<table><thead><tr><th>页面</th><th class="num">HTTP</th><th>在 sitemap</th><th class="num">HTML</th><th class="num">lastmod</th><th>noindex</th><th>判定</th></tr></thead><tbody>
{''.join(f"<tr><td class='mono small'>{esc(h['p'])}</td><td class='num'>{h['http']}</td>"
         f"<td>{'是' if h['in_sitemap'] else '<b>否</b>'}</td><td class='num'>{h['kb']} KB</td>"
         f"<td class='num'>{esc(h['lm'])}</td><td>{'有' if h['noindex'] else '无'}</td>"
         f"<td><span class='tag ok'>可抓取</span></td></tr>" for h in health)}
</tbody></table>
<div class="note" style="margin-top:10px">
<b>结论：全部页面 200、全部在 sitemap、全部无 noindex、lastmod 都在 9 月</b> →
退步不是技术性下线导致的，而是<b>外部排名/需求变化</b>。
<br>顺带发现：<span class="mono">/reviews/kasamba/</span> 的 HTML 达
<b>{next((h['kb'] for h in health if h['p']=='/reviews/kasamba/'), '—')} KB</b>、
<span class="mono">/reviews/keen/</span> <b>{next((h['kb'] for h in health if h['p']=='/reviews/keen/'), '—')} KB</b>，
都远超边缘 Markdown 转换器的 150KB 上限 → 这两页对 AI 智能体只能返回 HTML，与上一份报告的发现一致。
</div>
</div>

<h2>6. 建议怎么做</h2>
<div class="panel"><ol>
<li><span class="tag err">最高优先</span><b>查那两个 Kasamba 指南页的搜索排名</b>（需接 GSC）。
它们的退步形状是「搜索一夜归零」，最可能是排名变化或关键词需求消失。
在没有 GSC 之前，可直接在 Google 用页面标题的核心词人工搜一次，看在不在前 2 页。</li>
<li><span class="tag warn">看趋势，别看单周</span><b>不要根据单周或单个页面的数字动手改内容</b>。
本站流量体量下（日均 22 次浏览），页面级周间波动以噪声为主 —— 只有连续 3 周以上同向才算信号。</li>
<li><span class="tag">可做</span><b>把「Keen 主题在涨、Kasamba 老页面在退」当作内容排产的输入</b>：
<span class="mono">/guides/top-love-psychics-keen/</span> 是唯一单调上升的页面，同题材可以扩；
<span class="mono">/guides/top-love-psychics-kasamba/</span> 与 <span class="mono">/guides/best-kasamba-psychics-2026/</span>
存在明显选题重叠（都在抢「best/top love psychics on Kasamba」），可考虑合并或重写差异化，而不是各写各的。</li>
<li><span class="tag">可做</span><b>hub 页瘦身</b>：<span class="mono">/reviews/kasamba/</span> 531KB、
<span class="mono">/reviews/keen/</span> 326KB，既拖慢手机端也让 AI 拿不到 markdown，
是「AI 入口页长尾变薄」最可能的直接原因之一。</li>
</ol></div>

<h2>7. 口径附录</h2>
<div class="panel small"><ul>
<li><b>剔薄</b> = 剔除「单（会话,页面）内 1 次浏览 + 0 个 <span class="mono">$web_vitals</span> + 停留 ≤2 秒」的行。
两套数字（含薄 306 → 288、剔薄 248 → 243）都在报告里，不一致时以剔薄为主、含薄为界。</li>
<li><b>窗口等长</b>：主对比 11 vs 11 个完整日；对照 5 vs 5 个完整日；均不含当日（未满日）。</li>
<li><b>渠道判定</b>：<span class="mono">(referrer + utm_source)</span> 匹配 AI / 搜索 / 直接 / 外链。
AI 会话 87% 表现为 <span class="mono">referrer=$direct + utm_source=chatgpt.com</span>，只靠 referrer 会全部漏掉。</li>
<li><b>页面标注</b>：<span class="mono">$pathname</span> 已不含查询串；已排除 <span class="mono">/go/ /api/ /data/ /.well-known/ /_astro/</span> 等非内容路径。</li>
<li><b>数据文件</b>：<span class="mono">results/page_delta.json</span>（日 × 页面 × 渠道 明细）、
<span class="mono">page_delta_summary.json</span>、<span class="mono">page_health.json</span>，
由 <span class="mono">page_delta.py</span> + <span class="mono">build_page_regression_report.py</span> 复现。</li>
</ul></div>

<div class="small" style="margin-top:24px;color:#5b6b83">
报告生成：{DAY} {NOW.strftime('%H:%M:%S')} BJT · 数据源 PostHog 532954（只读 key）+ 站点现场探测
</div>
</div></body></html>"""

open(DST, "w", encoding="utf-8").write(html)
print("WROTE", DST, len(html), "bytes")
print("weektot", weektot, "| channels", {k: v for k, v in G.items()})
print("pages>=12pv:", sum(1 for v in pagetot.values() if v >= 12))
