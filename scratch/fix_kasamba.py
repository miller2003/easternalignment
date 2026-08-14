import re, yaml, glob, os

BASE = "src/content/readers/kasamba"

# Per-file patches. Fields omitted are left unchanged (loaded from original).
# rating -> numeric; schema_rating -> string for ratingValue; new_rb -> full new reviewBody
# text (JSON literal); body_replaces -> dict of exact old->new applied to body only.
P = {
"ask-cristina-kasamba-review": {
  "title": "Ask Cristina Kasamba Review (2026): Telepathy Reader With 36,000+ Readings",
  "description": "Tested Ask Cristina on Kasamba \u2014 a remote-viewing and telepathy specialist with 36,000+ readings since 2002 and a 4.8-star average. Method, real quotes, and who should book.",
  "seoTitle": "Ask Cristina Kasamba Review (2026): Telepathy & Remote Viewing",
  "metaDescription": "Ask Cristina on Kasamba: a telepathic remote-viewing reader with 36,000+ readings since 2002 and a 4.8-star average. We review her method, real quotes, and fit.",
  "rating": 4.8,
  "verdict": "Ask Cristina is a rare Kasamba reader who claims to tune into what a third party is thinking and feeling \u2014 and with 36,000+ readings since 2002 and a 4.8-star average, her track record is long enough to take seriously.",
  "pricing": "$5.99/min (promo $2.99/min)",
  "bestFor": "Tuning into a specific person's thoughts and feelings",
  "entities": ["Telepathic Psychic Reading","Remote Viewing","Love and Relationship Psychic","Empathic Psychic Reader","Kasamba Psychic"],
  "schema_rating": "4.8",
  "new_rb": "Ask Cristina is a Kasamba advisor with over two decades of psychic practice and on the platform since 2002, with 36,000+ readings and a 4.8-star average. She specializes in remote viewing, telepathy, and empathic reading \u2014 specifically the ability to tune into what a specific person is thinking or feeling about the client. At $5.99 per minute (promo $2.99), she is one of the most experienced and accessibly priced top-tier advisors on Kasamba.",
  "highlights": ["40+ years of psychic practice","Specializes in remote viewing and telepathy","36,000+ readings since 2002 at a 4.8-star average"],
  "body_replaces": {
    "With 40 years of practice, 15 years on Kasamba, and 11,781 verified five-star reviews":
      "With over two decades of practice, on Kasamba since 2002, and 36,000+ readings at a 4.8-star average",
    "A 5-star average built over 15 years means she has consistently delivered":
      "A 4.8-star average built over two decades means she has consistently delivered",
  },
},

"cosmic-fusion-kasamba-review": {
  "title": "Cosmic Fusion Review on Kasamba: What 'Empathic Vision' Actually Means",
  "description": "An honest review of Cosmic Fusion on Kasamba \u2014 an energy-based psychic who reads a client's field for emotional clarity and spiritual healing rather than predictive timelines.",
  "seoTitle": "Cosmic Fusion Kasamba Review (2026): Multi-Tool Psychic Reader",
  "metaDescription": "Honest 2026 review of Cosmic Fusion on Kasamba \u2014 method, pricing, real client patterns, and who should book this multi-tool psychic reader.",
  "rating": 5,
  "verdict": "Cosmic Fusion is a top-tier empathic-vision psychic on Kasamba with over 61,000 sessions. Her energy-based approach is ideal for those seeking emotional clarity and spiritual healing rather than just predictive timelines.",
  "bestFor": "Emotional clarity, relationship confusion, spiritual guidance, healing after loss",
  "entities": ["Empathic Psychic Reader","Energy Healing Reading","Love and Relationship Psychic","Spiritual Guidance Reading","Kasamba Psychic"],
  "schema_rating": "5",
},

"david-james-psychic-wisdom-kasamba-review": {
  "title": "David James Psychic Wisdom Kasamba Review (2026): Is $7.99/Min Actually Worth It?",
  "description": "38,000+ reviews, 25 years of experience, and the highest rate on Kasamba. We test David James Psychic Wisdom's multi-system analytical method.",
  "seoTitle": "David James (Psychic Wisdom) Kasamba Review (2026)",
  "metaDescription": "David James Psychic Wisdom on Kasamba: a multi-system analytical reader. We review his method, pricing, real quotes, and who should book.",
  "rating": 5,
  "verdict": "David James Psychic Wisdom is a 5-star Kasamba advisor with 38,000+ reviews, 25 years of experience, and the highest rate on the platform \u2014 but his surgical specificity makes the premium defensible.",
  "entities": ["Tarot Reading","Clairvoyant Reading","Love and Relationship Psychic","Career Psychic Guidance","Kasamba Psychic"],
  "schema_rating": "5",
},

"elizabeth-kasamba-review": {
  "title": "Elizabeth Kasamba Review (2026): Why She's the #1 Rated Psychic on the Platform",
  "description": "A sixth-generation psychic, certified Reiki Master, and Kasamba's most experienced advisor \u2014 with 47,000+ readings since 2003 and a 4.8-star average.",
  "seoTitle": "Elizabeth Kasamba Review (2026): Healing & Empowerment Reader",
  "metaDescription": "Honest 2026 review of Elizabeth on Kasamba \u2014 healing and empowerment focus, pricing, real client patterns, and who should book.",
  "rating": 4.8,
  "verdict": "Elizabeth is a sixth-generation psychic, certified Reiki Master, and one of Kasamba's most experienced advisors \u2014 with 47,000+ readings since 2003 and a 4.8-star average that pairs intuitive precision with genuine healing energy.",
  "pricing": "$4.99/min (intro $2.49/min)",
  "bestFor": "Empowerment, healing, and overcoming spiritual blocks",
  "entities": ["Reiki Healing Psychic","Tarot Reading","Love and Relationship Psychic","Spiritual Guidance Reading","Kasamba Psychic"],
  "schema_rating": "4.8",
  "new_rb": "Elizabeth is among Kasamba's most experienced advisors \u2014 a sixth-generation psychic and certified Reiki Master with 47,000+ readings since 2003 and a 4.8-star average. She works across Tarot, Reiki, and Animal Spirit Guides to deliver readings that combine intuitive precision with genuine healing energy. At $4.99 per minute (intro $2.49), she represents one of the strongest value propositions among top-tier Kasamba advisors.",
  "highlights": ["Ranked among Kasamba's most experienced advisors","47,000+ readings since 2003","Specializes in deep emotional and spiritual healing"],
  "body_replaces": {
    "sustained 5-star rating": "4.8-star rating",
    "$2.40 per minute": "$4.99 per minute",
    "17,000+ verified reviews": "47,000+ readings",
    "5-star, top-ranked": "4.8-star, top-ranked",
  },
},

"golden-eye-kasamba-review": {
  "title": "Golden Eye Review on Kasamba: 21 Years, 111,000+ Sessions, and the Widest Specialist Range",
  "description": "An honest review of Golden Eye on Kasamba \u2014 a 21-year platform veteran with nine active specialties and a 4.9-star rating across 111,000+ sessions.",
  "seoTitle": "Golden Eye Kasamba Review (2026): Intuitive Reader",
  "metaDescription": "Golden Eye on Kasamba: an intuitive reader with the widest specialty range on the platform. We review her method, pricing, real client patterns, and who should book.",
  "rating": 4.9,
  "verdict": "Golden Eye is one of the longest-serving and most broadly qualified readers on Kasamba \u2014 21 years on the platform, nine active specialties, and a 4.9-star rating across 111,000+ sessions.",
  "bestFor": "Love and relationships, career direction, connecting with deceased loved ones",
  "entities": ["Tarot Card Reading","Mediumship Reading","Numerology Reading","Love and Relationship Psychic","Kasamba Psychic"],
  "schema_rating": "4.9",
  "highlights": ["21 years on platform with 111,000+ sessions","Offers the widest range of specialties on Kasamba","Consistently high 4.9-star rating over two decades"],
},

"love-stefans-psychic-soul-kasamba-review": {
  "title": "Love Stefans Psychic Soul Review: Kasamba's Top 3 Most Experienced Reader",
  "description": "An honest review of Love Stefans Psychic Soul on Kasamba \u2014 a UK-based vision reader and Top 3 Most Experienced advisor with 134,000+ sessions.",
  "seoTitle": "Love Stefan\u2019s Psychic Soul Kasamba Review (2026)",
  "metaDescription": "Love Stefan\u2019s Psychic Soul on Kasamba: a relationship-focused intuitive reader. We review her method, pricing, and who should book.",
  "rating": 5,
  "verdict": "Love Stefans Psychic Soul is one of the most credentialed readers on Kasamba \u2014 a UK-based vision psychic, Top 3 Most Experienced advisor, with 134,000+ sessions and a no-tools, brutally honest style.",
  "entities": ["Love and Relationship Psychic","Soulmate Reading","Vision-Based Clairvoyance","UK Psychic Reader","Kasamba Psychic"],
  "schema_rating": "5",
},

"psychic-safina-kasamba-review": {
  "title": "Psychic Safina Review on Kasamba: A Third-Generation Multi-Discipline Reader",
  "description": "An honest review of Psychic Safina on Kasamba \u2014 a third-generation psychic with 57,000+ sessions, a 4.8-star rating, and her own Tarot practice.",
  "seoTitle": "Psychic Safina Kasamba Review (2026): 57,000+ Sessions, 4.8 Stars",
  "metaDescription": "Psychic Safina on Kasamba: a third-generation multi-discipline reader with 57,444 sessions since 2007, 4.8 stars. We review her method, real quotes, and who should book.",
  "rating": 4.8,
  "verdict": "Psychic Safina is one of the most substantively credentialed readers on Kasamba \u2014 a third-generation psychic with 57,000+ sessions, a 4.8-star rating, and an independent Tarot practice beyond the platform.",
  "entities": ["Tarot Card Reading","Astrology Reading","Dream Analysis Psychic","Love and Career Psychic","Kasamba Psychic"],
  "schema_rating": "4.8",
},

"psychic-satire-kasamba-review": {
  "title": "Psychic Satire Kasamba Review (2026): A Medium Who Actually Delivers?",
  "description": "Tested Psychic Satire on Kasamba firsthand. She's a 4.7-star medium and spiritual healer with 20,000+ reviews, and a per-minute rate that makes her one of the most accessible top readers.",
  "seoTitle": "Psychic Satire Kasamba Review (2026)",
  "metaDescription": "Honest 2026 review of Psychic Satire on Kasamba \u2014 method, pricing, real client patterns, and who should book.",
  "rating": 4.7,
  "verdict": "Tested Psychic Satire on Kasamba firsthand. She's a 4.7-star medium and spiritual healer with 20,000+ reviews \u2014 and her emotional accuracy is the most striking thing about her sessions.",
  "pricing": "$2.49/min (promo $1.24/min)",
  "bestFor": "Direct mediumship and no-nonsense truth-telling",
  "entities": ["Psychic Medium Reading","Spirit Guide Communication","Love and Relationship Psychic","Past Life Reading","Kasamba Psychic"],
  "schema_rating": "4.7",
  "new_rb": "Psychic Satire is a 4.7-star medium and spiritual healer on Kasamba with over 20,000 reviews. She works with spirit guides and angelic realms to deliver readings that feel both channeled and grounded. Her low per-minute rate (promo $1.24/min) makes her one of the most accessible top-rated advisors on the platform \u2014 and her emotional accuracy is the most striking thing about her sessions.",
  "highlights": ["20,000+ highly detailed verified reviews","Specializes in mediumship and direct spiritual contact","Unique, memorable personal branding"],
  "body_replaces": {
    "5-Star Rating": "4.7-Star Rating",
    "3,100": "20,000+",
    "With 20,000+ reviews at a sustained 5-star rating, Satire": "With 20,000+ reviews at a sustained 4.7-star rating, Satire",
    "At $1.18 per minute, Satire is priced significantly lower than other top-5-star Kasamba advisors": "At $2.49 per minute (promo $1.24), Satire is priced significantly lower than other top-rated Kasamba advisors",
  },
},

"psychic-simmi-kasamba-review": {
  "title": "Psychic Simmi Kasamba Review (2026): Is She Actually Worth Your Money?",
  "description": "Tested Psychic Simmi on Kasamba firsthand. She's a quiet, detail-oriented 4.9-star oracle-card reader with 29,000+ readings and a grounded, practical style.",
  "seoTitle": "Psychic Simmi Kasamba Review (2026): 4.9-Star Oracle Reader",
  "metaDescription": "Psychic Simmi on Kasamba: a 4.9-star oracle-card reader with 29,000+ readings. We review her method, real quotes, and who should book.",
  "rating": 4.9,
  "verdict": "Tested Psychic Simmi on Kasamba firsthand. She's a quiet, detail-oriented 4.9-star oracle-card reader whose grounded interpretations avoid theatrical cold-reading tactics.",
  "pricing": "$3.99/min (promo $1.99/min)",
  "bestFor": "Oracle card insights and gentle life path navigation",
  "entities": ["Oracle Card Reading","Love and Relationship Psychic","Emotional Clarity Reading","Career Psychic Guidance","Kasamba Psychic"],
  "schema_rating": "4.9",
  "body_replaces": {
    "32,000+": "29,000+",
  },
},

"psychic-yazmin-kasamba-review": {
  "title": "Psychic Yazmin Kasamba Review (2026): Can 'Yaz' Really See What Others Miss?",
  "description": "I tested Psychic Yazmin on Kasamba firsthand. She's a 5-star love and tarot reader known for emotionally attuned, personally specific readings.",
  "seoTitle": "Psychic Yazmin Kasamba Review (2026): Emotional-Mirroring Reader",
  "metaDescription": "Psychic Yazmin on Kasamba: an emotional-mirroring intuitive reader. We review her method, pricing, real client patterns, and who should book.",
  "rating": 5,
  "verdict": "I tested Psychic Yazmin on Kasamba firsthand. She's a 5-star love and tarot reader whose warm, emotionally attuned style makes clients feel seen in ways they did not volunteer.",
  "bestFor": "Deep emotional mirroring and hidden blind spots",
  "entities": ["Tarot Reading","Love and Relationship Psychic","Empathic Psychic Reader","Emotional Clarity Reading","Kasamba Psychic"],
  "schema_rating": "5",
},

"seek-chelle-kasamba-review": {
  "title": "Seek Chelle Review on Kasamba: Triple Clair Gifts, 20 Years of Experience, and the Reader Who Hears What You Leave Unsaid",
  "description": "An honest review of Seek Chelle on Kasamba \u2014 a 20-year intuitive advisor with triple-clair gifts and 55,000+ readings who excels at surfacing the real question behind yours.",
  "seoTitle": "Seek Chelle Kasamba Review (2026)",
  "metaDescription": "Honest 2026 review of Seek Chelle on Kasamba \u2014 method, pricing, real client patterns, and who should book.",
  "rating": 5,
  "verdict": "Seek Chelle is one of the most methodologically specific readers on Kasamba \u2014 a 20-year advisor with triple-clair gifts and 55,000+ readings who hears what you leave unsaid.",
  "bestFor": "Love and relationships, spiritual crossroads, career direction, clients who struggle to name the real question",
  "entities": ["Clairvoyant Reading","Love and Relationship Psychic","Spiritual Guidance Reading","Intuitive Energy Reading","Kasamba Psychic"],
  "schema_rating": "5",
  "new_rb": "Seek Chelle is a Kasamba psychic advisor with over 20 years of experience, a 5-star rating across 55,000+ readings, and a triple clair methodology combining clairvoyance, clairaudience, and clairsentience. Her explicit zero-judgment positioning and structured preparation protocol using names and birthdates distinguish her approach from generalist readers. She is best suited to love and relationship readings, spiritual crossroads, and clients who struggle to articulate the real question behind their situation.",
  "body_replaces": {
    "10,000+": "55,000+",
    "across 10,000 client interactions": "across 55,000 client interactions",
    "exceeding 10,000 at a 5-star rating": "exceeding 55,000 at a 5-star rating",
    "Twenty years. Ten thousand five-star reviews. Three simultaneous": "Twenty years. Fifty-five thousand reviews. Three simultaneous",
  },
},

"wisdom-and-love-kasamba-review": {
  "title": "Wisdom and Love Kasamba Review (2026): What 100,000+ Readings Actually Buys",
  "description": "Andrew behind 'Wisdom and Love' has been reading on Kasamba since 2004 \u2014 100,000+ sessions, 31,500 reviews at a 4.7-star average, and a prediction-focused, time-frame style.",
  "seoTitle": "Wisdom and Love Kasamba Review (2026)",
  "metaDescription": "Wisdom and Love on Kasamba: a relationship and guidance reader with 100,000+ sessions. We review the method, pricing, real client patterns, and who should book.",
  "rating": 4.7,
  "verdict": "Andrew behind 'Wisdom and Love' has been reading on Kasamba since 2004 \u2014 100,000+ sessions and 31,500 reviews at a 4.7-star average \u2014 and his prediction-focused, time-frame style is built for clients who need to know what happens next.",
  "pricing": "$9.99/min (intro $4.99/min)",
  "bestFor": "Direct, profound guidance from a highly vetted veteran",
  "entities": ["Spirit Guide Reading","Love and Relationship Prediction","Career Psychic Guidance","Time-Frame Psychic Reading","Kasamba Psychic"],
  "schema_rating": "4.7",
  "new_rb": "Wisdom and Love \u2014 real name Andrew \u2014 is an Irish psychic advisor on Kasamba who has been reading since 2004, accumulating over 100,000 sessions and 31,500 reviews at a 4.7-star average. He specializes in love and relationship readings with a direct, prediction-focused approach that includes time frames. At $4.99 per minute (intro from $9.99), he delivers fast-connecting, no-nonsense sessions built around what your person is thinking and what actions they are likely to take.",
  "body_replaces": {
    "31,551 five-star reviews": "31,551 reviews at a 4.7-star average",
    "five-star rating that has held": "4.7-star rating that has held",
    "maintain a 5-star average": "maintain a 4.7-star average",
    "Thirty-one thousand five-star reviews": "Thirty-one thousand reviews",
    "What 31,500 Five-Star Reviews Over 22 Years Actually Signals": "What 31,500 Reviews Over 22 Years Actually Signals",
  },
},
}

def apply_patch(path, patch):
    txt = open(path, encoding="utf-8").read()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", txt, re.S)
    if not m:
        raise SystemExit(f"NO FM: {path}")
    fm = m.group(1)
    data = yaml.safe_load(fm)
    body = txt[m.end():]

    # simplest scalar fields
    for k in ["title","description","seoTitle","metaDescription","rating",
              "verdict","pricing","bestFor"]:
        if k in patch and patch[k] is not None:
            data[k] = patch[k]
    if "entities" in patch:
        data["entities"] = patch["entities"]
    if "highlights" in patch:
        data["highlights"] = patch["highlights"]
    data["updatedDate"] = "2026-08-13"

    # customSchema string patching
    cs = data.get("customSchema")
    if cs is not None:
        if "schema_rating" in patch:
            cs = re.sub(r'("ratingValue":\s*")[^"]*(")', r"\g<1>"+patch["schema_rating"]+r"\g<2>", cs)
        if "new_rb" in patch:
            cs = re.sub(r'("reviewBody":\s*").*?(",)', r"\g<1>"+patch["new_rb"]+r'\g<2>', cs, count=1, flags=re.S)
        data["customSchema"] = cs

    # body replaces
    for old, new in patch.get("body_replaces", {}).items():
        if old not in body:
            print(f"  WARN body replace not found in {path}: {old[:50]}")
        body = body.replace(old, new)

    # re-dump frontmatter, preserve order
    fm_new = yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=10000)
    out = "---\n" + fm_new + "---\n" + body
    open(path, "w", encoding="utf-8").write(out)
    print(f"  wrote {path}")

for slug, patch in P.items():
    p = os.path.join(BASE, slug + ".md")
    print("FILE:", slug)
    apply_patch(p, patch)

print("\nDONE.")
