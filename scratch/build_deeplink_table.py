import os, re, glob, urllib.parse, csv

# ---- 1. find new articles (publishDate 2026-08-14) ----
root = "src/content/readers"
articles = []
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
            v = m.group(1).strip()
            if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                v = v[1:-1]
            return v
        if grab("publishDate") != "2026-08-14":
            continue
        plat = grab("platformName")
        name = plat.split(":", 1)[1].strip() if ":" in plat else plat
        aff = grab("affiliateUrl").strip("/").replace("go/", "")
        articles.append({"net": net, "slug": slug, "name": name, "affslug": aff})

# ---- 2. parse affiliateLinks.ts -> official profile URL ----
txt = open("src/data/affiliateLinks.ts", encoding="utf-8").read()
entries = {}
for m in re.finditer(r'"([^"]+)":\s*"((?:[^"\\]|\\.)*)"', txt):
    entries[m.group(1)] = m.group(2).replace('\\"', '"')

def official_url(affslug):
    v = entries.get(affslug, "")
    if not v:
        return ""
    um = re.search(r'[?&]url=([^&]+)', v)
    if um:
        return urllib.parse.unquote(um.group(1)).split("?")[0]
    # value itself is the profile (e.g. kasamba-cosmic-fusion)
    return v.split("?")[0]

# ---- 3. build rows + write CSV ----
net_label = {"keen": "Keen", "kasamba": "Kasamba", "purple-garden": "Purple Garden"}
rows = []
for i, a in enumerate(sorted(articles, key=lambda x: (x["net"], x["slug"])), 1):
    route = f'/reviews/{a["net"]}/{a["slug"]}/'
    off = official_url(a["affslug"])
    rows.append([i, net_label[a["net"]], route, a["name"], off, a["affslug"], ""])

out = "scratch/deeplink_table_2026-08-14.csv"
with open(out, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["序号", "平台", "文章地址(本站点路由)", "解读师", "官网链接(读者主页,待生成深层链接用)", "affiliateSlug(回填时对照用)", "深层链接(你在联盟后台生成后填这里)"])
    for r in rows:
        w.writerow(r)
print("Wrote", out, "with", len(rows), "rows")

# ---- 4. print markdown table ----
print("\n| 序号 | 平台 | 解读师 | 官网链接（读者主页） | 深层链接（待填） |")
print("| --- | --- | --- | --- | --- |")
for r in rows:
    print(f"| {r[0]} | {r[1]} | {r[3]} | {r[4]} | （待填） |")
