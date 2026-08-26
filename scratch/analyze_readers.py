import csv, os, glob, re
from collections import defaultdict

GSC = r"C:\Users\samja\Desktop\gsc"
CONTENT = r"C:\Users\samja\Desktop\site\easternalignment\src\content\readers"
PLATFORMS = ["keen", "kasamba", "purple-garden"]

# ---- 1. 全量读者清单（来自 content/readers/*/*.md）----
full = defaultdict(set)  # platform -> set of slugs
for p in PLATFORMS:
    d = os.path.join(CONTENT, p)
    if not os.path.isdir(d):
        continue
    for f in glob.glob(os.path.join(d, "*.md")):
        slug = os.path.basename(f)[:-3]
        full[p].add(slug)
all_full = set()
for p, s in full.items():
    all_full |= {(p, x) for x in s}

# ---- 2. GSC 网页.csv 中已排名的读者页 ----
ranked = []  # list of dicts
with open(os.path.join(GSC, "网页.csv"), encoding="utf-8-sig", newline="") as fh:
    r = csv.DictReader(fh)
    for row in r:
        url = row.get("排名靠前的网页", "")
        m = re.match(r"https?://easternalignment\.com/reviews/([^/]+)/([^/]+)/?$", url)
        if not m:
            continue
        plat, slug = m.group(1), m.group(2)
        if plat not in PLATFORMS:
            continue
        # hub 页 slug 为空的情况已在正则排除（hub 是 /reviews/keen/ 末尾有/但无slug）
        try:
            clicks = int(row["点击次数"])
            impr = int(row["展示"])
            pos = float(row["排名"])
        except (ValueError, KeyError):
            continue
        ranked.append({"platform": plat, "slug": slug, "clicks": clicks,
                       "impr": impr, "pos": pos, "url": url})

ranked_keys = {(x["platform"], x["slug"]) for x in ranked}
# 只在读者集合里匹配的（排除 hub / 其他）
ranked_readers = [x for x in ranked if (x["platform"], x["slug"]) in all_full]

# ---- 3. 未被排名的全量读者 ----
not_ranked = all_full - ranked_keys

# ---- 4. 报告 ----
print("="*70)
print("全量读者页（content/readers/*.md）")
print("="*70)
for p in PLATFORMS:
    print(f"  {p:14s}: {len(full[p])}")
print(f"  {'TOTAL':14s}: {len(all_full)}")

print("\n" + "="*70)
print("GSC 网页.csv 中匹配的读者页（已排名 / 有展示）")
print("="*70)
by_plat = defaultdict(int)
for x in ranked_readers:
    by_plat[x["platform"]] += 1
for p in PLATFORMS:
    print(f"  {p:14s}: {by_plat[p]}")
print(f"  {'TOTAL':14s}: {len(ranked_readers)}")

print("\n" + "="*70)
print("未被排名的读者页（全量 - GSC 有展示）")
print("="*70)
nr_by_plat = defaultdict(int)
for (p, s) in not_ranked:
    nr_by_plat[p] += 1
for p in PLATFORMS:
    print(f"  {p:14s}: {nr_by_plat[p]}")
print(f"  {'TOTAL':14s}: {len(not_ranked)}")
print(f"\n  排名覆盖率: {len(ranked_readers)}/{len(all_full)} = {len(ranked_readers)/max(len(all_full),1)*100:.1f}%")

print("\n" + "="*70)
print("TOP 15 读者页（按展示量）")
print("="*70)
for x in sorted(ranked_readers, key=lambda r: -r["impr"])[:15]:
    print(f"  {x['impr']:5d} 展示 | CTR {x['pos']:5.1f}位 | {x['clicks']:2d}点击 | {x['platform']}/{x['slug']}")

print("\n" + "="*70)
print("TOP 10 读者页（按 CTR，展示>=10 才看，避免小样本失真）")
print("="*70)
elig = [x for x in ranked_readers if x["impr"] >= 10]
for x in sorted(elig, key=lambda r: -r["clicks"]/max(r["impr"],1))[:10]:
    ctr = x["clicks"]/x["impr"]*100
    print(f"  CTR {ctr:5.1f}% | {x['impr']:4d}展示 | {x['pos']:5.1f}位 | {x['platform']}/{x['slug']}")

print("\n" + "="*70)
print("TOP 10 读者页（按点击数）")
print("="*70)
for x in sorted(ranked_readers, key=lambda r: -r["clicks"])[:10]:
    print(f"  {x['clicks']:3d}点击 | {x['impr']:5d}展示 | {x['pos']:5.1f}位 | {x['platform']}/{x['slug']}")
