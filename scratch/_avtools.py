import sys, re, os, urllib.parse, base64

ROOT = r'C:/Users/samja/Desktop/site/easternalignment'
TS = os.path.join(ROOT, 'src/data/affiliateLinks.ts')
aff = dict(re.findall(r'"([a-zA-Z0-9_-]+)":\s*"([^"]+)"', open(TS, encoding='utf-8').read()))

def official_of(key):
    v = aff.get(key, '')
    m = re.search(r'url=([^&]+)', v)
    if m:
        return urllib.parse.unquote(m.group(1))
    if v.startswith('http'):
        return v
    return None

def parse_fm(text):
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    fm, body = m.group(1), text[m.end():]
    key = cur = None
    av_idx = aff_idx = None
    for idx, line in enumerate(fm.split('\n')):
        s = line.strip()
        if s.startswith('affiliateUrl') and key is None:
            mm = re.search(r'/go/([^"/]+)/', s)
            key = mm.group(1) if mm else None
            aff_idx = idx
        if s.startswith('avatarUrl') and cur is None:
            cur = s.split(':', 1)[1].strip().strip('"')
            av_idx = idx
    return fm, body, key, cur, av_idx, aff_idx

def extract_img(html, platform):
    if platform == 'kasamba':
        host = r'k3cdn\.kassrv\.com'
    elif platform == 'purple-garden':
        host = r'purple\.brgsrv\.com'
    else:
        # Return ALL candidate profile photos so the caller can try alternates.
        mems = re.findall(r'images\.keen\.com/memberphotos/(-?\d+-\d+)Primary\.jpg', html)
        cands = [f"https://images.keen.com/memberphotos/{m}Primary.jpg" for m in mems]
        m3 = re.search(r'images\.keen\.com/member3x2/(-?\d+-\d+)Size3by2', html)
        if m3:
            cands.append(f"https://images.keen.com/memberphotos/{m3.group(1)}Primary.jpg")
        return _dedupe(cands)
    cands = []
    for m in re.findall(r'https://' + host + r'/eyJ[^\s"\')]+', html):
        tok = 'eyJ' + m.split('/eyJ', 1)[1]
        tok += '=' * (-len(tok) % 4)
        for dec in (base64.urlsafe_b64decode, base64.b64decode):
            try:
                d = dec(tok).decode('utf-8', 'ignore')
            except Exception:
                continue
            if 'profile_image' in d or re.search(r'users/\d+/[^\"\\]+\.(?:jpe?g|png|webp)', d):
                cands.append(m)
            break
    return _dedupe(cands)

def _dedupe(seq):
    seen = set(); out = []
    for x in seq:
        if x not in seen:
            seen.add(x); out.append(x)
    return out

def magic_ext(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n': return '.png'
    if b[:6] in (b'GIF87a', b'GIF89a'): return '.gif'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP': return '.webp'
    return '.jpg'

mode = sys.argv[1]
if mode == 'manifest':
    out = []
    for platform in ['kasamba', 'purple-garden', 'keen']:
        d = os.path.join(ROOT, 'src/content/readers', platform)
        for fn in sorted(os.listdir(d)):
            if not fn.endswith('.md'):
                continue
            text = open(os.path.join(d, fn), encoding='utf-8').read()
            fm, body, key, cur, av_idx, aff_idx = parse_fm(text)
            need = ((platform in ('kasamba', 'purple-garden') and cur and cur.endswith('.svg'))
                    or (platform == 'keen' and not cur))
            if not need:
                continue
            off = official_of(key) if key else None
            if not off:
                continue
            out.append("\t".join([platform, fn, off, fn[:-3]]))
    with open(os.path.join(ROOT, 'scratch', '_av_manifest.tsv'), 'w', encoding='utf-8', newline='\n') as f:
        f.write("\n".join(out) + "\n")

elif mode == 'decode':
    html = open(sys.argv[2], encoding='utf-8', errors='ignore').read()
    platform = sys.argv[3]
    cands = extract_img(html, platform)
    # The curl-driven _av_fetch.sh expects a single-line URL; emit only the first candidate.
    print(cands[0] if cands else '')

elif mode == 'writefm':
    md = sys.argv[2]
    adir = sys.argv[3]
    base = sys.argv[4]
    src = os.path.join(adir, base + '.__dl')
    if not (os.path.exists(src) and os.path.getsize(src) > 500):
        print("NOFILE"); sys.exit(1)
    ext = magic_ext(open(src, 'rb').read(16))
    os.replace(src, os.path.join(adir, base + ext))
    dest_rel = f"/avatars/{os.path.basename(adir)}/{base}{ext}"
    text = open(md, encoding='utf-8').read()
    fm, body, key, cur, av_idx, aff_idx = parse_fm(text)
    lines = fm.split('\n')
    newline = f'avatarUrl: {dest_rel}'
    if cur:
        lines[av_idx] = newline
    else:
        lines.insert(aff_idx + 1, newline)
    open(md, 'w', encoding='utf-8').write('---\n' + '\n'.join(lines) + '\n---\n' + body)
    svg = os.path.join(adir, base + '.svg')
    if os.path.exists(svg):
        os.remove(svg)
    print("OK", dest_rel)
