#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, re, glob, json, hashlib

ROOT = "src/content/readers"
PLATFORMS = ["keen", "kasamba", "purple-garden"]

# Red-flag phrases: ADMISSION that the central rating/stat is unverified or fabricated.
# (Deliberately excludes benign "sample size" / "sample a reading" / "for example".)
RED_FLAGS = [
    r"placeholder pending confirmation",
    r"representative \d",                       # "representative 4.8"
    r"wasn'?t capturable", r"not capturable", r"not been captur",
    r"rating approximate", r"approximate rating",
    r"pending confirmation",
    r"used a representative",
    r"\brating\b.{0,35}(should be verified|verify|confirm|approximate|placeholder|capturable|representative)",
    r"exact .{0,25}rating.{0,25}(verify|confirm|should be)",
    r"precise .{0,20}rating",
    r"\bTBD\b", r"\bTODO\b", r"lorem ipsum", r"your text here",
    r"\bXXX\b", r"FIXME", r"to be (added|written|filled)",
    r"insert (here|content|text)", r"\[insert",
]

def split_frontmatter(text):
    if not text.startswith("---"):
        return None, text
    # find second ---
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not m:
        return None, text
    return m.group(1), m.group(2)

def get_scalar(fm, key):
    # match key: value at line start, value is scalar (not | or [ or starting with -)
    pat = re.compile(r"^" + re.escape(key) + r":\s*(.*)$", re.M)
    for m in pat.finditer(fm):
        val = m.group(1).strip()
        if val and not val.startswith(("|", "[", "-")):
            # strip surrounding quotes
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                return val[1:-1]
            return val
    return None

def get_rating(fm):
    r = get_scalar(fm, "rating")
    if r is None:
        # try from customSchema ratingValue
        m = re.search(r'"ratingValue"\s*:\s*"([0-9.]+)"', fm)
        if m: return m.group(1)
        return None
    return r

def get_list(fm, key):
    # capture list items under key (lines starting with - )
    lines = fm.splitlines()
    items = []
    capture = False
    for ln in lines:
        if re.match(r"^" + re.escape(key) + r":\s*$", ln):
            capture = True
            continue
        if capture:
            if re.match(r"^\s*-\s+", ln):
                items.append(re.sub(r"^\s*-\s+", "", ln).strip())
            elif ln.strip() == "" or re.match(r"^\s+\S", ln):
                # continuation or blank within list
                if ln.strip() == "":
                    continue
                if items:
                    items[-1] += " " + ln.strip()
                continue
            else:
                break
    return items

def slug_from_path(p):
    return os.path.basename(p).replace(".md", "")

def exists_slug(platform, slug):
    return os.path.exists(os.path.join(ROOT, platform, slug + ".md"))

# gather all files
files = []
for plat in PLATFORMS:
    for p in sorted(glob.glob(os.path.join(ROOT, plat, "*.md"))):
        files.append((plat, p))

report = []
for plat, path in files:
    text = open(path, encoding="utf-8").read()
    fm, body = split_frontmatter(text)
    slug = slug_from_path(path)
    flags = []
    if fm is None:
        flags.append("NO_FRONTMATTER")
    else:
        title = get_scalar(fm, "title")
        desc = get_scalar(fm, "description")
        rating = get_rating(fm)
        verdict = get_scalar(fm, "verdict")
        aff = get_scalar(fm, "affiliateUrl")
        pricing = get_scalar(fm, "pricing")
        bestfor = get_scalar(fm, "bestFor")
        canonical = get_scalar(fm, "canonicalUrl")
        platform_fm = get_scalar(fm, "platform")

        # required scalar fields missing
        for fld, val in [("title", title), ("description", desc), ("rating", rating),
                         ("verdict", verdict), ("affiliateUrl", aff), ("pricing", pricing),
                         ("bestFor", bestfor)]:
            if val is None or val == "":
                flags.append(f"MISSING:{fld}")

        # platform mismatch
        if platform_fm and platform_fm != plat:
            flags.append(f"PLATFORM_MISMATCH(fm={platform_fm})")

        # canonical sanity
        if canonical:
            if slug not in canonical:
                flags.append(f"BAD_CANONICAL({canonical})")
            if plat not in canonical:
                flags.append(f"CANONICAL_WRONG_PLATFORM({canonical})")

        # affiliate url format
        if aff and not (aff.startswith("/go/") or aff.startswith("http")):
            flags.append(f"BAD_AFFILIATE_URL({aff})")

        # rating consistency: rating vs description vs schema vs verdict
        if rating:
            # check description mentions a rating number
            if desc:
                dm = re.search(r"(\d\.\d)-?star", desc)
                if dm and abs(float(dm.group(1)) - float(rating)) > 0.001:
                    flags.append(f"RATING_DESC_MISMATCH(desc={dm.group(1)},fm={rating})")
            # verdict mentions rating
            if verdict:
                vm = re.search(r"(\d\.\d)\s*(?:stars?|/5|out of)", verdict)
                if vm and abs(float(vm.group(1)) - float(rating)) > 0.001:
                    flags.append(f"RATING_VERDICT_MISMATCH(verdict={vm.group(1)},fm={rating})")

    # body checks
    body_clean = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", body)  #strip md links
    body_clean = re.sub(r"[#*>\-_]", " ", body_clean)
    words = len(re.findall(r"\b\w+\b", body_clean))
    if words < 250:
        flags.append(f"THIN_CONTENT({words}w)")

    # placeholder / admission phrases
    low = (body + " " + (verdict or "") + " " + (desc or "")).lower()
    hits = []
    for rf in RED_FLAGS:
        if re.search(rf, low):
            hits.append(rf)
    if hits:
        flags.append("UNVERIFIED_LANG(" + ";".join(sorted(set(hits))) + ")")

    # non-english (chinese) chars in body
    cjk = re.findall(r"[\u4e00-\u9fff]", body)
    if cjk:
        flags.append(f"CJK_CHARS({len(cjk)})")

    # internal links validity
    links = re.findall(r"\]\((/reviews/[^)]+)\)", body)
    for lnk in links:
        # hub / index link e.g. /reviews/purple-garden/ or /reviews/keen — legitimate
        if re.match(r"/reviews/[^/]+/?$", lnk):
            continue
        m = re.match(r"/reviews/([^/]+)/([^/]+)/?", lnk)
        if m:
            lp, ls = m.group(1), m.group(2)
            if lp != plat:
                flags.append(f"LINK_WRONG_PLATFORM({lnk})")
            elif not exists_slug(lp, ls):
                flags.append(f"BROKEN_LINK({lnk})")
        else:
            flags.append(f"ODD_LINK({lnk})")

    # duplicate-body detection (normalize: lowercase, remove the reader name tokens)
    norm = re.sub(r"\s+", " ", body_clean.lower()).strip()
    # remove numbers and the slug/title name fragments loosely
    report.append({
        "platform": plat, "slug": slug, "words": words,
        "rating": rating, "flags": flags, "norm_body": norm,
        "title": title,
    })

# duplicate detection across all
from collections import defaultdict
groups = defaultdict(list)
for r in report:
    # normalize further: strip very common stopwords won't help; use raw norm hash
    h = hashlib.md5(r["norm_body"].encode()).hexdigest()
    groups[h].append(r["platform"] + "/" + r["slug"])

dup_hashes = {h: v for h, v in groups.items() if len(v) > 1}
for r in report:
    h = hashlib.md5(r["norm_body"].encode()).hexdigest()
    if h in dup_hashes:
        r["flags"].append("DUPLICATE_BODY(" + " | ".join(dup_hashes[h]) + ")")

# near-duplicate: high overlap via shingling (cheap)
def shingles(s, k=8):
    toks = s.split()
    return set(tuple(toks[i:i+k]) for i in range(len(toks)-k+1))

near = []
for i in range(len(report)):
    for j in range(i+1, len(report)):
        a, b = report[i], report[j]
        if a["platform"] == b["platform"]:
            continue
        sa, sb = shingles(a["norm_body"]), shingles(b["norm_body"])
        if not sa or not sb:
            continue
        inter = len(sa & sb)
        union = len(sa | sb)
        if union and inter/union > 0.6:
            near.append((a["platform"]+"/"+a["slug"], b["platform"]+"/"+b["slug"], round(inter/union,2)))

# output
print("="*70)
print(f"TOTAL FILES: {len(report)}")
flagged = [r for r in report if r["flags"]]
print(f"FILES WITH FLAGS: {len(flagged)}")
print("="*70)
for plat in PLATFORMS:
    rows = [r for r in report if r["platform"] == plat]
    frows = [r for r in rows if r["flags"]]
    print(f"\n### {plat.upper()}  ({len(rows)} files, {len(frows)} flagged)")
    for r in frows:
        print(f"  - {r['slug']}  [{r['words']}w, rated {r['rating']}]")
        for f in r["flags"]:
            print(f"      ! {f}")

print("\n" + "="*70)
print("NEAR-DUPLICATE BODIES (cross-platform, jaccard>0.6):")
for a,b,s in near:
    print(f"  {a}  ~  {b}  ({s})")

# write json for downstream
with open("scratch/qa_review_report.json","w",encoding="utf-8") as f:
    json.dump({"report": report, "near": near}, f, ensure_ascii=False, indent=2)
print("\nWrote scratch/qa_review_report.json")
