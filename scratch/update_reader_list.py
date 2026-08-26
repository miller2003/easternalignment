import re, json, os, glob

HTML = r"C:\Users\samja\Desktop\解读师待做清单.html"
CONTENT = r"C:\Users\samja\Desktop\site\easternalignment\src\content\readers"
GSC = r"C:\Users\samja\Desktop\gsc"
PLAT = {"keen": "keen", "kasamba": "kasamba", "purple-garden": "purple-garden"}
SITE = "https://easternalignment.com"

# ---- 1. 网站实际读者清单 (slug -> platform) ----
site_slugs = {}   # slug -> platform
for p in PLAT:
    d = os.path.join(CONTENT, p)
    if os.path.isdir(d):
        for f in glob.glob(os.path.join(d, "*.md")):
            slug = os.path.basename(f)[:-3]
            site_slugs[slug] = p
site_file_set = {s + ".md" for s in site_slugs}
print(f"[站点] 实际读者页: {len(site_slugs)} 个 (keen {sum(1 for v in site_slugs.values() if v=='keen')}, "
      f"kasamba {sum(1 for v in site_slugs.values() if v=='kasamba')}, "
      f"pg {sum(1 for v in site_slugs.values() if v=='purple-garden')})")

# ---- 2. GSC 已曝光读者 slug 集合 ----
exposed = set()
with open(os.path.join(GSC, "网页.csv"), encoding="utf-8-sig", newline="") as fh:
    for row in __import__("csv").DictReader(fh):
        u = row.get("排名靠前的网页", "")
        m = re.match(r"https?://easternalignment\.com/reviews/([^/]+)/([^/]+)/?$", u)
        if m and m.group(1) in PLAT:
            exposed.add((m.group(1), m.group(2)))
print(f"[GSC] 已曝光读者页: {len(exposed)} 个")

# ---- 3. 解析 DATA ----
src = open(HTML, encoding="utf-8", errors="ignore").read()
i = src.find("const DATA = ") + len("const DATA = ")
end = src.find("};", i)
data = json.loads(src[i:end+1])

# roster/opp 里 site_file -> 记录, 用于回填热度 & 匹配
def recomp(entry):
    sf = entry.get("site_file", "") or ""
    done = "Yes" if sf in site_file_set else "No"
    if done == "Yes" and not entry.get("site_review"):
        p = PLAT.get((entry.get("platform") or "").lower(), "")
        if p and sf:
            entry["site_review"] = f"{SITE}/reviews/{p}/{sf[:-3]}/"
    entry["done_on_site"] = done
    return done

cur_yes = sum(1 for e in data["roster"] if e.get("done_on_site") == "Yes")
for e in data["roster"]:
    recomp(e)
for e in data.get("opportunity", []):
    recomp(e)
new_yes = sum(1 for e in data["roster"] if e.get("done_on_site") == "Yes")
print(f"[名单] roster 已做: 原 {cur_yes} -> 重算 {new_yes}")

# ---- 4. 已做 + 零曝光 + 高热度 ----
rec_by_file = {e["site_file"]: e for e in data["roster"] if e.get("site_file")}
rec_by_file.update({e["site_file"]: e for e in data.get("opportunity", []) if e.get("site_file")})

rows = []
keen_gap = []
for slug, p in site_slugs.items():
    if (p, slug) in exposed:
        continue  # 有曝光，跳过
    sf = slug + ".md"
    rec = rec_by_file.get(sf)
    url = f"{SITE}/reviews/{p}/{slug}/"
    if rec:
        try:
            heat = int(rec.get("readings_count") or 0)
        except ValueError:
            heat = 0
        try:
            grank = int(rec.get("global_rank") or 99999)
        except ValueError:
            grank = 99999
        name = rec.get("name") or slug
        rows.append((heat, grank, p, name, slug, url))
    else:
        keen_gap.append((p, slug, url))  # 在站点但不在名册(Keen样本缺口)

rows.sort(key=lambda r: (-r[0], r[1]))
print(f"\n[结果] 已做 + 零曝光 读者: {len(rows)} 个 (有热度数据) + {len(keen_gap)} 个 (Keen样本缺口,名册无热度)")
print("\n=== 高热度但零曝光 · 供 GSC 手动提交 (按解读数降序) ===")
for heat, grank, p, name, slug, url in rows:
    print(f"  {heat:>7} 解读 | 全球#{grank:>5} | {p:12s} | {name:28s} | {url}")

if keen_gap:
    print(f"\n=== Keen 样本缺口(在站点/零曝光/名册无热度数据) {len(keen_gap)} 个 ===")
    for p, slug, url in keen_gap:
        print(f"  {p:6s} | {slug:40s} | {url}")

# ---- 5. 回写 HTML ----
new_src = src[:i] + json.dumps(data, ensure_ascii=False) + src[end+1:]
with open(HTML, "w", encoding="utf-8") as fh:
    fh.write(new_src)
print(f"\n[写入] 已更新 {HTML} (done_on_site 以站点 .md 为准重算)")
