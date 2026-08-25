import re, io, os

ROOT = r"c:\Users\samja\Desktop\site\easternalignment\src\content"
block_re = re.compile(r'<div class="cta-flex"[^>]*>(.*?)</div>', re.S)
anchor_re = re.compile(r'<a\s+href="([^"]+)"\s+class="([^"]+)">(.*?)</a>', re.S)

for dirpath, _, files in os.walk(ROOT):
    for f in sorted(files):
        if not f.endswith(".md"):
            continue
        p = os.path.join(dirpath, f)
        with io.open(p, encoding="utf-8", newline="") as fh:
            text = fh.read()
        for m in block_re.finditer(text):
            anchors = anchor_re.findall(m.group(1))
            summary = " | ".join(f"{cls.split()[-1]}:{href}:{label.strip()}" for href, cls, label in anchors)
            rel = os.path.relpath(p, ROOT)
            print(f"{rel}\n    {summary}\n")
