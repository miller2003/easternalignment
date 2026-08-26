# -*- coding: utf-8 -*-
"""Extract every local image reference from src/ and verify against public/."""
import os, re, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = r"C:\Users\samja\Desktop\site\easternalignment"
SRC = os.path.join(ROOT, "src")
PUB = os.path.join(ROOT, "public")

# capture src="...", src='...', avatarUrl: "...", ogImage: "...", "image": "...", url("...")
pat = re.compile(
    r'(?:src|avatarUrl|ogImage|image|url|href)\s*[=:]\s*["\'\(]?'
    r'\s*(/[A-Za-z0-9_\-./%]+\.(?:jpg|jpeg|png|gif|svg|webp|ico))',
    re.IGNORECASE)
# also markdown ![](...)
md_pat = re.compile(r'!\[[^\]]*\]\((/[A-Za-z0-9_\-./%]+\.(?:jpg|jpeg|png|gif|svg|webp|ico))\)', re.IGNORECASE)

refs = {}  # path -> set of referencing files
for dirpath, _, files in os.walk(SRC):
    for fn in files:
        if not fn.lower().endswith(('.astro', '.md', '.mdx', '.ts', '.js', '.tsx', '.jsx', '.css')):
            continue
        fp = os.path.join(dirpath, fn)
        try:
            with open(fp, 'r', encoding='utf-8', errors='replace') as f:
                text = f.read()
        except OSError:
            continue
        rel = os.path.relpath(fp, ROOT)
        for m in pat.finditer(text):
            refs.setdefault(m.group(1), set()).add(rel)
        for m in md_pat.finditer(text):
            refs.setdefault(m.group(1), set()).add(rel)

missing, present = [], []
for path in sorted(refs):
    # normalize %XX etc not needed here; check disk
    disk = os.path.join(PUB, path.lstrip('/').replace('/', os.sep))
    (present if os.path.isfile(disk) else missing).append(path)

print("=== MISSING (referenced in src/ but not in public/) ===")
for p in missing:
    users = sorted(refs[p])
    print(f"{p}   <-- {len(users)} ref(s): {users[0]}" + (" ..." if len(users) > 1 else ""))
print(f"\nmissing={len(missing)}  present={len(present)}  total_refs={len(refs)}")
