#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
One-shot SEO fixer for today's 21 new reader reviews:
  P1.1 remove duplicate body H1 (Kasamba files)
  P1.2 metaDescription smart-trim to <=160
  P2.3 regenerate seoTitle to <=60 chars (keyword-first, no brand suffix)
  P2.4 set ogImage to the reader avatar (BaseLayout absolutizes)
  P3.6 de-templatize H2s: unique per-file replacement for "The Honest Caveats"
      (20x) and vary 4 of 6 "The Verdict"
"""
import os, re, subprocess

ROOT = "C:/Users/samja/Desktop/site/easternalignment"
SITE = "https://easternalignment.com"

# today's 21 files via git status (untracked reader md)
out = subprocess.run(["git", "status", "--short"], cwd=ROOT, capture_output=True, text=True).stdout
FILES = [l[3:].strip() for l in out.splitlines()
         if l.startswith("??") and "src/content/readers/" in l]
assert len(FILES) == 21, f"expected 21 files, got {len(FILES)}"

CAVEAT_VARIANTS = [
    "Where This Reading Style Isn't for Everyone",
    "The Trade-Offs, Stated Plainly",
    "What to Know Before You Book",
    "The Fine Print That Actually Matters",
    "Honest Limits, No Sugar-Coating",
    "Who Should Skip This Reader",
    "The Caveats Worth Your Attention",
    "What the Reviews Complain About",
    "The Weak Points, Documented",
    "Reading the Risks Before You Pay",
    "The Parts That Divide Clients",
    "Where the Shine Dims",
    "The Honest Limitations",
    "What You Give Up With This Style",
    "Boundaries of the Gift",
    "The Cost of the Strength",
    "Not for Everyone — Here's Why",
    "The Realistic Expectations",
    "Strengths Have Shadows",
    "The Straight Talk Section",
]
VERDICT_VARIANTS = ["Should You Book?", "The Bottom Line", "Final Call", "Book or Pass?"]

def parse_fm(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    return m.group(1), m.group(2)

def fm_get(fm, key):
    m = re.search(rf"^{key}:\s?(.*)$", fm, re.M)
    if not m:
        return None
    return m.group(1).strip().strip('"').strip("'")

def fm_set(fm, key, value):
    line = f'{key}: "{value}"'
    new = re.sub(rf"^{key}:.*$", lambda _: line, fm, flags=re.M)
    return new

def fm_insert_after(fm, anchor_key, line):
    return re.sub(rf"^({anchor_key}:.*)$", lambda m: m.group(1) + "\n" + line, fm, count=1, flags=re.M)

def trim_meta(md):
    if len(md) <= 160:
        return md
    for sep in [". ", ", ", " — ", " - ", "; "]:
        cut = md.rfind(sep, 0, 158)
        if cut > 70:
            s = md[:cut].rstrip()
            if sep == ". ":
                s += "."
            else:
                s += "."
            if len(s) <= 160:
                return s
    s = md[:157].rsplit(" ", 1)[0].rstrip(" ,;:—-") + "."
    return s[:160]

def make_seo_title(reader, plat, rating, price):
    plat_label = {"keen": "Keen", "kasamba": "Kasamba", "purple-garden": "Purple Garden"}[plat]
    base = f"{reader} {plat_label} Review 2026"
    cands = []
    if price:
        cands.append(f"{base}: {rating}, {price}")
    cands.append(f"{base}: {rating} Stars")
    cands.append(base)
    for c in cands:
        if len(c) <= 60:
            return c
    return base  # worst case: still shorter than before

stats = {"h1_removed": 0, "meta_trimmed": 0, "seo_rewritten": 0,
         "ogimg_set": 0, "caveat_renamed": 0, "verdict_renamed": 0}
caveat_pool = list(CAVEAT_VARIANTS)
verdict_pool = list(VERDICT_VARIANTS)

for rel in sorted(FILES):
    plat = rel.split("/")[3]  # src/content/readers/<plat>/file.md
    path = os.path.join(ROOT, rel)
    text = open(path, encoding="utf-8").read()
    fm, body = parse_fm(text)

    reader = fm_get(fm, "platformName") or ""
    if ":" in reader:
        reader = reader.split(":", 1)[1].strip()
    rating = fm_get(fm, "rating") or ""
    pricing = fm_get(fm, "pricing") or ""
    pm = re.search(r"\$[\d.]+(?:/min)?", pricing)
    price = pm.group(0) if pm else ""
    avatar = fm_get(fm, "avatarUrl") or ""

    # P1.1 remove first body H1 (single # only)
    body2 = re.sub(r"^(?:\s*\n)*(#[^#].*?\n)", "", body, count=1) if re.match(r"^\s*#[^#]", body) else body
    if body2 != body:
        stats["h1_removed"] += 1
    body = body2

    # P3.6 caveats
    if "## The Honest Caveats" in body and caveat_pool:
        v = caveat_pool.pop(0)
        body = body.replace("## The Honest Caveats", f"## {v}", 1)
        stats["caveat_renamed"] += 1
    # P3.6 verdict (vary up to 4)
    if "## The Verdict" in body and verdict_pool:
        v = verdict_pool.pop(0)
        body = body.replace("## The Verdict", f"## {v}", 1)
        stats["verdict_renamed"] += 1

    # P1.2 metaDescription trim
    md = fm_get(fm, "metaDescription") or ""
    if md and len(md) > 160:
        fm = fm_set(fm, "metaDescription", trim_meta(md))
        stats["meta_trimmed"] += 1

    # P2.3 seoTitle regenerate
    st = fm_get(fm, "seoTitle") or ""
    if reader and rating:
        new_st = make_seo_title(reader, plat, rating, price)
        if len(new_st) < len(st):
            fm = fm_set(fm, "seoTitle", new_st)
            stats["seo_rewritten"] += 1

    # P2.4 ogImage
    if avatar and not re.search(r"^ogImage:", fm, re.M):
        fm = fm_insert_after(fm, "avatarUrl", f'ogImage: "{avatar}"')
        stats["ogimg_set"] += 1

    open(path, "w", encoding="utf-8", newline="\n").write("---\n" + fm + "\n---\n" + body)

print("DONE:", stats)
print("caveat variants unused:", len(caveat_pool), "| verdict unused:", len(verdict_pool))