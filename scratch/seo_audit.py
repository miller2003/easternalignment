#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO audit of today's 21 new reader reviews (publishDate 2026-08-18).
Programmatic checks per file + cross-file duplication analysis.
"""
import os, re, glob, json, urllib.parse
from collections import Counter

ROOT = "C:/Users/samja/Desktop/site/easternalignment"
READERS = os.path.join(ROOT, "src", "content", "readers")

FILES = []
for plat in ["keen", "kasamba", "purple-garden"]:
    for p in glob.glob(os.path.join(READERS, plat, "*.md")):
        txt = open(p, encoding="utf-8").read()
        if "publishDate: '2026-08-18'" in txt or 'publishDate: "2026-08-18"' in txt or "publishDate: 2026-08-18" in txt:
            FILES.append((plat, p))

def parse_fm(text):
    end = text.find("\n---", 3)
    fm = text[3:end]
    body = text[end+4:]
    data = {}
    for line in fm.splitlines():
        if re.match(r"^\s+\S", line):
            continue
        m = re.match(r'^([A-Za-z_]+):\s?(.*)$', line)
        if m:
            data[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return data, body

def wc(s):
    return len(re.findall(r"[A-Za-z']+", s))

all_h2 = Counter()
para_shingles = Counter()
rows = []

for plat, path in sorted(FILES):
    fn = os.path.basename(path)
    base = fn[:-3]
    text = open(path, encoding="utf-8").read()
    fm, body = parse_fm(text)

    title = fm.get("title", "")
    seoTitle = fm.get("seoTitle", "")
    desc = fm.get("description", "")
    metaDesc = fm.get("metaDescription", "")
    canon = fm.get("canonicalUrl", "")
    expected_canon = f"https://easternalignment.com/reviews/{plat}/{base}/"

    h1s = re.findall(r"^# (.+)$", body, re.M)
    h2s = re.findall(r"^## (.+)$", body, re.M)
    for h in h2s:
        all_h2[h.strip()] += 1

    # paragraphs for duplication detection (normalized, >60 chars)
    for para in re.split(r"\n\s*\n", body):
        p = re.sub(r"\s+", " ", para).strip()
        p = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", p)
        if len(p) > 80:
            para_shingles[p[:120]] += 1

    words = wc(body)
    # primary keyword: reader name from platformName
    pname = fm.get("platformName", "")
    reader = pname.split(":", 1)[1].strip() if ":" in pname else ""
    first150 = " ".join(re.findall(r"[A-Za-z']+", body)[:150])
    kw_in_first = bool(reader) and reader.lower().split()[0] in first150.lower()
    kw_count = body.lower().count(reader.lower()) if reader else 0

    # internal review links
    links = re.findall(r'href="(/(?:reviews|guides)/[^"]+)"', body)
    review_links = [l for l in links if re.match(r"^/reviews/(keen|kasamba|purple-garden)/[^/]+/$", l)]
    broken = []
    for l in review_links:
        seg = l.strip("/").split("/")  # reviews, plat, slug
        target = os.path.join(READERS, seg[1], seg[2] + ".md")
        if not os.path.exists(target):
            broken.append(l)

    cta = re.findall(r'<a href="(/go/[^"]+)"([^>]*)>', body)
    cta_ok = all('nofollow' in a[1] and 'sponsored' in a[1] for a in cta) if cta else False

    schema = fm.get("customSchema", "") or ""
    # schema may be block scalar -> re-extract from raw text between customSchema: | and next key
    m = re.search(r"customSchema:\s*\|\s*\n((?:  .*\n|\n)+)", text)
    schema_raw = m.group(1) if m else schema
    schema_review = '"@type": "Review"' in schema_raw or '"@type":"Review"' in schema_raw
    rating_match = re.search(r'"ratingValue":\s*"?([\d.]+)', schema_raw)
    schema_rating = rating_match.group(1) if rating_match else None
    fm_rating = str(fm.get("rating", ""))

    rows.append({
        "file": fn, "plat": plat,
        "title_len": len(title), "seo_len": len(seoTitle),
        "desc_len": len(desc), "meta_len": len(metaDesc),
        "h1_count": len(h1s), "h2_count": len(h2s),
        "words": words,
        "canon_ok": canon.rstrip("/") == expected_canon.rstrip("/"),
        "kw_first": kw_in_first, "kw_count": kw_count, "reader": reader,
        "n_links": len(links), "n_broken": len(broken),
        "broken": broken[:3],
        "cta_ok": cta_ok, "n_cta": len(cta),
        "schema_review": schema_review,
        "schema_rating_match": schema_rating == fm_rating if schema_rating else False,
        "rating": fm_rating,
        "freeOffer": bool(fm.get("freeOffer", "")),
        "pricing": bool(fm.get("pricing", "")),
    })

# ── report ──
print(f"Audited {len(rows)} files\n")
print(f"{'file':52} {'T':>3} {'SEO':>3} {'D':>3} {'M':>3} {'H1':>2} {'H2':>2} {'wds':>5} {'canon':>5} {'kw1st':>5} {'kw#':>3} {'lnk':>3} {'brk':>3} {'cta':>4} {'sch':>3} {'rt':>3}")
for r in rows:
    print(f"{r['file'][:52]:52} {r['title_len']:3} {r['seo_len']:3} {r['desc_len']:3} {r['meta_len']:3} {r['h1_count']:2} {r['h2_count']:2} {r['words']:5} {str(r['canon_ok']):>5} {str(r['kw_first']):>5} {r['kw_count']:3} {r['n_links']:3} {r['n_broken']:3} {str(r['cta_ok']):>4} {str(r['schema_review'])[:1]:>3} {str(r['schema_rating_match'])[:1]:>3}")

print("\n== FLAG SUMMARY ==")
issues = Counter()
for r in rows:
    if r["title_len"] > 65: issues["title>65ch"] += 1
    if r["h1_count"] > 0: issues["duplicate H1 in body"] += 1
    if not r["canon_ok"]: issues["canonical mismatch"] += 1
    if r["n_broken"] > 0: issues["broken internal links"] += 1
    if not r["cta_ok"]: issues["CTA rel missing nofollow/sponsored"] += 1
    if not r["schema_review"]: issues["schema missing/invalid"] += 1
    if not r["schema_rating_match"]: issues["schema rating != frontmatter"] += 1
    if r["desc_len"] > 170 or r["desc_len"] < 120: issues["description length off (120-170)"] += 1
    if r["words"] < 1200: issues["thin content <1200 words"] += 1
    if not r["kw_first"]: issues["keyword not in first 150 words"] += 1
for k, v in issues.items():
    print(f"  {k}: {v} files")
if not issues:
    print("  (no hard flags)")

print("\n== H2 patterns shared across files (top 12) ==")
for h, c in all_h2.most_common(12):
    print(f"  {c:2}x  {h[:80]}")

print("\n== duplicate paragraph openers across files (>1) ==")
dup = {k: v for k, v in para_shingles.items() if v > 1}
for k, v in sorted(dup.items(), key=lambda x: -x[1])[:10]:
    print(f"  {v:2}x  {k[:100]}")
if not dup:
    print("  (none — no cross-file paragraph duplication)")

# broken links detail
print("\n== broken internal links detail ==")
any_broken = False
for r in rows:
    for b in r["broken"]:
        any_broken = True
        print(f"  {r['file']}: {b}")
if not any_broken:
    print("  (none)")