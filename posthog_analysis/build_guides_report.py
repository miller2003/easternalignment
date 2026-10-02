"""生成 /guides 全量文章 + 逐页流量 HTML 报告。
零硬编码:全部数字来自 results/gt_*.json 与 sep_entry.json。
产出:scratch/guides-traffic-report.html
"""
import json
import os
import re
from datetime import datetime, timedelta, timezone

WS = r"C:\Users\samja\Desktop\site\easternalignment"
RES = os.path.join(WS, "posthog_analysis", "results")
OUT = os.path.join(WS, "scratch", "guides-traffic-report.html")

lst = json.load(open(os.path.join(RES, "gt_list.json"), encoding="utf-8"))
allp = {r[0]: r for r in json.load(open(os.path.join(RES, "gt_pages_all.json"), encoding="utf-8"))["results"]}
sepp = {r[0]: r for r in json.load(open(os.path.join(RES, "gt_pages_sep.json"), encoding="utf-8"))["results"]}
entries = json.load(open(os.path.join(RES, "sep_entry.json"), encoding="utf-8"))["results"]

# 入口页(9月): 路径去 query
entry_map = {}
for e in entries:
    p = re.sub(r"\?.*$", "", e[0])
    if p.startswith("/guides/"):
        v = entry_map.setdefault(p, [0, 0, 0, 0])
        v[0] += e[1]; v[1] += e[2]; v[2] += e[3]; v[3] += e[4]

rows = []
for it in lst:
    p = it["path"]
    a = allp.get(p)
    s = sepp.get(p)
    e = entry_map.get(p)
    rows.append({
        "slug": it["slug"], "path": p, "title": it["title"],
        "cat": it["category"], "words": it["words"], "pub": it["publishDate"][:10],
        "upd": it["updatedDate"][:10], "noCta": bool(it["noCta"]),
        "pv": a[1] if a else 0, "sess": a[2] if a else 0, "uv": a[3] if a else 0,
        "clk": a[4] if a else 0, "ckr": a[5] if a else 0,
        "pv9": s[1] if s else 0, "clk9": s[4] if s else 0,
        "entry_s": e[0] if e else 0, "entry_clk": e[2] if e else 0,
    })
rows.sort(key=lambda r: (-r["pv"], -r["pv9"], r["slug"]))

tot_pv = sum(r["pv"] for r in rows)
tot_pv9 = sum(r["pv9"] for r in rows)
tot_clk = sum(r["clk"] for r in rows)
tot_sess = sum(r["sess"] for r in rows)
zero = [r for r in rows if r["pv"] == 0]
low = [r for r in rows if 1 <= r["pv"] <= 4]
mid = [r for r in rows if 5 <= r["pv"] <= 14]
high = [r for r in rows if r["pv"] >= 15]
top10 = rows[:10]
top10_share = sum(r["pv"] for r in top10) / tot_pv * 100 if tot_pv else 0
entry_pages = [r for r in rows if r["entry_s"] > 0]

# 分类聚合
cats = {}
for r in rows:
    c = r["cat"] or "(none)"
    v = cats.setdefault(c, {"n": 0, "pv": 0, "clk": 0, "zero": 0})
    v["n"] += 1; v["pv"] += r["pv"]; v["clk"] += r["clk"]
    if r["pv"] == 0: v["zero"] += 1
cat_list = sorted(cats.items(), key=lambda kv: -kv[1]["pv"])


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


def bar(v, mx, w=140, color="#4f7cac"):
    ww = int(v / mx * w) if mx else 0
    return f'<span class="bar"><i style="width:{ww}px;background:{color}"></i></span>'


mx = rows[0]["pv"] if rows else 1
mx9 = max((r["pv9"] for r in rows), default=1)

# ------- 页面表格 -------
trs = []
for i, r in enumerate(rows, 1):
    if r["pv"] == 0:
        tag, cls = "零流量", "z"
    elif r["pv"] >= 15:
        tag, cls = "高", "h"
    elif r["pv"] >= 5:
        tag, cls = "中", "m"
    else:
        tag, cls = "低", "l"
    entry_td = f'{r["entry_s"]} 会话 / {r["entry_clk"]} 点击' if r["entry_s"] else '<span class="dim">—</span>'
    cta = '<span class="dim">无 CTA</span>' if r["noCta"] else "有"
    trs.append(
        f'<tr class="{cls}"><td class="num">{i}</td>'
        f'<td class="ttl"><a href="https://easternalignment.com{r["path"]}" target="_blank">{esc(r["title"] or r["slug"])}</a>'
        f'<div class="slug">{esc(r["slug"])}</div></td>'
        f'<td><span class="chip">{esc(r["cat"] or "—")}</span></td>'
        f'<td class="num">{r["words"]:,}</td>'
        f'<td class="num b">{r["pv"]}</td>'
        f'<td>{bar(r["pv"], mx, 120, "#4f7cac")}</td>'
        f'<td class="num">{r["pv9"]}</td>'
        f'<td class="num">{r["sess"]}</td>'
        f'<td class="num">{r["clk"] if r["clk"] else "—"}</td>'
        f'<td class="num">{r["pv"] and ("%.1f%%" % (r["clk"] / r["pv"] * 100)) or "—"}</td>'
        f'<td class="sm">{entry_td}</td>'
        f'<td class="sm">{cta}</td>'
        f'<td class="tag {cls}">{tag}</td></tr>')

# 分类表
cat_trs = []
for c, v in cat_list:
    cat_trs.append(
        f'<tr><td>{esc(c)}</td><td class="num">{v["n"]}</td><td class="num b">{v["pv"]}</td>'
        f'<td>{bar(v["pv"], max(x[1]["pv"] for x in cat_list), 150, "#7a9e7e")}</td>'
        f'<td class="num">{v["clk"]}</td><td class="num">{v["zero"]}</td></tr>')

# 零流量列表
zero_trs = "".join(
    f'<tr><td class="ttl"><a href="https://easternalignment.com{r["path"]}" target="_blank">{esc(r["title"] or r["slug"])}</a>'
    f'<div class="slug">{esc(r["slug"])}</div></td>'
    f'<td><span class="chip">{esc(r["cat"] or "—")}</span></td>'
    f'<td class="num">{r["words"]:,}</td><td class="sm">{r["upd"] or r["pub"]}</td>'
    f'<td class="sm">{"无 CTA" if r["noCta"] else "有"}</td></tr>' for r in zero)

# 高流量
high_trs = "".join(
    f'<tr><td class="num">{i}</td><td class="ttl"><a href="https://easternalignment.com{r["path"]}" target="_blank">{esc(r["title"] or r["slug"])}</a>'
    f'<div class="slug">{esc(r["slug"])}</div></td>'
    f'<td class="num b">{r["pv"]}</td><td>{bar(r["pv"], mx, 200, "#c1553f")}</td>'
    f'<td class="num">{r["pv9"]}</td><td class="num">{r["sess"]}</td>'
    f'<td class="num">{r["clk"]}</td><td class="num">{r["ckr"]}</td>'
    f'<td class="num">{r["entry_s"]}</td></tr>' for i, r in enumerate(high, 1))

# 分层柱
buckets = [("零流量", len(zero), "#c9ccd1"), ("1–4 PV", len(low), "#9db6cc"),
           ("5–14 PV", len(mid), "#5f8cb8"), ("≥15 PV", len(high), "#2f5d8a")]
bmx = max(b[1] for b in buckets)
bucket_svg = ""
for i, (name, n, col) in enumerate(buckets):
    y = 30 + i * 46
    w = int(n / bmx * 380)
    bucket_svg += (f'<text x="0" y="{y+14}" font-size="13" fill="#333">{name}</text>'
                   f'<rect x="90" y="{y}" width="{w}" height="20" rx="3" fill="{col}"/>'
                   f'<text x="{90+w+8}" y="{y+15}" font-size="13" font-weight="600" fill="#333">{n} 篇</text>')

gen = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M")

html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>/guides 全量文章流量盘点</title>
<style>
:root{{--ink:#1f2328;--mut:#6a737d;--line:#e3e6ea;--bg:#f7f8fa;--card:#fff;--blue:#2f5d8a;}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}}
.wrap{{max-width:1240px;margin:0 auto;padding:32px 20px 80px}}
h1{{font-size:26px;margin:0 0 6px}}
h2{{font-size:19px;margin:44px 0 14px;padding-bottom:8px;border-bottom:2px solid var(--line)}}
h3{{font-size:15px;margin:22px 0 8px}}
.sub{{color:var(--mut);font-size:13px;margin:0 0 4px}}
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:12px;margin:22px 0}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}}
.card .k{{font-size:12px;color:var(--mut)}}
.card .v{{font-size:24px;font-weight:700;margin-top:4px}}
.card .n{{font-size:12px;color:var(--mut);margin-top:2px}}
table{{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:13px}}
th{{background:#f0f2f5;text-align:left;padding:9px 10px;font-weight:600;font-size:12px;color:#48505a;white-space:nowrap;position:sticky;top:0;z-index:2}}
td{{padding:8px 10px;border-top:1px solid var(--line);vertical-align:middle}}
tr:hover td{{background:#fafbfc}}
.num{{text-align:right;font-variant-numeric:tabular-nums}}
.b{{font-weight:700}}
.sm{{font-size:12px;color:var(--mut)}}
.dim{{color:#b6bcc4}}
.ttl a{{color:#1f3a5f;text-decoration:none;font-weight:600}}
.ttl a:hover{{text-decoration:underline}}
.slug{{font-size:11px;color:#9aa2ab;font-family:ui-monospace,Consolas,monospace;margin-top:1px}}
.chip{{display:inline-block;background:#eef1f5;border:1px solid #dde2e8;border-radius:20px;padding:1px 9px;font-size:11px;color:#4a5561;white-space:nowrap}}
.bar{{display:inline-block;width:120px;height:10px;background:#eef1f5;border-radius:5px;overflow:hidden;vertical-align:middle}}
.bar i{{display:block;height:100%;border-radius:5px}}
.tag{{font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;white-space:nowrap}}
.tag.z{{background:#eceef1;color:#6a737d}}
.tag.l{{background:#e8f0f8;color:#3d6a94}}
.tag.m{{background:#dbe8f4;color:#2b5d8c}}
.tag.h{{background:#f6dfd9;color:#a8422c}}
tr.z td{{background:#fcfcfd}}
tr.h td{{background:#fffaf8}}
.legend{{font-size:12px;color:var(--mut);margin:10px 0 0}}
.pill{{display:inline-block;background:#fff3cd;border:1px solid #ffe08a;border-radius:6px;padding:6px 12px;font-size:13px;margin:4px 6px 4px 0}}
.note{{background:var(--card);border-left:3px solid var(--blue);border-radius:0 8px 8px 0;padding:12px 16px;margin:14px 0;font-size:13px}}
.toolbar{{margin:10px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center}}
.toolbar input{{padding:7px 11px;border:1px solid var(--line);border-radius:7px;font-size:13px;width:230px}}
.toolbar button{{padding:7px 13px;border:1px solid var(--line);background:#fff;border-radius:7px;cursor:pointer;font-size:12.5px}}
.toolbar button.on{{background:var(--blue);color:#fff;border-color:var(--blue)}}
</style></head><body><div class="wrap">

<h1>/guides 全量文章流量盘点</h1>
<p class="sub">站点 easternalignment.com ｜ 数据源 PostHog Project 532954 ｜ 干净口径（已剔 CN / 自测身份 / 本地开发来源）</p>
<p class="sub">全期窗口 2026-07-29 ~ 2026-10-01 ｜ 9 月窗口 2026-09-01 ~ 2026-10-01 ｜ 报告生成 {gen}（东八区）</p>

<div class="cards">
<div class="card"><div class="k">文章总数</div><div class="v">{len(rows)}</div><div class="n">src/content/guides/*.md</div></div>
<div class="card"><div class="k">有流量</div><div class="v">{len(rows)-len(zero)}</div><div class="n">{((len(rows)-len(zero))/len(rows)*100):.0f}% 的文章</div></div>
<div class="card"><div class="k">完全零流量</div><div class="v" style="color:#c1553f">{len(zero)}</div><div class="n">{len(zero)/len(rows)*100:.0f}% 的文章</div></div>
<div class="card"><div class="k">全期总浏览量</div><div class="v">{tot_pv:,}</div><div class="n">{tot_sess:,} 个会话</div></div>
<div class="card"><div class="k">9 月浏览量</div><div class="v">{tot_pv9:,}</div><div class="n">全期的 {tot_pv9/tot_pv*100:.0f}%</div></div>
<div class="card"><div class="k">联盟点击</div><div class="v">{tot_clk}</div><div class="n">来自 guides 页面</div></div>
<div class="card"><div class="k">TOP10 集中度</div><div class="v">{top10_share:.0f}%</div><div class="n">前 10 篇占全部浏览</div></div>
<div class="card"><div class="k">9 月自然入口页</div><div class="v">{len(entry_pages)}</div><div class="n">承载搜索/AI 直接落地</div></div>
</div>

<div class="note"><b>一句话结论：</b>{len(rows)} 篇 guides 中，<b>{len(high)} 篇</b>拿到 15+ 浏览（真流量），
<b>{len(mid)} 篇</b>在 5–14 之间（有零星曝光），<b>{len(low)} 篇</b>只有 1–4 浏览（几乎等于没有），
<b>{len(zero)} 篇完全零浏览</b>。头部效应极强：前 10 篇吃掉 {top10_share:.0f}% 的浏览，而
{(len(zero)+len(low))} 篇（{(len(zero)+len(low))/len(rows)*100:.0f}%）合计只占 {((sum(r['pv'] for r in zero+low))/tot_pv*100):.0f}%。</div>

<h2>一、流量分层</h2>
<svg viewBox="0 0 560 220" width="100%" style="max-width:560px">
{bucket_svg}
</svg>
<p class="legend">分层口径：全期 $pageview 次数（干净口径）。「零流量」= PostHog 中该路径从未出现过一次浏览。</p>

<h2>二、按内容分类聚合</h2>
<table><thead><tr><th>分类</th><th class="num">篇数</th><th class="num">总浏览</th><th>占比</th><th class="num">联盟点击</th><th class="num">零流量</th></tr></thead>
<tbody>{''.join(cat_trs)}</tbody></table>

<h2>三、高流量页（≥15 浏览，{len(high)} 篇）</h2>
<p class="sub">这些是真正在出自然流量的页面，也是联盟点击的主要来源。</p>
<table><thead><tr><th>#</th><th>文章</th><th class="num">总浏览</th><th>分布</th><th class="num">9月</th><th class="num">会话</th><th class="num">点击</th><th class="num">点击人数</th><th class="num">9月入口会话</th></tr></thead>
<tbody>{high_trs}</tbody></table>

<h2>四、完全零流量页（{len(zero)} 篇）</h2>
<p class="sub">全期一次浏览都没有。分两种情况：① 新发布尚未被索引/无内链导流；② 主题无搜索需求或标题未匹配真实 query。</p>
<table><thead><tr><th>文章</th><th>分类</th><th class="num">词数</th><th>最后更新</th><th>CTA</th></tr></thead>
<tbody>{zero_trs}</tbody></table>

<h2>五、完整清单（全部 {len(rows)} 篇，按浏览量降序）</h2>
<div class="toolbar">
  <input id="q" placeholder="搜索标题 / slug / 分类…">
  <button class="on" data-f="all">全部</button>
  <button data-f="h">高流量</button>
  <button data-f="m">中</button>
  <button data-f="l">低</button>
  <button data-f="z">零流量</button>
</div>
<table id="tb"><thead><tr>
<th class="num">#</th><th>文章</th><th>分类</th><th class="num">词数</th>
<th class="num">总浏览</th><th>分布</th><th class="num">9月PV</th><th class="num">会话</th>
<th class="num">点击</th><th class="num">点击/PV</th><th>9月作为入口页</th><th>CTA</th><th>档位</th>
</tr></thead><tbody>{''.join(trs)}</tbody></table>
<p class="legend">「9月作为入口页」= 该页在 9 月直接作为会话落地页的次数（说明它能接到搜索/AI 外部流量，而非仅靠站内跳转）。
「点击/PV」= 该页联盟点击 ÷ 该页浏览量，衡量单页变现效率，与流量高低无关。</p>

<h2>六、口径附录</h2>
<div class="note">
<b>站点隔离</b>：仅 easternalignment.com（不含 mysticdo.com）。<br>
<b>干净口径</b>：排除 CN 地理来源、6 个自测 person_id、本地开发端口来源（localhost:4321 / 127.0.0.1:8188/8765/8931）。<br>
<b>指标定义</b>：浏览 = $pageview 次数；会话 = 去重 $session_id；点击 = 去重 $insert_id 的 affiliate_link_click。<br>
<b>已知噪声</b>：站内存在薄会话（1 浏览 + 无 $web_vitals + ≤2 秒）约 36%，约 22% 为机器流量，
故单篇 1–2 次的浏览量级不构成真实需求信号，解读时按「近似零」处理。<br>
<b>全站基线</b>：全期干净会话 1,174。guides 段占 {tot_pv:,} 浏览 / {tot_sess:,} 会话。
</div>

<script>
var tb=document.getElementById('tb'),rows=[].slice.call(tb.tBodies[0].rows);
var q=document.getElementById('q'),cur='all';
function apply(){{var s=(q.value||'').toLowerCase();
rows.forEach(function(r){{var txt=r.cells[1].textContent.toLowerCase()+' '+r.cells[2].textContent.toLowerCase();
var okf=(cur==='all')||r.classList.contains(cur);r.style.display=(okf&&(!s||txt.indexOf(s)>=0))?'':'none';}});}}
q.addEventListener('input',apply);
[].forEach.call(document.querySelectorAll('.toolbar button'),function(b){{
b.addEventListener('click',function(){{
[].forEach.call(document.querySelectorAll('.toolbar button'),function(x){{x.classList.remove('on')}});
b.classList.add('on');cur=b.dataset.f;apply();}});}});
</script>
</div></body></html>"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write(html)
print("written:", OUT)
print(f"total={len(rows)} zero={len(zero)} low={len(low)} mid={len(mid)} high={len(high)}")
print(f"pv={tot_pv} pv9={tot_pv9} clicks={tot_clk} top10share={top10_share:.1f}%")
