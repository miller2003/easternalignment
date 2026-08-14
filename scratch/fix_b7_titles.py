import os

base = 'src/content/readers/'

# (old_title_substring, new_title_substring) -- inner text regardless of wrapping quotes
pairs = {
    # ---- Keen (strip trailing "?") ----
    'keen/alice-runyon.md': (
        "Alice Runyon on Keen Review 2026: 44,000 Readings of 'Clear Visions' at $3.59/Min?",
        "Alice Runyon on Keen Review 2026: 44,000 Readings of 'Clear Visions' at $3.59/Min"),
    'keen/allmyangels.md': (
        "AllMyAngels on Keen Review 2026: A 50,000-Reading Intuitive at $6.99/Min?",
        "AllMyAngels on Keen Review 2026: A 50,000-Reading Intuitive at $6.99/Min"),
    'keen/chosenone77.md': (
        "ChosenOne77 on Keen Review 2026: 28,000 Readings of Intuitive Wisdom at $6.53/Min?",
        "ChosenOne77 on Keen Review 2026: 28,000 Readings of Intuitive Wisdom at $6.53/Min"),
    'keen/dar66.md': (
        "Dar66 on Keen Review 2026: 43,000 Readings of 'Spirit's Truth' at $4.20/Min?",
        "Dar66 on Keen Review 2026: 43,000 Readings of 'Spirit's Truth' at $4.20/Min"),
    'keen/heather-ashera.md': (
        "Heather Ashera on Keen Review 2026: 32,000 Readings of Tarot at $3.33/Min?",
        "Heather Ashera on Keen Review 2026: 32,000 Readings of Tarot at $3.33/Min"),
    'keen/intuitive-jade.md': (
        "Intuitive Jade on Keen Review 2026: 27,000 Readings via 'Name Vibrations' at $8.99/Min?",
        "Intuitive Jade on Keen Review 2026: 27,000 Readings via 'Name Vibrations' at $8.99/Min"),
    'keen/master-psychic-dev.md': (
        "Master Psychic Dev on Keen Review 2026: 34,000 Readings of 'Clarity and Purpose' at $7.39/Min?",
        "Master Psychic Dev on Keen Review 2026: 34,000 Readings of 'Clarity and Purpose' at $7.39/Min"),
    'keen/chloe-has-your-love-insights.md': (
        "Chloe Has Your Love Insights on Keen Review 2026: 36,000 Readings at $2.58/Min?",
        "Chloe Has Your Love Insights on Keen Review 2026: 36,000 Readings at $2.58/Min"),
    'keen/readings-by-ruth.md': (
        "Readings by Ruth on Keen Review 2026: A 41,000-Reading 3rd-Gen Navigator at $5.99/Min?",
        "Readings by Ruth on Keen Review 2026: A 41,000-Reading 3rd-Gen Navigator at $5.99/Min"),
    # ---- Keen (rephrase question lead) ----
    'keen/gabriel-the-messenger.md': (
        "Gabriel the Messenger on Keen Review 2026: Can a No-Tools Reader Hold 23,000 Ratings at $8.99/Min?",
        "Gabriel the Messenger on Keen Review 2026: A No-Tools Reader Holding 23,000 Ratings at $8.99/Min"),
    'keen/jeanne-clock.md': (
        "Jeanne Clock on Keen Review 2026: A Multi-Gifted Clairvoyant With 95,000 Readings - Worth Booking?",
        "Jeanne Clock on Keen Review 2026: A Multi-Gifted Clairvoyant With 95,000 Readings Worth Booking"),
    # ---- Kasamba (rephrase) ----
    'kasamba/psychic-simmi-kasamba-review.md': (
        "Psychic Simmi Kasamba Review (2026): Is She Actually Worth Your Money?",
        "Psychic Simmi Kasamba Review (2026): A Psychic Actually Worth Your Money"),
    'kasamba/psychic-yazmin-kasamba-review.md': (
        "Psychic Yazmin Kasamba Review (2026): Can 'Yaz' Really See What Others Miss?",
        "Psychic Yazmin Kasamba Review (2026): How 'Yaz' Sees What Others Miss"),
    'kasamba/psychic-satire-kasamba-review.md': (
        "Psychic Satire Kasamba Review (2026): A Medium Who Actually Delivers?",
        "Psychic Satire Kasamba Review (2026): A Medium Who Actually Delivers"),
}

for rel, (old, new) in pairs.items():
    p = base + rel
    if not os.path.exists(p):
        print("MISSING:", rel); continue
    t = open(p, encoding='utf-8').read()
    if old not in t:
        print("WARN old-not-found:", rel)
        continue
    cnt = t.count(old)
    t2 = t.replace(old, new)
    open(p, 'w', encoding='utf-8').write(t2)
    print(f"OK  {rel:45} replaced={cnt}")

# verification: no target file should still have a title ending in ?
print("\n--- verify no remaining '?' titles in target files ---")
import re
for rel in pairs:
    p = base + rel
    t = open(p, encoding='utf-8').read()
    for line in t.splitlines():
        if line.strip().startswith('title:'):
            ends = line.strip().rstrip().endswith('?')
            print(f"{'BAD' if ends else 'ok '} | {rel:45} | {line.strip()[:70]}")
