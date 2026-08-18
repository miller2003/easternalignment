#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build scratch/_av_manifest.tsv for the 19 readers that need avatar fetching:
15 Kasamba + 4 Purple Garden (Keen handled via clipboard, not this pipeline).

TSV columns (tab-separated): platform  fn  off  base
  platform: kasamba | purple-garden
  fn:       md filename (e.g. accurate-love-readings-kasamba-review.md)
  off:      official profile URL to curl (from Excel / affiliateLinks.ts)
  base:     avatar base name (fn minus .md)
"""
import openpyxl, os

ROOT = "C:/Users/samja/Desktop/site/easternalignment"
TSV = f"{ROOT}/scratch/_av_manifest.tsv"

wb = openpyxl.load_workbook(f"{ROOT}/reader-deeplinks-2026-08-18.xlsx")
ws = wb.active

# explicit slug -> md filename mapping (spiritual-anna is the naming exception)
SLUG2MD = {
    "kasamba-accurate-love-readings":         "accurate-love-readings-kasamba-review.md",
    "kasamba-ambers-light":                   "ambers-light-kasamba-review.md",
    "kasamba-best-psychic-readings":          "best-psychic-readings-kasamba-review.md",
    "kasamba-divine-master":                  "divine-master-kasamba-review.md",
    "kasamba-divine-soul":                    "divine-soul-kasamba-review.md",
    "kasamba-intuitive-counselor":            "intuitive-counselor-kasamba-review.md",
    "kasamba-love-psychic-indi":              "love-psychic-indi-kasamba-review.md",
    "kasamba-love-specialist-isabelle":       "love-specialist-isabelle-kasamba-review.md",
    "kasamba-miss-bathsheba":                 "miss-bathsheba-kasamba-review.md",
    "kasamba-quietsound":                     "quietsound-kasamba-review.md",
    "kasamba-raven-franks":                   "raven-franks-kasamba-review.md",
    "kasamba-spiritual-anna":                 "powerful-visions-kasamba-review.md",  # naming exception
    "kasamba-spiritual-divini-service":       "spiritual-divini-service-kasamba-review.md",
    "kasamba-the-fruno":                      "the-fruno-kasamba-review.md",
    "kasamba-truth-and-light":                "truth-and-light-kasamba-review.md",
    "purple-garden-emmanuelle-berger":       "emmanuelle-berger.md",
    "purple-garden-psychic-logan":            "psychic-logan.md",
    "purple-garden-psychic-willow":           "psychic-willow.md",
    "purple-garden-sagest":                   "sagest.md",
}

rows = []
for r in ws.iter_rows(min_row=2, values_only=True):
    slug = r[3]; official = r[4]
    if slug not in SLUG2MD:
        continue
    fn = SLUG2MD[slug]
    platform = "kasamba" if slug.startswith("kasamba-") else "purple-garden"
    base = fn[:-3]
    # sanity: md must exist
    if not os.path.exists(f"{ROOT}/src/content/readers/{platform}/{fn}"):
        print(f"!! MISSING md: {platform}/{fn}")
        continue
    rows.append((platform, fn, official, base))

# write TSV (LF only, no CRLF — matches _av_fetch.sh expectations)
with open(TSV, "w", encoding="utf-8", newline="\n") as f:
    for platform, fn, off, base in rows:
        f.write(f"{platform}\t{fn}\t{off}\t{base}\n")

print(f"Wrote {len(rows)} rows to {TSV}")
for r in rows:
    print(f"  {r[0]:13}  {r[1]}")