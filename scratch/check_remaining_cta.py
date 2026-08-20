#!/usr/bin/env python3
"""Audit reader markdown for leftover affiliate CTA anchors and classify them."""
import glob
import os
import re

ROOT = r'C:\Users\samja\Desktop\site\easternalignment\src\content\readers'
PATTERN = re.compile(
    r'<a href="/go/[^"]*" rel="nofollow sponsored" target="_blank">.*?</a>',
    re.IGNORECASE | re.DOTALL,
)

files_with_anchor = []
inline_only = []        # anchor present but clearly mid-article (not last line)
last_line = []          # anchor present AND is the last non-blank line (should be 0 now)

for path in sorted(glob.glob(os.path.join(ROOT, '**', '*.md'), recursive=True)):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    lines = text.split('\n')
    while lines and lines[-1].strip() == '':
        lines.pop()
    anchors = PATTERN.findall(text)
    if not anchors:
        continue
    files_with_anchor.append(path)
    last = lines[-1] if lines else ''
    if PATTERN.search(last):
        last_line.append(path)
    else:
        inline_only.append(path)

print(f'total files with any CTA anchor: {len(files_with_anchor)}')
print(f'anchor as LAST line (should be 0): {len(last_line)}')
print(f'anchor only mid-article (inline, OK): {len(inline_only)}')
print()
if inline_only:
    print('--- files with inline-only anchors (sample up to 15) ---')
    for p in inline_only[:15]:
        print(' ', os.path.relpath(p, ROOT))
