#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Discovery: extract title + first body paragraph for every reader review,
and flag titles ending with '?'."""
import os, re, glob

ROOT = "src/content/readers"
PLATFORMS = ["keen", "kasamba", "purple-garden"]

def split_frontmatter(text):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not m:
        return None, text
    return m.group(1), m.group(2)

def get_scalar(fm, key):
    pat = re.compile(r"^" + re.escape(key) + r":\s*(.*)$", re.M)
    for m in pat.finditer(fm):
        val = m.group(1).strip()
        if val and not val.startswith(("|", "[", "-")):
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                return val[1:-1]
            return val
    return None

q_titles = []
rows = []
for plat in PLATFORMS:
    for p in sorted(glob.glob(os.path.join(ROOT, plat, "*.md"))):
        text = open(p, encoding="utf-8").read()
        fm, body = split_frontmatter(text)
        slug = os.path.basename(p).replace(".md", "")
        title = get_scalar(fm, "title") if fm else None
        # first non-empty body line that isn't a heading marker alone
        first_para = ""
        for ln in body.splitlines():
            s = ln.strip()
            if not s:
                continue
            if s.startswith("#"):
                continue
            first_para = s
            break
        # also grab first real paragraph (after any --- or heading)
        # find first paragraph of >=40 chars
        para = ""
        buf = []
        for ln in body.splitlines():
            s = ln.rstrip()
            if s.startswith("#") or s.startswith("---") or s.startswith(">"):
                if buf:
                    break
                continue
            if s == "":
                if buf:
                    break
                continue
            buf.append(s)
        para = " ".join(buf)
        rows.append((plat, slug, title, para[:240]))
        if title and title.rstrip().endswith("?"):
            q_titles.append((plat, slug, title))

print("="*70)
print(f"TITLES ENDING WITH '?': {len(q_titles)}")
print("="*70)
for plat, slug, title in q_titles:
    print(f"  [{plat}] {slug}\n      {title}")

print("\n" + "="*70)
print("ALL OPENINGS (first paragraph) — scan for shared template")
print("="*70)
for plat, slug, title, para in rows:
    print(f"\n### [{plat}] {slug}")
    print(f"  TITLE: {title}")
    print(f"  OPEN : {para}")
