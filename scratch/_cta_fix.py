"""Rebuild cta-flex blocks in neutral guides to site-wide priority order:
Kasamba (primary) -> Purple Garden (secondary) -> Keen (secondary).
Existing anchor text/hrefs are preserved; only classes/order change, and a
Purple Garden button is inserted where missing.
"""
import re, io, os, sys

ROOT = r"c:\Users\samja\Desktop\site\easternalignment\src\content"

block_re = re.compile(r'(<div class="cta-flex"[^>]*>)(.*?)(</div>)', re.S)
anchor_re = re.compile(r'<a\s+href="([^"]+)"\s+class="([^"]+)">(.*?)</a>', re.S)

KASAMBA_DEFAULT = '<a href="/go/kasamba" class="btn btn--primary">Get 3 Free Minutes on Kasamba →</a>'
PG_DEFAULT = '<a href="/go/purple-garden" class="btn btn--secondary">Claim $30 Free Credit on Purple Garden →</a>'

# Neutral guides: flip to Kasamba primary + insert PG + demote Keen.
FLIP = [
    "guides/best-lgbtq-psychics-online.md",
    "guides/best-tarot-readers-for-love.md",
    "guides/divorce-breakup-psychics-online.md",
    "guides/does-he-like-me-psychics.md",
    "guides/evidential-mediums-passed-spouse.md",
    "guides/financial-motives-psychics.md",
    "guides/long-distance-relationship-psychics.md",
    "guides/love-after-loss-mediums.md",
    "guides/love-or-career-psychics.md",
    "guides/love-triangles-psychics.md",
    "guides/online-dating-psychics.md",
    "guides/other-woman-psychic-readings.md",
    "guides/real-marriage-psychics.md",
    "guides/single-parent-psychics.md",
    "guides/when-will-i-get-married-psychics.md",
    "guides/will-he-propose-psychics.md",
    "guides/win-her-back-psychics.md",
    # keen-only single-button neutral guides
    "guides/am-i-psychic-signs-and-tests.md",
    "guides/angel-numbers-1111-222-333-meaning-guide.md",
    "guides/aura-reading-meaning-colors.md",
    "guides/clairs-the-four-psychic-abilities-guide.md",
    "guides/how-much-does-a-psychic-reading-cost.md",
    "guides/karmic-relationships-signs-and-lessons.md",
    "guides/palm-reading-beginners-guide.md",
    "guides/pet-psychic-readings-online.md",
    "guides/psychic-vs-medium-vs-tarot-reader.md",
    "guides/signs-your-ex-is-coming-back.md",
]

THREE_WAY = "comparisons/keen-vs-kasamba-vs-purple-garden.md"
HOTLINES = "guides/best-psychic-hotlines-2026.md"


def set_class(anchor_html, new_class):
    return re.sub(r'class="[^"]+"', f'class="{new_class}"', anchor_html, count=1)


def platform_of(href):
    if "/go/kasamba" in href:
        return "kasamba"
    if "/go/purple" in href:
        return "purple-garden"
    if "/go/keen" in href:
        return "keen"
    return None


def rebuild_flip(m):
    opening, inner, closing = m.group(1), m.group(2), m.group(3)
    anchors = {platform_of(h): (h, c, l) for h, c, l in anchor_re.findall(inner)}
    anchors.pop(None, None)

    # Kasamba primary
    if "kasamba" in anchors:
        h, _, label = anchors["kasamba"]
        kas = f'<a href="{h}" class="btn btn--primary">{label}</a>'
    else:
        kas = KASAMBA_DEFAULT
    # Purple Garden secondary
    if "purple-garden" in anchors:
        h, _, label = anchors["purple-garden"]
        pg = f'<a href="{h}" class="btn btn--secondary">{label}</a>'
    else:
        pg = PG_DEFAULT
    # Keen secondary
    if "keen" in anchors:
        h, _, label = anchors["keen"]
        keen = f'<a href="{h}" class="btn btn--secondary">{label}</a>'
    else:
        keen = '<a href="/go/keen" class="btn btn--secondary">Get 5 Minutes for $1 on Keen →</a>'

    new_inner = "\n  " + "\n  ".join([kas, pg, keen]) + "\n"
    return opening + new_inner + closing


def rebuild_three_way(m):
    opening, closing = m.group(1), m.group(3)
    inner = (
        '\n  <a href="/go/kasamba/" class="btn btn--primary">Try Kasamba: 3 Free Minutes →</a>'
        '\n  <a href="/go/purple-garden/" class="btn btn--secondary">Try Purple Garden: $30 Credit →</a>'
        '\n  <a href="/go/keen/" class="btn btn--secondary">Try Keen: 5 Minutes for $1 →</a>\n'
    )
    return opening + inner + closing


def rebuild_hotlines(m):
    # Keen-themed page by design: keep Keen primary, keep Kasamba, add PG.
    opening, inner, closing = m.group(1), m.group(2), m.group(3)
    if "/go/purple" in inner:
        return m.group(0)
    anchors = anchor_re.findall(inner)
    parts = []
    for h, c, label in anchors:
        parts.append(f'<a href="{h}" class="{c}">{label}</a>')
    parts.append('<a href="/go/purple-garden/" class="btn btn--secondary">Try Purple Garden: $30 Credit →</a>')
    return opening + "\n  " + "\n  ".join(parts) + "\n" + closing


def process(relpath, rebuild):
    p = os.path.join(ROOT, relpath.replace("/", os.sep))
    with io.open(p, encoding="utf-8", newline="") as fh:
        text = fh.read()
    new_text, n = block_re.subn(rebuild, text)
    if n == 0:
        print(f"!! no block found: {relpath}")
        return False
    if new_text != text:
        with io.open(p, "w", encoding="utf-8", newline="") as fh:
            fh.write(new_text)
        print(f"OK ({n} block): {relpath}")
    else:
        print(f"-- unchanged: {relpath}")
    return True


for rel in FLIP:
    process(rel, rebuild_flip)
process(THREE_WAY, rebuild_three_way)
process(HOTLINES, rebuild_hotlines)
