import re, glob, os, json

BASE = r"C:\Users\samja\Desktop\site\easternalignment\scratch\_fx_kas_pages"
files = sorted(glob.glob(os.path.join(BASE, "*-kasamba-review.html")))

def num(s):
    if s is None: return None
    s = s.replace(",", "").strip()
    try: return int(float(s))
    except: return None

rows = []
for f in files:
    slug = os.path.basename(f).replace("-kasamba-review.html", "")
    html = open(f, encoding="utf-8", errors="ignore").read()
    low = html.lower()

    # ---- name ----
    name = None
    m = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', html, re.I)
    if m: name = m.group(1)
    if not name:
        m = re.search(r'<title>([^<]+)</title>', html, re.I)
        if m: name = m.group(1)
    if name:
        name = re.sub(r"\s*[-|–]\s*Kasamba.*$", "", name, flags=re.I).strip()
        name = name.replace("Kasamba", "").strip()

    # ---- readings (bidirectional + K suffix) ----
    readings = None
    m = re.search(r'([\d]{1,3}(?:,\d{3})+|\d{4,6})\s*(?:total\s+)?readings', low)
    if m: readings = num(m.group(1))
    if readings is None:
        m = re.search(r'readings?[^<>\d]{0,30}?([\d]{1,3}(?:,\d{3})+|\d{4,6})', low)
        if m: readings = num(m.group(1))
    if readings is None:
        m = re.search(r'([\d.]+)\s*[kK]\s*readings', low)
        if m: readings = num(float(m.group(1))*1000)

    # ---- rating (JSON-LD aggregateRating or 'x.x stars' / 'out of 5') ----
    rating = None
    m = re.search(r'"ratingValue"\s*:\s*"?([\d.]+)', html)
    if m: rating = float(m.group(1))
    if rating is None:
        m = re.search(r'(\d\.\d)\s*out of 5', low)
        if m: rating = float(m.group(1))
    if rating is None:
        m = re.search(r'(\d\.\d)\s*stars?', low)
        if m: rating = float(m.group(1))
    if rating is None:
        # generic first d.d within 12 chars of 'rating'
        m = re.search(r'rating[^<>\d]{0,20}?(\d\.\d)', low)
        if m: rating = float(m.group(1))

    # ---- price (look for $X.XX near 'min') ----
    price = None
    for m in re.finditer(r'\$\s*([\d]+(?:\.\d{1,2})?)\s*(?:/|\s*per\s+)?min', low):
        price = m.group(1); break
    if price is None:
        for m in re.finditer(r'\$\s*([\d]+(?:\.\d{1,2})?)', low):
            # skip obviously-wrong huge numbers like $50 for a package
            v = float(m.group(1))
            if 0 < v <= 30:
                price = m.group(1); break

    # ---- snippet / review ----
    snip = None
    m = re.search(r'"reviewBody"\s*:\s*"([^"]{40,260})"', html)
    if m: snip = m.group(1)
    if not snip:
        m = re.search(r'<p[^>]*>([^<]{50,240})</p>', html)
        if m: snip = m.group(1)

    rows.append({"slug": slug, "name": name, "readings": readings,
                 "rating": rating, "price": price, "snippet": (snip[:150] if snip else None)})

rows.sort(key=lambda r: (r["readings"] or 0), reverse=True)
print("=== RANK BY READINGS (popularity proxy) ===")
for i, r in enumerate(rows, 1):
    print(f"{i:2}. {r['slug']:30} name={str(r['name'])[:24]:24} readings={str(r['readings']):>9} rating={r['rating']} price=${r['price']}")
print("\n=== JSON ===")
print(json.dumps(rows, ensure_ascii=False, indent=2))
