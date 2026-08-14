#!/usr/bin/env python3
"""Append the unified Keen HTML CTA to Keen review files that lack it.

Local-only: reads frontmatter (affiliateUrl + title) and appends a CTA anchor
at EOF. Slug is derived from affiliateUrl; display name from title.
"""
import re
import os

BASE = r"C:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen"

# The 19 files confirmed missing the CTA (verified via grep).
TARGETS = [
    "arradaza.md",
    "c-garrett.md",
    "david7.md",
    "eye-of-pheobe-on-keen-review-2026.md",
    "flora-knows-all-keen-review-2026.md",
    "heeratheintuitive-on-keen-review-2026.md",
    "intuitive-guidance-with-lc-on-keen-review-2026.md",
    "krys-britton-on-keen-review-2026.md",
    "love-psychic-victoria-sands-keen-review-2026.md",
    "master-sher.md",
    "mystic-raj-on-keen-review-2026.md",
    "psychic-suzen-on-keen-review-2026.md",
    "psychicreader19622-raymond-keen-review-2026.md",
    "psychic-visions-by-atlantis-on-keen-review-2026.md",
    "readings-by-kelly777.md",
    "regina-jacks.md",
    "sophia-rose-light-on-keen-review-2026.md",
    "spirit-answers-on-keen-review-2026.md",
    "tarot-with-meg-on-keen-review-2026.md",
]

CTA_MARK = 'rel="nofollow sponsored"'


def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, ""
    end = text.find("\n---", 3)
    if end == -1:
        return {}, ""
    fm = text[3:end]
    body = text[end + 4:]
    data = {}
    for line in fm.splitlines():
        m = re.match(r'^([A-Za-z0-9_]+):\s*(.*)$', line)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            # strip surrounding quotes
            if (val.startswith('"') and val.endswith('"')) or \
               (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            data[key] = val
    return data, body


def main():
    for fn in TARGETS:
        path = os.path.join(BASE, fn)
        if not os.path.exists(path):
            print(f"MISSING FILE: {fn}")
            continue
        with open(path, "r", encoding="utf-8", newline="") as f:
            text = f.read()

        if CTA_MARK in text:
            print(f"SKIP (already has CTA): {fn}")
            continue

        data, _ = parse_frontmatter(text)
        aff = data.get("affiliateUrl", "")
        title = data.get("title", "")

        m = re.search(r'/go/([^/]+)/?$', aff.strip())
        if not m:
            print(f"NO SLUG from affiliateUrl in {fn}: {aff!r}")
            continue
        slug = m.group(1)

        # Display name = title up to " on Keen Review 2026"
        name = title.split(" on Keen Review 2026")[0].strip()
        if not name:
            name = slug

        cta = (f'<a href="/go/{slug}/" rel="nofollow sponsored" '
               f'target="_blank">Book {name} on Keen - '
               f'First 5 Minutes for $1</a>')

        # Ensure trailing newline, then one blank line + CTA + newline.
        content = text.rstrip("\n")
        new_text = content + "\n\n" + cta + "\n"

        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_text)

        print(f"ADDED: {fn}  -> /go/{slug}/  (Book {name} on Keen)")


if __name__ == "__main__":
    main()
