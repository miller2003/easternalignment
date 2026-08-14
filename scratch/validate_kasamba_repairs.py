#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Focused validation for the 12 repaired Kasamba files + all 20 sanity sweep."""
import os, re, glob, json
import yaml

ROOT = "src/content/readers/kasamba"
# The 12 files the AI report flagged (also repaired)
REPAIRED = [
    "ask-cristina", "cosmic-fusion", "david-james-psychic-wisdom", "elizabeth",
    "golden-eye", "love-stefans-psychic-soul", "psychic-safina", "psychic-satire",
    "psychic-simmi", "psychic-yazmin", "seek-chelle", "wisdom-and-love",
]

def split_frontmatter(text):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not m:
        return None, text
    return m.group(1), m.group(2)

all_files = sorted(glob.glob(os.path.join(ROOT, "*.md")))
report = []
for path in all_files:
    slug = os.path.basename(path).replace(".md", "")
    text = open(path, encoding="utf-8").read()
    fm_raw, body = split_frontmatter(text)
    flags = []
    is_repaired = slug in REPAIRED
    # 1. YAML parses
    try:
        data = yaml.safe_load(fm_raw)
        if not isinstance(data, dict):
            flags.append("YAML_NOT_DICT")
            data = {}
    except Exception as e:
        flags.append("YAML_PARSE_ERROR:" + str(e)[:60])
        data = {}
    # 2. entities present + non-empty list
    ents = data.get("entities")
    if not (isinstance(ents, list) and len(ents) > 0):
        flags.append("ENTITIES_MISSING_OR_EMPTY")
    # 3. rating == schema ratingValue
    rating = data.get("rating")
    schema = data.get("customSchema")
    schema_rating = None
    if isinstance(schema, str):
        m = re.search(r'"ratingValue"\s*:\s*"([0-9.]+)"', schema)
        if m:
            schema_rating = m.group(1)
    elif isinstance(schema, dict):
        try:
            schema_rating = str(schema.get("reviewRating", {}).get("ratingValue"))
        except Exception:
            schema_rating = None
    if rating is not None and schema_rating is not None:
        try:
            if abs(float(rating) - float(schema_rating)) > 0.001:
                flags.append(f"RATING_SCHEMA_MISMATCH(fm={rating},schema={schema_rating})")
        except Exception:
            flags.append("RATING_UNPARSEABLE")
    elif schema_rating is None:
        flags.append("SCHEMA_RATINGVALUE_MISSING")
    # 4. no '''' artifact in frontmatter
    if "''''" in fm_raw:
        flags.append("QUOTE_ARTIFACT")
    # 5. no double-plus anywhere in file
    if "++" in text:
        flags.append("DOUBLE_PLUS")
    # 6. subject 5-star claim when rating<5 (flag for manual review)
    try:
        rval = float(rating) if rating is not None else None
    except Exception:
        rval = None
    if rval is not None and rval < 5.0:
        # find any "X-star" claims in body
        star_claims = re.findall(r"(\d\.\d)-star", body)
        for sc in star_claims:
            try:
                if abs(float(sc) - rval) > 0.001:
                    flags.append(f"BODY_STAR_MISMATCH(body claims {sc}-star, fm={rating})")
                    break
            except Exception:
                pass
    report.append({"slug": slug, "repaired": is_repaired, "rating": rating,
                   "schema_rating": schema_rating, "flags": flags,
                   "entities": len(ents) if isinstance(ents, list) else 0})

print("="*70)
print(f"KASAMBA FILES: {len(report)}  | repaired set: {len(REPAIRED)}")
problems = [r for r in report if r["flags"]]
print(f"FILES WITH FLAGS: {len(problems)}")
print("="*70)
for r in report:
    mark = " [REPAIRED]" if r["repaired"] else ""
    status = "PASS" if not r["flags"] else "FLAG"
    print(f"  {status}  {r['slug']}{mark}  (rating={r['rating']}, schema={r['schema_rating']}, entities={r['entities']})")
    for f in r["flags"]:
        print(f"        ! {f}")

print("\n" + "="*70)
print(f"SUMMARY: {len(report)-len(problems)} clean, {len(problems)} with flags")
print("Wrote scratch/validate_kasamba_report.json")
with open("scratch/validate_kasamba_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
