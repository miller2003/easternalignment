import os, re, glob

root = "src/content/readers"
rows = []
for net in ["keen", "kasamba", "purple-garden"]:
    for path in glob.glob(f"{root}/{net}/*.md"):
        slug = os.path.basename(path)[:-3]
        txt = open(path, encoding="utf-8").read()
        fm = re.search(r"^---\s*\n(.*?)\n---", txt, re.S)
        if not fm:
            continue
        block = fm.group(1)
        def grab(key):
            m = re.search(r"^" + key + r":\s*(.*)$", block, re.M)
            if not m:
                return ""
            val = m.group(1).strip()
            if (val.startswith("'") and val.endswith("'")) or (val.startswith('"') and val.endswith('"')):
                val = val[1:-1]
            return val
        pub = grab("publishDate")
        upd = grab("updatedDate")
        plat = grab("platformName")
        aff = grab("affiliateUrl")
        title = grab("title")
        rows.append({"net": net, "slug": slug, "name": plat, "pub": pub, "upd": upd, "aff": aff, "title": title})

new = [r for r in rows if r["pub"] == "2026-08-14"]
print("TOTAL reader files:", len(rows))
print("New today (publishDate=2026-08-14):", len(new))
print()
for r in sorted(new, key=lambda x: (x["net"], x["slug"])):
    print(f'{r["net"]:14} | {r["slug"]:42} | aff={r["aff"]} | name={r["name"]}')
