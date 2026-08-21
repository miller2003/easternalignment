import xml.etree.ElementTree as ET
from collections import defaultdict

NS = {'x': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      'xhtml': 'http://www.w3.org/1999/xhtml'}
XLINK = '{http://www.w3.org/1999/xhtml}'

tree = ET.parse('sitemap-0.xml')
root = tree.getroot()
data = {}
for url in root.findall('x:url', NS):
    loc = url.find('x:loc', NS).text
    alts = {}
    for a in url.findall('xhtml:link', NS):
        hl = a.get('hreflang'); h = a.get('href')
        if hl and h: alts[hl] = h
    data[loc] = alts

locset = set(data.keys())
print(f"TOTAL: {len(data)}")

# Reciprocal check: for each page, each alternate must exist as a loc,
# and that loc must list back this page under some lang.
problems = []
for loc, alts in data.items():
    for hl, h in alts.items():
        if h not in locset:
            problems.append(("ALT_NOT_IN_SITEMAP", loc, hl, h))
            continue
        back = data[h]
        if loc not in back.values():
            problems.append(("NOT_RECIPROCATED", loc, hl, h, "back="+str(back)))

print(f"\nReciprocity problems: {len(problems)}")
for p in problems[:30]:
    print("  ", p)

# x-default presence
no_xdefault = [loc for loc,alts in data.items() if 'x-default' not in alts]
print(f"\nPages missing x-default: {len(no_xdefault)}")
for u in no_xdefault[:10]: print("  ", u)

# self-reference check: x-default should equal own loc for english-only
print(f"\nsample english-only page alternates:")
for loc in ['https://easternalignment.com/reviews/keen/', 'https://easternalignment.com/guides/']:
    if loc in data: print("  ", loc, "->", data[loc])
