#!/usr/bin/env python3
"""Cleanup pass over the 19 Keen files after CTA insertion:
1. Remove pre-existing markdown CTA lines (standalone [Book ...](/go/slug/)).
2. Fix stray leading single quote in HTML CTA anchor text (">Book 'Name" -> ">Book Name").

Local-only file I/O.
"""
import re
import os

BASE = r"C:\Users\samja\Desktop\site\easternalignment\src\content\readers\keen"

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

MD_CTA = re.compile(r'^\[Book .*?\]\(/go/[^/]+/?\)$')
HTML_FIX = ' rel="nofollow sponsored" target="_blank">Book \''
HTML_FIXED = ' rel="nofollow sponsored" target="_blank">Book '


def main():
    for fn in TARGETS:
        path = os.path.join(BASE, fn)
        with open(path, "r", encoding="utf-8", newline="") as f:
            lines = f.read().split("\n")

        out = []
        removed = 0
        for line in lines:
            if MD_CTA.match(line.strip()):
                removed += 1
                continue
            if HTML_FIX in line:
                line = line.replace(HTML_FIX, HTML_FIXED)
            out.append(line)

        text = "\n".join(out)
        # collapse 3+ consecutive blank lines into 2 (cosmetic after removal)
        text = re.sub(r"\n{3,}", "\n\n", text)
        if not text.endswith("\n"):
            text += "\n"

        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)

        print(f"{fn}: removed {removed} markdown-CTA line(s); stray-quote fixed={'yes' if HTML_FIX not in text else 'no'}")


if __name__ == "__main__":
    main()
