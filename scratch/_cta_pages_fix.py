"""Fix .astro pages under src/pages:
1. cta-flex blocks: Keen primary + Kasamba secondary -> Kasamba primary,
   Purple Garden secondary, Keen secondary.
2. Prose cross-links: 'Keen</a> and <a ...>Kasamba</a>' -> Kasamba, PG, Keen;
   'both (platforms )?offer...' tails -> 'all three ...'.
"""
import re, io, os

ROOT = r"c:\Users\samja\Desktop\site\easternalignment\src\pages"

FILES = [
    r"tools\index.astro",
    r"tools\moon-phase.astro",
    r"tools\angel-number-calculator.astro",
    r"tools\zodiac-compatibility-calculator.astro",
    r"tools\one-card-tarot.astro",
    r"tools\yes-no-tarot.astro",
    r"tools\life-path-calculator.astro",
    r"tools\dream-dictionary.astro",
    r"astrology\index.astro",
    r"astrology\zodiac\[sign].astro",
    r"astrology\zodiac\[pair].astro",
]

cta_re = re.compile(
    r'([ \t]*)<a href="/go/keen/" class="btn btn--primary">Get 5 Minutes for \$1 on Keen →</a>(\r?\n)'
    r'[ \t]*<a href="/go/kasamba/" class="btn btn--secondary">Try Kasamba: 3 Free Minutes →</a>'
)


def cta_sub(m):
    ind, nl = m.group(1), m.group(2)
    return (
        f'{ind}<a href="/go/kasamba/" class="btn btn--primary">Try Kasamba: 3 Free Minutes →</a>{nl}'
        f'{ind}<a href="/go/purple-garden/" class="btn btn--secondary">Try Purple Garden: $30 Credit →</a>{nl}'
        f'{ind}<a href="/go/keen/" class="btn btn--secondary">Get 5 Minutes for $1 on Keen →</a>'
    )


prose_re = re.compile(
    r'<a href="/reviews/keen/">Keen</a> and <a href="/reviews/kasamba/">Kasamba</a>'
)
PROSE_NEW = (
    '<a href="/reviews/kasamba/">Kasamba</a>, '
    '<a href="/reviews/purple-garden/">Purple Garden</a>, and '
    '<a href="/reviews/keen/">Keen</a>'
)

tails = [
    ("and both platforms offer risk-free trial minutes", "and all three offer risk-free trial minutes"),
    ("and both platforms offer trial minutes", "and all three offer introductory trial minutes"),
    ("and both offer trial minutes so you can test before committing", "and all three offer trial minutes so you can test before committing"),
    ("and both offer trial minutes", "and all three offer trial minutes"),
]

for rel in FILES:
    p = os.path.join(ROOT, rel)
    with io.open(p, encoding="utf-8", newline="") as fh:
        text = fh.read()
    orig = text
    text, n_cta = cta_re.subn(cta_sub, text)
    text, n_prose = prose_re.subn(PROSE_NEW, text)
    n_tail = 0
    for old, new in tails:
        if old in text:
            text = text.replace(old, new)
            n_tail += 1
    if text != orig:
        with io.open(p, "w", encoding="utf-8", newline="") as fh:
            fh.write(text)
    print(f"{rel}: cta={n_cta} prose={n_prose} tail={n_tail}")
