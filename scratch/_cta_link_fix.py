"""Insert a Purple Garden link into end-of-article plain-link CTA blocks
that currently go Kasamba -> Keen (or Kasamba only), so every block reads
Kasamba -> Purple Garden -> Keen (site-wide priority)."""
import re, io, os

ROOT = r"c:\Users\samja\Desktop\site\easternalignment\src\content\guides"

PG_LINE = "[Find Verified Readers on Purple Garden ($30 Free Credit for New Users) -->](/go/purple-garden)"
KEEN_LINE = "[Or Try Keen With Built-In Reviews (5 Mins for $1) -->](/go/keen)"

# Files whose block is Kasamba link + blank line + Keen link: insert PG between.
TWO_LINK = [
    "avoidant-attachment-psychic-readings.md",
    "can-psychic-predict-marriage.md",
    "free-psychic-readings-online-truth.md",
    "first-psychic-reading-guide.md",
    "how-often-psychic-reading.md",
    "no-contact-psychic-readings-guide.md",
    "psychic-reading-vs-therapy.md",
    "situationship-psychic-readings.md",
    "twin-flame-vs-soulmate-difference.md",
    "third-party-psychic-readings-jealousy.md",
]

# Files whose block is a single Kasamba link: append PG + Keen after it.
ONE_LINK = [
    "dreaming-about-ex-psychic-meaning.md",
    "healing-after-heartbreak-spiritual-guide.md",
    "is-he-the-one-psychic-indicators.md",
    "past-life-connections-psychic-readings.md",
    "tarot-for-love-practical-guide.md",
    "zodiac-compatibility-psychic-readings.md",
]

two_re = re.compile(r"(\[[^\]\n]+\]\(/go/kasamba\))\n\n(\[Or [^\]\n]+\]\(/go/keen\))")
one_re = re.compile(r"(\[[^\]\n]+\]\(/go/kasamba\))(?!\s*\n\s*\[)")


def run(fname, fn):
    p = os.path.join(ROOT, fname)
    with io.open(p, encoding="utf-8", newline="") as fh:
        text = fh.read()
    if "/go/purple" in text.split("## ")[-1] and "purple-garden" in text[-800:]:
        print(f"-- already has PG near end: {fname}")
        return
    new_text, n = fn(text)
    if n == 0:
        print(f"!! pattern not found: {fname}")
        return
    with io.open(p, "w", encoding="utf-8", newline="") as fh:
        fh.write(new_text)
    print(f"OK ({n}): {fname}")


for f in TWO_LINK:
    run(f, lambda t: two_re.subn(r"\1\n\n" + PG_LINE + "\n\n\2", t))

for f in ONE_LINK:
    run(f, lambda t: one_re.subn(r"\1\n\n" + PG_LINE + "\n\n" + KEEN_LINE, t))
