#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, re

ROOT = "C:/Users/samja/Desktop/site/easternalignment"
SLUG2MD = {
    "keen-lorrie-c": "lorrie-c.md",
    "keen-symonne": "symonne.md",
    "kasamba-accurate-love-readings": "accurate-love-readings-kasamba-review.md",
    "kasamba-ambers-light": "ambers-light-kasamba-review.md",
    "kasamba-best-psychic-readings": "best-psychic-readings-kasamba-review.md",
    "kasamba-divine-master": "divine-master-kasamba-review.md",
    "kasamba-divine-soul": "divine-soul-kasamba-review.md",
    "kasamba-intuitive-counselor": "intuitive-counselor-kasamba-review.md",
    "kasamba-love-psychic-indi": "love-psychic-indi-kasamba-review.md",
    "kasamba-love-specialist-isabelle": "love-specialist-isabelle-kasamba-review.md",
    "kasamba-miss-bathsheba": "miss-bathsheba-kasamba-review.md",
    "kasamba-quietsound": "quietsound-kasamba-review.md",
    "kasamba-raven-franks": "raven-franks-kasamba-review.md",
    "kasamba-spiritual-anna": "powerful-visions-kasamba-review.md",
    "kasamba-spiritual-divini-service": "spiritual-divini-service-kasamba-review.md",
    "kasamba-the-fruno": "the-fruno-kasamba-review.md",
    "kasamba-truth-and-light": "truth-and-light-kasamba-review.md",
    "purple-garden-emmanuelle-berger": "emmanuelle-berger.md",
    "purple-garden-psychic-logan": "psychic-logan.md",
    "purple-garden-psychic-willow": "psychic-willow.md",
    "purple-garden-sagest": "sagest.md",
}

def platform_of(slug):
    if slug.startswith("purple-garden-"): return "purple-garden"
    return slug.split("-", 1)[0]

results = []
for slug, fn in SLUG2MD.items():
    p = platform_of(slug)
    md = f"{ROOT}/src/content/readers/{p}/{fn}"
    txt = open(md, encoding="utf-8").read()
    m = re.search(r"^avatarUrl:\s*(\S+)", txt, re.M)
    av = m.group(1) if m else None
    fp = f"{ROOT}/public{av}" if av else None
    exists = os.path.exists(fp) if fp else False
    results.append((slug, p, av, exists))

print(f"{'STATUS':4}  {'SLUG':40}  {'PLATFORM':13}  avatarUrl exists_file")
for slug, p, av, exists in results:
    mark = "OK  " if exists else "FAIL"
    print(f"{mark}  {slug:40}  {p:13}  {av or '<MISSING>':50}  {'yes' if exists else 'NO'}")

ok = sum(1 for r in results if r[3])
print(f"\nResult: {ok}/{len(results)} readers have avatarUrl + avatar file on disk.")