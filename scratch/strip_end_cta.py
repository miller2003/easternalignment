#!/usr/bin/env python3
"""
Strip the legacy end-of-article CTA anchor from every reader-review markdown so
the layout's <ReaderEndCTA/> becomes the only end CTA.

The end CTA is the final affiliate link in each article. Some files place it as
the literal last line; others put it just before the "reader-supported"
disclosure line. Both cases are handled by removing the LAST /go/ affiliate
anchor when it sits within the final 6 lines of the file (the end CTA), while
leaving any genuinely mid-article inline links and the disclosure text intact.

Scope: ONLY src/content/readers/**/*.md. Idempotent: re-running is safe.
"""
import glob
import os
import re

ROOT = r'C:\Users\samja\Desktop\site\easternalignment\src\content\readers'
ANCHOR = re.compile(
    r'^\s*<a href="/go/[^"]*" rel="nofollow sponsored" target="_blank">.*?</a>\s*$',
    re.IGNORECASE | re.DOTALL,
)
TAIL_WINDOW = 6

changed = 0
skipped = 0
for path in sorted(glob.glob(os.path.join(ROOT, '**', '*.md'), recursive=True)):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    lines = text.split('\n')

    # Locate the LAST affiliate-anchor line.
    idx = None
    for i in range(len(lines) - 1, -1, -1):
        if ANCHOR.match(lines[i]):
            idx = i
            break
    if idx is None:
        skipped += 1
        continue
    # The final /go/ affiliate anchor in a reader review is, by construction, the
    # end-of-article CTA (related-link blocks use /reviews/ markdown links, not
    # /go/ anchors). Remove it so the layout's <ReaderEndCTA/> is the only one.
    del lines[idx]
    # Drop a blank line that may now sit adjacent, and any trailing blanks.
    while lines and lines[-1].strip() == '':
        lines.pop()

    new_text = '\n'.join(lines) + '\n'
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_text)
    changed += 1

print(f'changed={changed} skipped={skipped}')
