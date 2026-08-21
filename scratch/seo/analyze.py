import xml.etree.ElementTree as ET
import re
from collections import Counter

NS = {'x': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      'xhtml': 'http://www.w3.org/1999/xhtml'}

tree = ET.parse('sitemap-0.xml')
root = tree.getroot()
urls = []
for url in root.findall('x:url', NS):
    loc = url.find('x:loc', NS).text
    alts = [a.get('{http://www.w3.org/1999/xhtml}href') for a in url.findall('xhtml:link', NS)]
    langs = [a.get('{http://www.w3.org/1999/xhtml}hreflang') for a in url.findall('xhtml:link', NS)]
    urls.append((loc, alts, langs))

print(f"TOTAL URLs: {len(urls)}")

# 1. trailing slash consistency
no_slash = [u for u,l,a in urls if not u.endswith('/')]
print(f"\n[1] URLs NOT ending with '/': {len(no_slash)}")
for u in no_slash[:20]:
    print("   ", u)

# 2. filter violations: paths that config explicitly excludes
excluded_segments = ['/go/', '/out/', '/refer/', '/privacy/', '/terms/', '/astrology/', '/tools/',
                     '/es/privacidad/', '/es/terminos/', '/es/divulgacion/', '/content-manager', '_plantilla']
viol = [u for u,l,a in urls if any(seg in u for seg in excluded_segments)]
print(f"\n[2] URLs matching EXCLUDED segments (should NOT be in sitemap): {len(viol)}")
for u in viol:
    print("   ", u)

# 3. duplicate locs
c = Counter(u for u,l,a in urls)
dups = [k for k,v in c.items() if v>1]
print(f"\n[3] Duplicate <loc>: {len(dups)}")
for d in dups: print("   ", d)

# 4. uppercase / query / odd chars
odd = [u for u,l,a in urls if '?' in u or '#' in u or re.search(r'[A-Z]', u.split('//')[1].split('/')[0] if '//' in u else u)]
print(f"\n[4] URLs with query/hash/uppercase-host: {len(odd)}")
for u in odd[:20]: print("   ", u)

# 5. http (non-https)
http = [u for u,l,a in urls if u.startswith('http://')]
print(f"\n[5] Non-https URLs: {len(http)}")

# 6. hreflang reciprocal: every alt must also list back this url
print(f"\n[6] hreflang reciprocal check (sampling):")
issues = 0
for loc, alts, langs in urls:
    for alt in alts:
        # find the entry for alt
        match = [u for u,l,a in urls if u == alt]
        if not match:
            issues += 1
            if issues <= 15:
                print(f"   MISSING TARGET: {loc} -> {alt}")
print(f"   reciprocal target-missing count: {issues}")

# 7. path prefix distribution
from urllib.parse import urlparse
from collections import Counter as C
paths = [urlparse(u).path for u,l,a in urls]
pref = C()
for p in paths:
    parts = [x for x in p.split('/') if x]
    pref['/'+parts[0]+'/' if parts else '/'] += 1
print(f"\n[7] Top-level path distribution:")
for k,v in pref.most_common():
    print(f"   {k}: {v}")

# 8. /go/ present?
go = [u for u,l,a in urls if '/go/' in u]
print(f"\n[8] /go/ links in sitemap: {len(go)}")
