import json, re

TS = r'C:/Users/samja/Desktop/site/easternalignment/src/data/affiliateLinks.ts'
DUMP = r'C:/Users/samja/Desktop/site/easternalignment/scratch/_xlsx_dump.json'

rows = json.load(open(DUMP, encoding='utf-8'))
content = open(TS, encoding='utf-8').read()

# existing keys in TS
existing = set(re.findall(r'^\s*"([a-zA-Z0-9_-]+)":', content, re.M))

# PG special slugs whose TS key is the short form, not purple-garden-<slug>
PG_SHORT = {
    'ayla-love-resolution': 'ayla',
    'empathic-intuitive-marcus': 'marcus',
    'psychic-medium-chloe': 'chloe',
    'tarot-by-elena': 'elena',
    'twin-flame-specialist-aria': 'aria',
    'psychic-advisor-serena': 'serena',
}

def key_for(r):
    p = r['platform']; slug = r['slug']
    if p == 'Kasamba':
        return slug  # already "kasamba-xxx"
    if p == 'Purple Garden':
        if slug in PG_SHORT:
            return 'purple-garden-' + PG_SHORT[slug]
        return 'purple-garden-' + slug
    if p == 'Keen':
        return 'keen-' + slug
    raise ValueError(p)

mapping = {}   # key -> deep (verbatim)
unmatched = []
for r in rows:
    k = key_for(r)
    if k in existing:
        mapping[k] = r['deep']
    else:
        unmatched.append((r['platform'], r['slug'], k))

if unmatched:
    print("!!! UNMATCHED (not in TS):", unmatched)
    raise SystemExit(1)

print(f"Matched {len(mapping)} of {len(rows)} sheet rows to existing TS keys.")

# Replace values verbatim. DEEP has no double quotes, so safe to wrap.
def repl(m):
    k = m.group(1)
    if k in mapping:
        return f'"{k}": "{mapping[k]}"'
    return m.group(0)

new_content = re.sub(r'"([a-zA-Z0-9_-]+)":\s*"[^"]*"', repl, content)

open(TS, 'w', encoding='utf-8').write(new_content)
print("Wrote", TS)

# quick sanity
kc = len(re.findall(r'^\s*"([a-zA-Z0-9_-]+)":', new_content, re.M))
print("Total keys now:", kc)
print("Keen 209 count:", new_content.count('offer_id=209'))
print("Keen 221 count:", new_content.count('offer_id=221'))
print("cosmic-fusion line:", [l.strip() for l in new_content.splitlines() if 'cosmic-fusion' in l])
