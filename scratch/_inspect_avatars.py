import re

def inspect(path, label):
    html = open(path, encoding='utf-8', errors='ignore').read()
    print(f"\n========== {label} ({len(html)} bytes) ==========")
    # og / twitter image
    for m in re.findall(r'(?:og|twitter):image[^>]*content="([^"]+)"', html, re.I):
        print("  META og/twitter image:", m)
    # JSON-LD image
    for m in re.findall(r'"image"\s*:\s*"([^"]+)"', html):
        print("  JSON image:", m)
    # img tags src / data-src
    imgs = re.findall(r'<img\b[^>]*>', html)
    print(f"  <img> tags: {len(imgs)}")
    for tag in imgs[:25]:
        src = re.search(r'src="([^"]+)"', tag)
        ds = re.search(r'data-src="([^"]+)"', tag)
        if src or ds:
            val = (src.group(1) if src else '') + (' [data-src:'+ds.group(1)+']' if ds else '')
            print("    img:", val[:140])
    # any background-image url(...)
    for m in re.findall(r'background-image\s*:\s*url\(([^)]+)\)', html):
        print("  bg:", m[:140])
    # any memberphotos / avatar-ish URLs
    for m in re.findall(r'https://[^\s"\')]+\.(?:jpg|jpeg|png|webp)', html):
        if any(k in m.lower() for k in ('member','avatar','photo','profile','advisor','psychic')):
            print("  candidate:", m[:160])

inspect('scratch/_t_keen.html', 'KEEN eli-casey')
inspect('scratch/_t_kas.html', 'KASAMBA cosmic-fusion')
inspect('scratch/_t_pg.html', 'PG ayla')
