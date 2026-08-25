import os, re, json, glob

ROOT = "src/content/readers"
PLAT = {"kasamba":"kasamba","purple-garden":"purple-garden","keen":"keen"}

# specialty keyword buckets
BUCKETS = {
  "Love & Relationships": ["love","relationship","soulmate","infidelity","partner","marriage","ex back","cheating"],
  "Career & Work": ["career","job","work","business","promotion","interview"],
  "Money & Finance": ["money","finance","financial","wealth","abundance","debt"],
  "Tarot": ["tarot"],
  "Astrology": ["astrology","zodiac","birth chart","horoscope","natal"],
  "Mediumship": ["medium","mediumship","passed","loved one","spirit","afterlife"," grief","closure"],
  "Dreams": ["dream"],
  "Spiritual & Energy": ["spiritual","energy","chakra","aura","reiki","twin flame","psychic"],
}

def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3: return {}
    fm = parts[1]
    data = {}
    for line in fm.splitlines():
        m = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if m:
            key = m.group(1)
            val = m.group(2).strip().strip('"').strip("'")
            data[key] = val
    return data

stats = {p: {"n":0,"ratings":[],"prices":[],"text":""} for p in PLAT}

for p in PLAT:
    folder = os.path.join(ROOT, p)
    for fp in glob.glob(os.path.join(folder, "*.md")):
        with open(fp, "r", encoding="utf-8") as f:
            txt = f.read()
        fm = parse_frontmatter(txt)
        if not fm: continue
        stats[p]["n"] += 1
        if "rating" in fm:
            try: stats[p]["ratings"].append(float(fm["rating"]))
            except: pass
        # price extraction: find $X.XX/min
        for mm in re.findall(r"\$([0-9]+(?:\.[0-9]+)?)\s*/\s*min", txt):
            try: stats[p]["prices"].append(float(mm))
            except: pass
        # accumulate text for specialty scanning (bestFor, pros, highlights, verdict)
        blob = " ".join([fm.get(k,"") for k in ["bestFor","verdict"]])
        # include pros/highlights lines
        for sec in re.findall(r"(?:pros|highlights|cons):\n((?:[ \t]*-[^\n]*\n)+)", txt):
            blob += " " + sec
        stats[p]["text"] += " " + blob

out = {}
for p in PLAT:
    s = stats[p]
    n = s["n"]
    avg_rating = round(sum(s["ratings"])/len(s["ratings"]),2) if s["ratings"] else 0
    avg_price = round(sum(s["prices"])/len(s["prices"]),2) if s["prices"] else 0
    # specialty coverage
    cov = {}
    low = s["text"].lower()
    for cat, kws in BUCKETS.items():
        if any(kw in low for kw in kws):
            cov[cat] = True
    specialty_count = len(cov)
    out[p] = {
        "n": n,
        "avg_rating": avg_rating,
        "n_ratings": len(s["ratings"]),
        "avg_price": avg_price,
        "n_prices": len(s["prices"]),
        "specialty_count": specialty_count,
        "specialties": sorted(cov.keys()),
    }

print(json.dumps(out, indent=2))
