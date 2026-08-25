# -*- coding: utf-8 -*-
"""Render the 3-page A4 Organic Growth Brief (executive level, analyst-not-strategist)."""
import json
import os

OUT = r"C:\Users\samja\Desktop\site\easternalignment\scratch\gsc_matthew"
with open(os.path.join(OUT, "brief_data.json"), encoding="utf-8") as f:
    D = json.load(f)

f_int = lambda v: f"{int(v):,}"
f_pos = lambda v: f"{float(v):.1f}"
f_ctr = lambda v: f"{float(v):.2f}%"

# --- confidentiality masks (reader names / breakout URLs) ---
QUERY_MASK = {
    "keen psychic one": "keen psychic [Reader Name]",
    "yazmin kasamba": "[Reader Name] kasamba",
    "psychic yazmin": "psychic [Reader Name]",
}
URL_MASK = {
    "/reviews/keen/mystic-raj-on-keen-review-2026/": "/reviews/keen/[individual-reader-review-A]/",
    "/guides/brutally-honest-psychics-keen/": "/guides/[trust-and-honesty-angle]/",
    "/reviews/keen/master-sher/": "/reviews/keen/[individual-reader-review-B]/",
    "/reviews/keen/the-psychic-one/": "/reviews/keen/[individual-reader-review-C]/",
}


def qrows(recs, n=None):
    recs = recs[:n] if n else recs
    out = []
    for r in recs:
        q = QUERY_MASK.get(r["query"], r["query"])
        out.append(
            f"<tr><td class='q'>{q}</td><td>{f_int(r['impressions'])}</td>"
            f"<td>{int(r['clicks'])}</td><td>{f_ctr(r['ctr'])}</td><td>{f_pos(r['position'])}</td></tr>"
        )
    return "\n".join(out)


def prows(recs, n=None):
    recs = recs[:n] if n else recs
    out = []
    for r in recs:
        p = r["page"].replace("https://easternalignment.com", "").replace("https://www.easternalignment.com", "<b>www</b>.")
        p = URL_MASK.get(p, p)
        out.append(
            f"<tr><td class='u'>{p}</td><td>{f_int(r['impressions'])}</td>"
            f"<td>{int(r['clicks'])}</td><td>{f_ctr(r['ctr'])}</td><td>{f_pos(r['position'])}</td></tr>"
        )
    return "\n".join(out)


i4rows = "\n".join(
    f"<tr><td class='q'>{r['intent4']}</td><td>{int(r['n'])}</td><td>{f_int(r['impressions'])}</td>"
    f"<td>{int(r['clicks'])}</td><td>{f_ctr(r['ctr'])}</td><td>{f_pos(r['wpos'])}</td></tr>"
    for r in D["i4"]
)

clrows = "\n".join(
    f"<tr><td class='q'>{r['cluster']}</td><td>{f_int(r['impressions'])}</td><td>{int(r['clicks'])}</td>"
    f"<td>{f_pos(r['wpos'])}</td><td class='ci ci-{r['ci'].lower().replace('-', '').replace(' ', '')}'>{r['ci']}</td><td class='cov'>{r['cov']}</td></tr>"
    for r in D["cl"]
)

g28i, g28c = D["g28"]["imp"], D["g28"]["clk"]
g45i, g45c = D["g45"]["imp"], D["g45"]["clk"]
L28, P28, L45, P45, T = D["last28"], D["prev28"], D["last45"], D["prev45"], D["total"]

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Easternalignment.com — Organic Growth Brief</title>
<style>
:root {{ --navy:#1b2a4a; --ink:#1f2733; --body:#3b4351; --mut:#6b7484; --line:#dfe3ea; --soft:#f6f7fa; --blue:#2f6fed; --red:#c03d3d; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:#e8eaee; font-family:Georgia,'Times New Roman',serif; color:var(--body); font-size:9.6pt; line-height:1.5; }}
.page {{ width:210mm; min-height:297mm; background:#fff; margin:18px auto; padding:13mm 14mm 11mm; box-shadow:0 2px 14px rgba(0,0,0,.14); position:relative; page-break-after:always; }}
.pageno {{ position:absolute; bottom:7mm; right:14mm; font-size:7.5pt; color:var(--mut); font-family:Helvetica,Arial,sans-serif; }}
.brandline {{ font-family:Helvetica,Arial,sans-serif; font-size:7.5pt; letter-spacing:.18em; text-transform:uppercase; color:var(--blue); font-weight:700; }}
h1 {{ font-size:19pt; color:var(--navy); margin:2px 0 2px; letter-spacing:-.01em; }}
.sub {{ font-family:Helvetica,Arial,sans-serif; font-size:8pt; color:var(--mut); }}
.meta {{ display:flex; justify-content:space-between; align-items:baseline; border-bottom:2.5px solid var(--navy); padding-bottom:7px; margin-bottom:10px; }}
h2 {{ font-family:Helvetica,Arial,sans-serif; font-size:10.5pt; color:var(--navy); margin:13px 0 4px; }}
h2 .n {{ color:var(--blue); margin-right:6px; }}
p {{ margin:4px 0; }}
.kpis {{ display:grid; grid-template-columns:repeat(5,1fr); gap:7px; margin:8px 0 2px; }}
.kpi {{ border:1px solid var(--line); border-top:3px solid var(--navy); padding:6px 8px 5px; background:var(--soft); }}
.kpi .v {{ font-size:14.5pt; font-weight:700; color:var(--navy); font-family:Helvetica,Arial,sans-serif; letter-spacing:-.02em; }}
.kpi .l {{ font-family:Helvetica,Arial,sans-serif; font-size:6.6pt; text-transform:uppercase; letter-spacing:.07em; color:var(--mut); margin-top:1px; }}
.stage {{ border:1px solid #bfd0f5; background:#f2f6ff; border-left:4px solid var(--blue); padding:8px 12px; margin:9px 0; }}
table {{ width:100%; border-collapse:collapse; font-family:Helvetica,Arial,sans-serif; font-size:8pt; margin:5px 0; }}
th {{ text-align:left; font-size:6.8pt; text-transform:uppercase; letter-spacing:.06em; color:var(--mut); padding:3.5px 6px; border-bottom:1.6px solid var(--navy); }}
td {{ padding:3.5px 6px; border-bottom:1px solid var(--line); vertical-align:top; }}
tr:nth-child(even) td {{ background:#fafbfc; }}
td.q {{ font-weight:600; color:var(--ink); }}
td.u {{ font-family:'Courier New',monospace; font-size:7.3pt; color:#1d4fd7; word-break:break-all; }}
td.cov {{ color:var(--mut); font-size:7.6pt; }}
td.ci {{ font-weight:700; }}
.ci-high {{ color:#b02a2a; }} .ci-medhigh {{ color:#c06a1a; }} .ci-medium {{ color:#8a6d00; }} .ci-low {{ color:#6b7484; }}
.growth {{ font-weight:700; color:#1e9e6a; }}
.down {{ color:var(--red); }}
.callout {{ background:var(--soft); border:1px solid var(--line); border-left:4px solid var(--navy); padding:7px 11px; margin:8px 0; }}
.fig {{ margin:6px 0; }} .fig img {{ width:100%; border:1px solid var(--line); }}
.grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }}
.qcard {{ border:1px solid var(--line); border-left:4px solid var(--blue); background:#fbfcfe; padding:12px 16px; margin:0 0 14px; }}
.qcard .qt {{ font-size:11.5pt; color:var(--navy); font-weight:700; line-height:1.4; }}
.qcard .qsub {{ font-weight:400; font-size:10pt; color:var(--mut); }}
.qcard p {{ margin:7px 0 0; }}
.qcard p b {{ color:var(--navy); }}
.qcard .ctx {{ font-family:Helvetica,Arial,sans-serif; font-size:7.8pt; color:var(--mut); margin-top:6px; }}
ol.bigq {{ counter-reset:qq; padding:0; margin:12px 0; list-style:none; }}
ol.bigq li {{ counter-increment:qq; position:relative; padding-left:34px; }}
ol.bigq li::before {{ content:counter(qq); position:absolute; left:0; top:10px; width:22px; height:22px; border-radius:50%; background:var(--navy); color:#fff; font-family:Helvetica,Arial,sans-serif; font-weight:700; font-size:10pt; display:flex; align-items:center; justify-content:center; }}
.small {{ font-size:8pt; color:var(--mut); }}
ul.tight {{ margin:4px 0 4px 16px; padding:0; }}
ul.tight li {{ margin:3px 0; }}
@page {{ size:A4; margin:0; }}
@media print {{ body {{ background:#fff; }} .page {{ margin:0; box-shadow:none; width:auto; min-height:auto; height:297mm; padding:13mm 14mm 11mm; }} }}
</style>
</head>
<body>

<!-- ============ PAGE 1 ============ -->
<div class="page">
  <div class="meta">
    <div>
      <div class="brandline">Organic Growth Brief</div>
      <h1>Easternalignment.com</h1>
      <div class="sub">Organic search performance, demand structure, and content opportunities.</div>
    </div>
    <div class="sub" style="text-align:right">
      Prepared by Huanchao Wang, publisher<br/>
      August 25, 2026<br/>
      Data: Google Search Console, Apr 15 – Aug 22, 2026 (130 days, unsampled)
    </div>
  </div>

  <h2><span class="n">1</span>Website snapshot</h2>
  <p>Independent, reader-supported publisher in the online-psychic-reading niche (Keen / Kasamba / Purple Garden, TUNE network, $125 CPA Kasamba as of Aug 23). ~355 static URLs on Cloudflare. Differentiator: <b>114 individual-reader reviews</b> across the three platforms — reader-level, not the platform-level listicles that dominate this SERP — supported by 78 intent-led guides, 6 comparison pages, 7 interactive tools, and a Spanish pilot section. PostHog + S2S postbacks give query → page → click → paid-conversion visibility; from ~300 organic clicks to date, we have seen 10 signups and 4 qualified first-time paid conversions (~1.3% click-to-paid, 3.4% click-to-signup).</p>

  <div class="kpis">
    <div class="kpi"><div class="v">{f_int(T['clicks'])}</div><div class="l">Clicks (130d)</div></div>
    <div class="kpi"><div class="v">{f_int(T['impressions'])}</div><div class="l">Impressions (130d)</div></div>
    <div class="kpi"><div class="v">{T['ctr']}%</div><div class="l">Avg CTR</div></div>
    <div class="kpi"><div class="v">{T['wpos']}</div><div class="l">Wtd avg position</div></div>
    <div class="kpi"><div class="v">247 / 355</div><div class="l">URLs surfacing (70%)</div></div>
  </div>

  <div class="stage"><b style="color:var(--navy)">Current stage: early organic growth (~4 months post-sandbox) with emerging topical authority in individual-reader reviews.</b><br/>
  <span class="small">Evidence: impressions up ~12x since April · 247 URLs already surfacing · reader-review pages earning 2.1% CTR vs 0.78% on the platform hub · first brand-navigational queries for "easternalignment.com" (84 imp) · cited by Claude as an authoritative source on psychic-fraud detection · 13 long conversational LLM-agent-style queries already surfacing at positions 6–12.</span></div>

  <h2><span class="n">2</span>Performance trend — 28 / 45-day windows</h2>
  <table>
    <tr><th>Window</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Wtd pos</th><th>Clicks Δ</th><th>Impressions Δ</th></tr>
    <tr><td class="q">Last 28 days (Jul 26 – Aug 22)</td><td>{L28['clicks']}</td><td>{f_int(L28['impressions'])}</td><td>{L28['ctr']}%</td><td>{L28['wpos']}</td><td class="growth" rowspan="2" style="vertical-align:middle">+{g28c}%</td><td class="growth" rowspan="2" style="vertical-align:middle">+{g28i}%</td></tr>
    <tr><td class="q">Prior 28 days (Jun 28 – Jul 25)</td><td>{P28['clicks']}</td><td>{f_int(P28['impressions'])}</td><td>{P28['ctr']}%</td><td>{P28['wpos']}</td></tr>
    <tr><td class="q">Last 45 days (Jul 9 – Aug 22)</td><td>{L45['clicks']}</td><td>{f_int(L45['impressions'])}</td><td>{L45['ctr']}%</td><td>{L45['wpos']}</td><td class="growth" rowspan="2" style="vertical-align:middle">+{g45c}%</td><td class="growth" rowspan="2" style="vertical-align:middle">+{g45i}%</td></tr>
    <tr><td class="q">Prior 45 days (May 25 – Jul 8)</td><td>{P45['clicks']}</td><td>{f_int(P45['impressions'])}</td><td>{P45['ctr']}%</td><td>{P45['wpos']}</td></tr>
  </table>
  <p class="small">180-day comparison not available — the property only began indexing Apr 15 (site is 8 months old; sandbox exit mid-April). Earliest baseline shown above. CTR dip 1.80% → 1.53% is a mix effect: impressions are expanding into broader brand &amp; informational terms faster than clicks; page-level CTRs in the money cluster are stable or rising (§6).</p>
  <div class="fig"><img src="data:image/png;base64,{D['trend']}" alt="Daily trend"/></div>

  <h2><span class="n">3</span>What is driving the growth</h2>
  <ul class="tight">
    <li><b>Reader-level pages win clicks disproportionately.</b> The Keen reader cluster converts impressions at 2.1% CTR (vs 0.78% for the platform hub); top performer <span class="u">/reviews/keen/[individual-reader-review-A]/</span> earns 21.2% CTR at pos 4.6. Google is rewarding reader-level specificity over listicles.</li>
    <li><b>Guides are the impression engine</b> — 54% of total impressions (9,925) across 57 surfacing URLs — and the August Kasamba/Purple Garden cluster build-out is already adding impressions (PG: 0 → 343 in under three weeks).</li>
    <li><b>Demand is brand-anchored:</b> 35% of all impressions are Keen/Kasamba/PG navigational queries — high commercial value, ranking pages 1–2, monetizing at only 0.28% CTR (§4–§5).</li>
  </ul>
  <div class="pageno">Easternalignment.com — Organic Growth Brief · Page 1 of 3</div>
</div>

<!-- ============ PAGE 2 ============ -->
<div class="page">
  <h2 style="margin-top:0"><span class="n">4</span>Search demand — query intent mix</h2>
  <table>
    <tr><th>Intent</th><th>Queries</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Wtd pos</th></tr>
    {i4rows}
  </table>
  <p class="small">Brand/navigational carries the volume and the best positions. Non-brand commercial terms (best/top/cheap/free) sit at pos ~61 — the classic authority gap of a young domain. Problem/pain-point queries are small in Google volume but are exactly the content Claude cites.</p>

  <h2><span class="n">5</span>Topic clusters — traction vs coverage</h2>
  <div class="fig"><img src="data:image/png;base64,{D['cluster_img']}" alt="Topic clusters"/></div>
  <table>
    <tr><th>Cluster</th><th>Impressions</th><th>Clicks</th><th>Wtd pos</th><th>Commercial intent</th><th>Current coverage</th></tr>
    {clrows}
  </table>
  <div class="callout"><b>Data point, not a recommendation:</b> conversion data shared by the Purple Garden affiliate program indicates its Top Psychics, Love, and Mediumship landing pages convert best. In the search data, <b>Mediumship is the thinnest cluster on the site</b> — 38 impressions, 6 queries, 2–3 guides — while Love &amp; relationship queries (non-brand) register 369 impressions at pos ~46 against deep coverage. Trust/scam content (1 pillar guide) is what earns AI citations.</div>

  <h2><span class="n">6</span>Opportunity queries — three tiers</h2>
  <div class="grid2">
    <div>
      <table>
        <tr><th colspan="5">① Quick wins — pos 4–20, meaningful volume</th></tr>
        <tr><th>Query</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th></tr>
        {qrows(D['qw'], 6)}
      </table>
      <table>
        <tr><th colspan="5">② Emerging — pos 20–50 (Google is parsing the content)</th></tr>
        <tr><th>Query</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th></tr>
        {qrows(D['em'], 6)}
      </table>
    </div>
    <div>
      <table>
        <tr><th colspan="5">③ Untapped commercial — high intent, zero clicks</th></tr>
        <tr><th>Query</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th></tr>
        {qrows(D['unt'], 6)}
      </table>
      <div class="callout" style="margin-top:6px"><b>Reading ①:</b> <i>keen psychic love &amp; relationships</i> — 1,535 impressions at pos 9.6 with 0.2% CTR — already page one; the gap is snippet-level, not ranking. <b>Reading ②–③:</b> Kasamba/PG brand terms at pos 27–48 mirror exactly where Keen was ~10 weeks ago.</div>
    </div>
  </div>

  <h2><span class="n">7</span>Page-level signals</h2>
  <div class="grid2">
    <div>
      <table>
        <tr><th colspan="5">Top pages by clicks</th></tr>
        <tr><th>Page</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th></tr>
        {prows(D['top6'], 5)}
      </table>
    </div>
    <div>
      <table>
        <tr><th colspan="5">High impressions, underperforming CTR (pos ≤ 20)</th></tr>
        <tr><th>Page</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th></tr>
        {prows(D['poor_ctr'], 5)}
      </table>
    </div>
  </div>
  <p class="small"><b>Also noted:</b> 5 individual reader pages rank 5–20 with CTR 2–11% (representing specific high-performing readers) — the format's repeatable pattern. High-impression zero-click pages: <span class="u">/guides/is-purple-garden-legit/</span> (292, pos 21), <span class="u">/reviews/purple-garden/</span> (259, pos 34), <span class="u">/reviews/keen/[individual-reader-review-C]/</span> (256, pos 18). Housekeeping: {D['www_i']} impressions leaked to <b>www</b>-host variants (301 consolidation queued).</p>
  <div class="pageno">Easternalignment.com — Organic Growth Brief · Page 2 of 3</div>
</div>

<!-- ============ PAGE 3 ============ -->
<div class="page">
  <h2 style="margin-top:0"><span class="n">8</span>Strategic Questions for the Next Planning Cycle</h2>
  <p>To respect your time, I have synthesized the data below. Based on your macro-level experience, I would love your quick intuition on these three strategic directions:</p>

  <ol class="bigq">
    <li>
      <div class="qcard">
        <div class="qt">Content Cluster Prioritization <span class="qsub">(Where is the highest ROI?)</span></div>
        <p><b>Current State:</b> 'Keen' related content is compounding well but maturing. 'Kasamba/Purple Garden' content is deep but ranking thin. 'Mediumship' is nearly empty on my end (though I know it converts well internally). Meanwhile, our 'Trust/Scam-prevention' content is naturally earning AI citations (like Claude).</p>
        <p><b>The Question:</b> Given a limited content velocity, would you double down on building out the highly-convertible 'Mediumship' cluster from scratch, or focus on pushing the existing 'Kasamba/PG' cluster higher?</p>
      </div>
    </li>
    <li>
      <div class="qcard">
        <div class="qt">Breaking the Non-Brand Ranking Ceiling</div>
        <p><b>Current State:</b> Brand-anchored demand accounts for 35% of impressions. However, high-intent non-brand commercial terms are currently stuck around position ~60 <b>(referring domains near zero; no active link acquisition to date)</b>.</p>
        <p><b>The Question:</b> From your perspective, is a plateau at position ~60 for non-brand terms in this niche typically a symptom of topical gaps in the site architecture, or strictly a lack of domain authority/backlinks?</p>
      </div>
    </li>
    <li>
      <div class="qcard">
        <div class="qt">The 3–6 Month Roadmap <span class="qsub">(If you were in my shoes)</span></div>
        <p><b>My Current Constraints/Assets:</b> Solo operator; content velocity of 15–20 high-quality pages/month; near-zero active link acquisition so far; conversion infrastructure (CTA testing, S2S tracking, fast Astro/Cloudflare architecture) is fully deployed and ready to scale.</p>
        <p><b>The Question:</b> If this were your digital asset and you were working within these solo-operator constraints, what would be your singular main focus over the next 3 to 6 months to maximize valuation and traffic growth?</p>
      </div>
    </li>
  </ol>

  <div style="border-top:1.6px solid var(--navy); margin-top:16px; padding-top:8px" class="small">
    Data: Google Search Console export, Apr 15 – Aug 22, 2026, Web search, unsampled; figures computed from the raw export. Conversion figures: TUNE (Barges) + PostHog S2S postbacks. Site: easternalignment.com — independent, reader-supported; affiliate disclosure site-wide.<br/>
    Prepared by Huanchao Wang · August 25, 2026
  </div>
  <div class="pageno">Easternalignment.com — Organic Growth Brief · Page 3 of 3</div>
</div>

</body>
</html>
"""

path = os.path.join(OUT, "Easternalignment_Organic_Growth_Brief.html")
with open(path, "w", encoding="utf-8", newline="\n") as f:
    f.write(html)
print("written:", path, f"{os.path.getsize(path)/1024:.0f} KB")
