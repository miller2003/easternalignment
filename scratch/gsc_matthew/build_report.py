# -*- coding: utf-8 -*-
"""Build the self-contained SEO review pack HTML for Matthew Tenney."""
import json
import os

OUT = r"C:\Users\samja\Desktop\site\easternalignment\scratch\gsc_matthew"
with open(os.path.join(OUT, "summary.json"), encoding="utf-8") as f:
    S = json.load(f)
with open(os.path.join(OUT, "charts.json"), encoding="utf-8") as f:
    C = json.load(f)


def img(key, alt):
    return f'<figure><img src="data:image/png;base64,{C[key]}" alt="{alt}"/></figure>'


def rows(records, cols, fmts):
    out = []
    for r in records:
        tds = []
        for c, f in zip(cols, fmts):
            v = r.get(c, "")
            tds.append(f"<td>{f(v, r) if callable(f) else v}</td>")
        out.append("<tr>" + "".join(tds) + "</tr>")
    return "\n".join(out)


f_int = lambda v, r=None: f"{int(v):,}"
f_pos = lambda v, r=None: f"{float(v):.1f}"
f_ctr = lambda v, r=None: f"{float(v):.2f}%"


def short_url(v, r=None):
    p = v.replace("https://easternalignment.com", "").replace("https://www.easternalignment.com", "www.")
    return f'<span class="u">{p}</span>'


monthly_rows = rows(
    S["monthly"],
    ["month", "clicks", "impressions", "ctr"],
    [lambda v, r: {"2026-04": "Apr (from 15th)", "2026-08": "Aug (through 22nd)"}.get(v, v), f_int, f_int, f_ctr],
)
intent_rows = rows(
    S["intent"],
    ["intent", "n", "clicks", "impressions", "ctr", "wpos"],
    [lambda v, r: v, f_int, f_int, f_int, f_ctr, f_pos],
)
cluster_rows = rows(
    S["page_groups"],
    ["group", "urls", "clicks", "impressions", "ctr"],
    [lambda v, r: v, f_int, f_int, f_int, f_ctr],
)
topq_rows = rows(
    S["top_q_clicks"],
    ["query", "clicks", "impressions", "ctr", "position"],
    [lambda v, r: v, f_int, f_int, f_ctr, f_pos],
)
topp_rows = rows(
    S["top_pages"],
    ["page", "clicks", "impressions", "ctr", "position"],
    [short_url, f_int, f_int, f_ctr, f_pos],
)
striking_rows = rows(
    S["striking"],
    ["query", "clicks", "impressions", "ctr", "position"],
    [lambda v, r: v, f_int, f_int, f_ctr, f_pos],
)
lowctr_rows = rows(
    S["low_ctr_pages"],
    ["page", "clicks", "impressions", "ctr", "position"],
    [short_url, f_int, f_int, f_ctr, f_pos],
)
zero_rows = rows(
    S["zero_click_pages"],
    ["page", "clicks", "impressions", "ctr", "position"],
    [short_url, f_int, f_int, f_ctr, f_pos],
)
country_rows = rows(
    S["countries"],
    ["country", "clicks", "impressions", "ctr", "position"],
    [{"美国": "United States", "英国": "United Kingdom", "加拿大": "Canada", "澳大利亚": "Australia", "印度": "India", "巴基斯坦": "Pakistan", "新加坡": "Singapore", "芬兰": "Finland", "德国": "Germany", "新西兰": "New Zealand"}.get, f_int, f_int, f_ctr, f_pos],
)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Eastern Alignment - SEO Review Pack (for Matthew Tenney)</title>
<style>
:root {{ --ink:#101828; --body:#344054; --muted:#667085; --line:#eaecf0; --card:#f9fafb; --brand:#4a3aff; --amber:#b54708; --amberbg:#fffaeb; --green:#067647; --greenbg:#ecfdf3; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; color:var(--body); background:#fff; line-height:1.62; font-size:15px; }}
.wrap {{ max-width:900px; margin:0 auto; padding:40px 28px 80px; }}
h1 {{ color:var(--ink); font-size:30px; line-height:1.25; margin:0 0 6px; letter-spacing:-0.02em; }}
h2 {{ color:var(--ink); font-size:21px; margin:44px 0 4px; padding-top:18px; border-top:3px solid var(--ink); letter-spacing:-0.01em; }}
h2 .no {{ color:var(--brand); margin-right:8px; }}
h3 {{ color:var(--ink); font-size:16px; margin:26px 0 6px; }}
p {{ margin:8px 0; }}
.sub {{ color:var(--muted); font-size:14px; }}
.lede {{ font-size:16px; }}
.kpis {{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:22px 0 6px; }}
.kpi {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 14px 12px; }}
.kpi .v {{ font-size:24px; font-weight:700; color:var(--ink); letter-spacing:-0.02em; }}
.kpi .l {{ font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-top:2px; }}
.kpi .d {{ font-size:12.5px; margin-top:4px; font-weight:600; }}
.up {{ color:var(--green); }}
.note {{ background:var(--greenbg); border:1px solid #a6f4c5; border-radius:10px; padding:12px 16px; margin:16px 0; }}
.warn {{ background:var(--amberbg); border:1px solid #fedf89; border-radius:10px; padding:12px 16px; margin:16px 0; }}
table {{ width:100%; border-collapse:collapse; margin:14px 0 6px; font-size:13.5px; }}
th {{ text-align:left; color:var(--muted); font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; padding:7px 8px; border-bottom:2px solid var(--line); }}
td {{ padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }}
tr:nth-child(even) td {{ background:#fcfcfd; }}
td .u {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; color:#175cd3; word-break:break-all; }}
figure {{ margin:18px 0 6px; }}
figure img {{ width:100%; border:1px solid var(--line); border-radius:10px; }}
.grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 18px; margin:12px 0; }}
ol.q {{ counter-reset:q; padding-left:0; margin:12px 0; }}
ol.q li {{ list-style:none; counter-increment:q; margin:0 0 14px; padding:12px 16px 12px 52px; position:relative; background:var(--card); border:1px solid var(--line); border-radius:10px; }}
ol.q li::before {{ content:counter(q); position:absolute; left:14px; top:12px; width:26px; height:26px; border-radius:50%; background:var(--brand); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:13px; }}
b.k {{ color:var(--ink); }}
.hdr {{ display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap; }}
.hdr .meta {{ font-size:13px; color:var(--muted); text-align:right; line-height:1.5; }}
.pill {{ display:inline-block; background:#eef0ff; color:var(--brand); font-weight:600; font-size:12px; border-radius:999px; padding:2px 10px; margin-right:6px; }}
.footer {{ margin-top:60px; padding-top:16px; border-top:1px solid var(--line); font-size:12.5px; color:var(--muted); }}
@media print {{ .wrap {{ padding:0; }} h2 {{ page-break-after:avoid; }} figure, table {{ page-break-inside:avoid; }} }}
</style>
</head>
<body>
<div class="wrap">

<div class="hdr">
  <div>
    <h1>Eastern Alignment — SEO Review Pack</h1>
    <div class="sub">Site overview + 6-month Google Search Console analysis, prepared for <b class="k">Matthew Tenney</b> (Organic Growth Manager, Ingenio)</div>
  </div>
  <div class="meta">
    Prepared by Huanchao Wang<br/>
    easternalignment.com · Affiliate ID 2326 (TUNE)<br/>
    Data: Google Search Console, {S['total']['range']}<br/>
    August 25, 2026
  </div>
</div>

<h2><span class="no">1</span>Executive summary</h2>
<p class="lede">Eastern Alignment is an independent, reader-supported review and education site for online psychic services (Keen, Kasamba, Purple Garden), monetized through CPA affiliate partnerships on the TUNE network. The site is ~8 months old, exited the Google sandbox in mid-April 2026, and has grown impressions roughly <b class="k">12x since April</b> while maintaining a clean, conversion-focused architecture. Three paid conversions cleared in the week of Aug 18-22, and Maayan Bronstein raised the Kasamba CPA to $125 retroactively (Aug 23), with a Purple Garden increase following.</p>

<div class="kpis">
  <div class="kpi"><div class="v">{S['total']['impressions']:,}</div><div class="l">Impressions (6 mo)</div><div class="d up">+{S['wow']['impr_growth']}% last 28d vs prior 28d</div></div>
  <div class="kpi"><div class="v">{S['total']['clicks']:,}</div><div class="l">Clicks (6 mo)</div><div class="d up">+{S['wow']['clicks_growth']}% last 28d vs prior 28d</div></div>
  <div class="kpi"><div class="v">{S['total']['ctr']}%</div><div class="l">Avg CTR (6 mo)</div><div class="d">{S['last28']['ctr']}% last 28d</div></div>
  <div class="kpi"><div class="v">{S['last28']['wpos']}</div><div class="l">Weighted avg position, 28d</div><div class="d">was {S['prev28']['wpos']} prior 28d</div></div>
</div>

<div class="note"><b class="k">Trust signal worth your attention:</b> this site's guide <i>How to Spot a Fake Psychic</i> is currently cited by Claude as an authoritative source — which is how you found us. Separately, GSC shows a growing tail of long, conversational, LLM-agent-style queries ({S['llm_queries']['count']} queries &gt;90 chars, e.g. <i>"{S['llm_queries']['examples'][0][:110]}..."</i>) where the site already surfaces at positions 6-12. The content strategy is working in both classic and AI-mediated search.</div>

<p><b class="k">The three biggest opportunities in the data (details in §3):</b></p>
<div class="card">① <b class="k">Brand-term CTR, especially Keen.</b> Keen-brand queries drove <b class="k">4,630 impressions but only 16 clicks (0.35% CTR)</b>. The single largest: <i>keen psychic love &amp; relationships</i> — 1,535 impressions at position 9.6 with 0.2% CTR. First-page rankings are being under-monetized by snippet copy, not by rankings.</div>
<div class="card">② <b class="k">Kasamba &amp; Purple Garden platform pages trail Keen structurally.</b> Keen platform page: 4,116 imp, pos 19.4. Kasamba: 1,659 imp, pos 36.6. Purple Garden: 259 imp, pos 34.3 (cluster launched weeks ago). Kasamba-brand queries: 1,366 imp at pos 42. Closing this gap is the highest-leverage content/authority play, and it aligns with the new $125 CPA.</div>
<div class="card">③ <b class="k">Desktop underperforms mobile by 2x in average position</b> (31.1 vs 15.9) while carrying 57% of impressions. Something — SERP competition mix, snippet rendering, or page experience — is suppressing desktop visibility.</div>

<h2><span class="no">2</span>The site at a glance (no clicking required)</h2>

<h3>2.1 Positioning &amp; business model</h3>
<table>
<tr><th style="width:170px">Dimension</th><th>Detail</th></tr>
<tr><td><b class="k">Niche</b></td><td>Online psychic reading services — reviews, comparisons, and buying-intent education. English-language, Tier-1 markets (US 72% of impressions, then UK, CA, AU).</td></tr>
<tr><td><b class="k">Differentiation</b></td><td><b class="k">Individual-reader-level reviews</b> — 114 reviewed readers across three platforms — instead of the platform-level listicles that dominate the SERP. Each review is built from the reader's actual profile data: session counts, rating distributions, review-language analysis, per-minute pricing math, and a "who this reader is (not) for" verdict. Editorial voice is deliberately "brutally honest friend": minor, manageable criticisms are surfaced to build trust, while the net read stays conversion-positive.</td></tr>
<tr><td><b class="k">Monetization</b></td><td>CPA affiliate via TUNE (Barges): Keen, Kasamba ($125/new client as of Aug 23, applied retroactively), Purple Garden (increase in progress). 9 conversions to date, 3 qualified first-time paid clients, first payouts cleared week of Aug 18.</td></tr>
<tr><td><b class="k">Stack</b></td><td>Astro (SSG) → static HTML on Cloudflare Pages. PostHog for product analytics; TUNE S2S postbacks hit a Cloudflare edge function that forwards <code>Order_Converted</code> to PostHog, giving end-to-end query → page → click → conversion visibility.</td></tr>
<tr><td><b class="k">Affiliate click integrity</b></td><td>All outbound clicks route through a gated <code>/go/</code> layer that only forwards human, on-site-initiated clicks (trusted-event + same-origin/session checks) — bot hits on affiliate URLs are not counted, keeping network reporting clean.</td></tr>
<tr><td><b class="k">Disclosure</b></td><td>Reader-supported disclosure site-wide; no fabricated quotes or prices (hard editorial rule).</td></tr>
</table>

<h3>2.2 Content architecture</h3>
<table>
<tr><th>Cluster</th><th style="width:70px">Pages</th><th>Role in the funnel</th></tr>
<tr><td><span class="u">/reviews/keen/</span></td><td>50</td><td>Money pages. Platform deep-dive + 49 individual reader reviews. Strongest CTR of any cluster (2.1%).</td></tr>
<tr><td><span class="u">/reviews/kasamba/</span></td><td>36</td><td>Money pages. Platform review + 35 reader reviews. Expanded mid-August.</td></tr>
<tr><td><span class="u">/reviews/purple-garden/</span></td><td>31</td><td>Money pages. Platform review + 30 reader reviews. <b class="k">Newest cluster (August)</b> — impressions building, clicks not yet.</td></tr>
<tr><td><span class="u">/guides/</span></td><td>78</td><td>Buying-intent &amp; situational entry points (breakups, ex recovery, marriage timing, twin flames, pricing, "is X legit") + trust/education pieces (fake-psychic detection, cold reading). Largest impression share (54%).</td></tr>
<tr><td><span class="u">/comparisons/</span></td><td>6</td><td>High-intent "vs" pages (Kasamba vs Keen, 3-way, accuracy-focused).</td></tr>
<tr><td><span class="u">/tools/</span></td><td>7</td><td>Interactive free tools (one-card tarot, yes/no tarot, moon phase, zodiac compatibility, angel number, dream dictionary, life path) — engagement/link acquisition layer.</td></tr>
<tr><td><span class="u">/astrology/</span></td><td>26+</td><td>Zodiac sign &amp; pair compatibility pages — programmatic-style long tail, still low position.</td></tr>
<tr><td><span class="u">/es/</span></td><td>~14</td><td>Spanish-language section (pilot): platform + reader reviews. 7.4% CTR on tiny volume.</td></tr>
</table>

<h3>2.3 Conversion engineering (what sits on every money page)</h3>
<p>Every reader review follows a measured funnel: article → pros/cons card → <b class="k">platform-matched nudge paragraph</b> (18 copy variants bucketed by each platform's actual offer economics — Keen's $1/5-min "price of a coffee" anchor, Kasamba's 3-free-minutes zero-risk framing, Purple Garden's $30 free credit) → high-contrast CTA card. Every affiliate click fires a PostHog event with slug, source page, and user ID, and CTA copy variant is stamped as a data attribute so I can compare first-purchase rate by (platform, copy) pair. A sitewide CTA overhaul + the Kasamba/PG cluster expansion shipped the week of Aug 18-22.</p>

<h3>2.4 Timeline</h3>
<table>
<tr><th style="width:150px">Period</th><th>Milestone</th></tr>
<tr><td>Dec 2025</td><td>Site launch (Astro, Cloudflare Pages).</td></tr>
<tr><td>Apr 2026</td><td>Exits Google sandbox (~Apr 16); impressions begin compounding.</td></tr>
<tr><td>Jun-Jul 2026</td><td>Guides cluster expands; impressions break 150-250/day; first conversions register.</td></tr>
<tr><td>Aug 18-22, 2026</td><td>Deep CTA overhaul (18 platform-bucketed variants), affiliate-link bot gating, Kasamba + Purple Garden cluster build-out. 2 paid conversions clear. Claude citation discovered.</td></tr>
<tr><td>Aug 23-24, 2026</td><td>Kasamba CPA raised to $125 retroactively; Purple Garden increase underway; AM guidance: lead with Top Psychics / Love / Mediumship landing intents for PG, defer broad Tarot.</td></tr>
</table>

<h2><span class="no">3</span>Search performance deep-dive (GSC, 6 months)</h2>

<h3>3.1 Growth trajectory</h3>
{img('trend', 'Daily clicks and impressions, 6 months')}
{img('monthly', 'Monthly totals')}
<table>
<tr><th>Month</th><th>Clicks</th><th>Impressions</th><th>CTR</th></tr>
{monthly_rows}
</table>
<p class="sub">August is pacing ~284 impressions/day vs July's ~191 (+48%), with the all-time high (414) set on Aug 22 — after the CTA/cluster work shipped.</p>

<h3>3.2 Where the demand is: query intent mix</h3>
{img('intent', 'Query intent mix')}
<table>
<tr><th>Intent bucket</th><th>Queries</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Wtd pos</th></tr>
{intent_rows}
</table>
<p>Brand-adjacent demand (Keen/Kasamba/PG = <b class="k">6,340 impressions, 35% of total</b>) is the site's core commercial surface, exactly the audience Ingenio's brands monetize best. The CTR gap here — not a ranking gap — is the single largest recoverable-click pool.</p>

<h3>3.3 Content cluster performance</h3>
{img('cluster', 'Content cluster performance')}
<table>
<tr><th>Cluster</th><th>URLs seen</th><th>Clicks</th><th>Impressions</th><th>CTR</th></tr>
{cluster_rows}
</table>
<p>The Keen reader cluster converts impressions to clicks at 2.1% — proof the individual-reader format wins clicks when it ranks. The same format on Kasamba (1.52%) is beginning to follow. Purple Garden (343 imp, 0 clicks) is simply young.</p>

<h3>3.4 Top queries &amp; pages</h3>
<div class="grid2">
<div>
<table>
<tr><th>Top queries by clicks</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
{topq_rows}
</table>
</div>
</div>
{img('topq', 'Top queries by clicks')}
<table>
<tr><th>Top pages by clicks</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
{topp_rows}
</table>
<p class="sub">Standout: the Mystic Raj reader review earns a 21.2% CTR at position 4.6 — the strongest proof that specific, reader-level pages beat listicles on CTR. The platform-level Keen review hub carries the most impressions (4,116) but only 0.78% CTR at pos 19.4.</p>

<h3>3.5 Opportunity matrix</h3>
{img('scatter', 'CTR vs position by page')}

<h3>① Striking-distance queries (pos 4-20, meaningful volume)</h3>
<table>
<tr><th>Query</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
{striking_rows}
</table>

<h3>② First-page pages with underperforming CTR (pos ≤ 15, CTR &lt; 1%)</h3>
<table>
<tr><th>Page</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
{lowctr_rows}
</table>

<h3>③ High-impression pages with zero clicks</h3>
<table>
<tr><th>Page</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
{zero_rows}
</table>

<h3>3.6 Devices &amp; geography</h3>
{img('geo', 'Devices and countries')}
<div class="warn"><b class="k">Desktop anomaly:</b> desktop carries 10,501 impressions (57%) at avg position 31.1 vs mobile's 15.9. Mobile CTR (2.76%) is 3.5x desktop's (0.79%). Diagnostics I'm considering: SERP competitor mix on desktop, title truncation differences, and whether desktop SERPs for brand terms are dominated by official sites + review aggregators above the fold.</div>
<table>
<tr><th>Country</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
{country_rows}
</table>

<h3>3.7 Technical observations</h3>
<div class="card"><b class="k">www subdomain leak:</b> {S['www_leak']['urls']} URLs on <code>www.easternalignment.com</code> accumulated {S['www_leak']['impressions']} impressions and {S['www_leak']['clicks']} clicks alongside the apex host. Planning to verify 301 consolidation + canonical enforcement — flagging in case you see anything else split.</div>
<div class="card"><b class="k">Brand demand forming:</b> <i>easternalignment.com</i> as a query: 84 impressions (0 clicks so far) — navigational brand searches have begun, which typically precedes the brand-SERP stage.</div>
<div class="card"><b class="k">Noise:</b> a handful of irrelevant impressions (e.g. "astronomy tips for single parents", pos 242) — normal long-tail noise, no action planned.</div>

<h2><span class="no">4</span>Where I would value your input</h2>
<p>I've tried to make these answerable without opening the site — but every page referenced is one click away if useful.</p>
<ol class="q">
<li><b class="k">Striking-distance triage.</b> For <span class="u">/guides/keen-love-psychics-review/</span> (1,383 imp, pos 10.4, CTR 0.22%) and <i>keen free 3 minutes</i> (570 imp, pos 8.7, CTR 0.18%): given rankings are already page-one, is the first lever title/meta rewrites, or do you see this as a SERP-feature/brand-dominance ceiling where effort is better spent elsewhere?</li>
<li><b class="k">Desktop vs mobile position gap (31.1 vs 15.9).</b> What would you check first? Any known SERP dynamics in this vertical that explain a 2x gap?</li>
<li><b class="k">Platform-page authority gap.</b> Kasamba (pos 36.6) and Purple Garden (pos 34.3) platform pages trail Keen (pos 19.4) despite identical format. For an 8-month domain with near-zero link acquisition, is the realistic path (a) internal-link restructuring from the guides cluster, (b) digital PR/link earning to the comparison pages, or (c) simply time + content depth? How would you sequence it?</li>
<li><b class="k">Purple Garden expansion architecture.</b> Per Maayan's guidance I'm prioritizing Top Psychics / Love / Mediumship intents and deferring broad Tarot. Structurally, would you build these as intent-led guides (e.g. <span class="u">/guides/best-mediums-purple-garden/</span>) feeding the reader reviews, or as hub sections under <span class="u">/reviews/purple-garden/</span>? Any cannibalization concerns with the existing Keen/Kasamba equivalents?</li>
<li><b class="k">Informational head terms.</b> <span class="u">/guides/what-is-psychic-reading/</span> has 1,796 impressions at pos 54 — big volume, weak commercial intent. Worth investing to move, or keep the focus strictly on commercial-intent clusters at this stage?</li>
<li><b class="k">AI-search citations.</b> The fake-psychic guide is being cited by Claude. From your seat, is there a repeatable pattern (structure, schema, entity coverage) you'd double down on to earn more LLM citations across the guides cluster — and does Ingenio track AI-referred conversions in a way I should be mirroring?</li>
<li><b class="k">Anything in the data that surprises you.</b> You look at more of these dashboards than I ever will — if a pattern above reads differently to you than my take, I'd rather hear it now.</li>
</ol>

<div class="footer">
Data: Google Search Console export, {S['total']['range']}, Web search, all devices/countries. Charts rendered from the raw export without sampling. Conversion figures from TUNE (Barges) dashboard + PostHog S2S postbacks. Prepared August 25, 2026 by Huanchao Wang · huanchao@easternalignment (sam Jake &lt;nuhannmiller@gmail.com&gt;).
</div>

</div>
</body>
</html>
"""

path = os.path.join(OUT, "eastern-alignment-seo-review-pack.html")
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(html)
print("written:", path, f"{os.path.getsize(path)/1024:.0f} KB")
