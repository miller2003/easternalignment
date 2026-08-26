import re, json, os, glob

HTML = r"C:\Users\samja\Desktop\解读师待做清单.html"
CONTENT = r"C:\Users\samja\Desktop\site\easternalignment\src\content\readers"
PLATMAP = {"kasamba": "kasamba", "keen": "keen", "purple garden": "purple-garden"}
SITE = "https://easternalignment.com"

def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())

# ---- 1. 站点读者: slug + 展示名 ----
site_file_set = set()
name_map = {}   # (plat, norm_name) -> slug
slug_platform = {}
for p in ["keen", "kasamba", "purple-garden"]:
    d = os.path.join(CONTENT, p)
    if not os.path.isdir(d):
        continue
    for f in glob.glob(os.path.join(d, "*.md")):
        slug = os.path.basename(f)[:-3]
        site_file_set.add(slug + ".md")
        slug_platform[slug] = p
        # 解析 frontmatter
        txt = open(f, encoding="utf-8", errors="ignore").read()
        fm = txt.split("---", 2)
        if len(fm) < 3:
            continue
        block = fm[1]
        pname = None; title = None
        for line in block.splitlines():
            if line.startswith("platformName:"):
                pname = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("title:") and title is None:
                title = line.split(":", 1)[1].strip().strip('"')
        # 展示名 = platformName 冒号后, 否则 title 去 " Review..."
        disp = pname.split(": ", 1)[1] if (pname and ": " in pname) else (title.split(" Review")[0] if title else slug)
        if disp:
            name_map[(p, norm(disp))] = slug
print(f"[站点] {len(site_file_set)} 个读者页; 展示名索引 {len(name_map)} 条")

# ---- 2. 解析 DATA ----
src = open(HTML, encoding="utf-8", errors="ignore").read()
i = src.find("const DATA = ") + len("const DATA = ")
end = src.find("};", i)
data = json.loads(src[i:end+1])

def mark_done(e):
    sf = (e.get("site_file") or "").strip()
    plat = PLATMAP.get((e.get("platform") or "").strip().lower(), "")
    nm = norm(e.get("name") or "")
    slug = None
    if sf in site_file_set:
        slug = sf[:-3]
    elif (plat, nm) in name_map:
        slug = name_map[(plat, nm)]
    if slug:
        e["done_on_site"] = "Yes"
        if not e.get("site_review"):
            e["site_review"] = f"{SITE}/reviews/{slug_platform.get(slug, plat)}/{slug}/"
        if not e.get("site_file"):
            e["site_file"] = slug + ".md"
        return True
    e["done_on_site"] = "No"
    return False

# roster 重算
for e in data["roster"]:
    mark_done(e)
roster_done = sum(1 for e in data["roster"] if e["done_on_site"] == "Yes")

# ---- 3. 重新生成机会榜 = 全名册未做, 按解读数降序前 200 ----
def rint(v):
    try:
        return int(re.sub(r"[^0-9]", "", str(v or "0")) or 0)
    except ValueError:
        return 0

not_done = [e for e in data["roster"] if e["done_on_site"] == "No"]
not_done.sort(key=lambda e: -rint(e.get("readings_count")))
top200 = not_done[:200]
# 规整为机会榜字段
opp_fields = ["global_rank","platform_rank","platform","name","profile_url",
              "readings_count","rating","price_usd","year_joined","score",
              "confidence","done_on_site","site_review","site_file"]
data["opportunity"] = [{k: e.get(k, "") for k in opp_fields} for e in top200]
print(f"[机会榜] 名册未做总数 {len(not_done)}; 重生前200 (最高解读数 {rint(top200[0].get('readings_count'))} -> 最低 {rint(top200[-1].get('readings_count'))})")
print(f"[名册] roster 已做: {roster_done}")

# 校验: 机会榜里不应再有已做
leak = [e for e in data["opportunity"] if e["done_on_site"] == "Yes"]
print(f"[校验] 机会榜泄漏已做: {len(leak)} (应为0)")

# ---- 4. 回写 ----
new_src = src[:i] + json.dumps(data, ensure_ascii=False) + src[end+1:]
open(HTML, "w", encoding="utf-8").write(new_src)
print("[写入] 已更新 HTML (roster done 重算 + opportunity 重生)")
