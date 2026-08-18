#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Re-formatter for src/data/affiliateLinks.ts.

The previous apply_deeplinks patch collapsed multiple slug entries onto a
single line (splitlines/rejoin lost newlines for entries that were already
packed together). The VALUES are correct, but formatting is broken (multiple
entries per line). This script splits every line that contains >1
"slug": "url" pattern back into one entry per line, preserves the closing
`};`, comments, and lines with 0 or 1 entry. Adds a trailing comma to every
emitted entry (TS allows trailing commas; cleaner than tracking per-line).
"""
import re, sys

TS = "C:/Users/samja/Desktop/site/easternalignment/src/data/affiliateLinks.ts"
ENTRY = re.compile(r'"([a-z0-9\-]+)":\s*"([^"]+)"')

with open(TS, "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []
split_count = 0
for line in lines:
    entries = ENTRY.findall(line)
    if len(entries) <= 1:
        out.append(line)
        continue

    # Line has multiple entries -> split each to its own line
    indent = re.match(r'^(\s*)', line).group(1)
    last_end = None
    for m in ENTRY.finditer(line):
        last_end = m.end()
    trailing = line[last_end:] if last_end else ""

    for slug, url in entries:
        out.append(f'{indent}"{slug}": "{url}",\n')
        split_count += 1

    # Preserve trailing comment (e.g. "  // --- NEW batch 2 ---")
    if "//" in trailing:
        cm = re.search(r'//.*', trailing)
        if cm:
            out.append(f"{indent}{cm.group(0)}\n")

with open(TS, "w", encoding="utf-8") as f:
    f.writelines(out)

print(f"Split {split_count} entries back to one-per-line across the file.")