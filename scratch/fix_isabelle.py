#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix kasamba-love-specialist-isabelle deep link in affiliateLinks.ts."""
import re

TS = "C:/Users/samja/Desktop/site/easternalignment/src/data/affiliateLinks.ts"
CORRECTED = ("https://bargestech.go2cloud.org/aff_c?offer_id=191&aff_id=2326"
             "&url=https%3A%2F%2Fwww.kasamba.com%2Fpsychic%2Flove-specialist-isabelle%2F"
             "%3Fclickid%3D{transaction_id}%26utm_content%3Dsubid2%26utm_medium%3D"
             "affiliation_tune%26utm_source%3D{affiliate_id}-{affiliate_name}")

with open(TS, encoding="utf-8") as f:
    lines = f.readlines()

changed = False
for i, line in enumerate(lines):
    if line.startswith('  "kasamba-love-specialist-isabelle":'):
        m = re.search(r'"(https://[^"]+)"', line)
        cur = m.group(1) if m else ""
        if cur == CORRECTED:
            print("NO-OP: current affiliateLinks.ts value already equals the corrected deep link.")
        else:
            print("DIFFERENT -> updating.")
            print("  current :", cur[:90], "...")
            print("  corrected:", CORRECTED[:90], "...")
            lines[i] = f'  "kasamba-love-specialist-isabelle": "{CORRECTED}",\n'
            changed = True
        break
else:
    print("SLUG NOT FOUND!")

if changed:
    with open(TS, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("File written.")
