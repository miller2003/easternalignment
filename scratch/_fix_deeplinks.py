import json, re, os

ROOT = r"C:\Users\samja\Desktop\site\easternalignment"
TS = os.path.join(ROOT, "src", "data", "affiliateLinks.ts")
READERS = os.path.join(ROOT, "src", "content", "readers")
MAP = json.load(open(os.path.join(ROOT, "scratch", "_deploy_mapping.json"), encoding="utf-8"))

# wrong_key -> correct_key (the article's actual slug)
CORR = {
    "purple-garden-ayla-love-resolution": "purple-garden-ayla",
    "purple-garden-psychic-advisor-serena": "purple-garden-serena",
    "purple-garden-psychic-medium-chloe": "purple-garden-chloe",
    "purple-garden-empathic-intuitive-marcus": "purple-garden-marcus",
    "purple-garden-tarot-by-elena": "purple-garden-elena",
    "purple-garden-twin-flame-specialist-aria": "purple-garden-aria",
}

# A) Fix affiliateLinks.ts: drop wrong keys, point correct keys at deep links
lines = open(TS, encoding="utf-8").read().split("\n")
out = []
removed = []
updated = []
for line in lines:
    m = re.match(r'^(\s*)"([^"]+)":\s*"([^"]*)",?\s*$', line)
    if m:
        indent, k, v = m.group(1), m.group(2), m.group(3)
        if k in CORR:                       # wrong key -> drop line
            removed.append(k)
            continue
        if k in CORR.values():              # correct key -> update value
            wrong = [wk for wk, c in CORR.items() if c == k][0]
            final = MAP[wrong]["final"]
            line = f'{indent}"{k}": "{final}",'
            updated.append(k)
    out.append(line)
open(TS, "w", encoding="utf-8").write("\n".join(out))
print("Removed wrong keys:", removed)
print("Updated correct keys:", updated)

# B) Revert 4 PG generic articles to short existing keys
REV = {
    "psychic-medium-chloe": ("purple-garden-psychic-medium-chloe", "purple-garden-chloe"),
    "empathic-intuitive-marcus": ("purple-garden-empathic-intuitive-marcus", "purple-garden-marcus"),
    "tarot-by-elena": ("purple-garden-tarot-by-elena", "purple-garden-elena"),
    "twin-flame-specialist-aria": ("purple-garden-twin-flame-specialist-aria", "purple-garden-aria"),
}
for fn, (wrong, correct) in REV.items():
    fpath = os.path.join(READERS, "purple-garden", fn + ".md")
    t = open(fpath, encoding="utf-8").read()
    t = t.replace(f'affiliateUrl: "/go/{wrong}/"', f'affiliateUrl: "/go/{correct}/"')
    t = t.replace(f'affiliateUrl: /go/{wrong}/', f'affiliateUrl: /go/{correct}/')
    open(fpath, "w", encoding="utf-8").write(t)
    print("reverted article", fn, "->", correct)
