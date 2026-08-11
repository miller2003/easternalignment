import re, os, base64, time, sys, urllib.parse, urllib.request, ssl

ROOT = r'C:/Users/samja/Desktop/site/easternalignment'
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
TS = os.path.join(ROOT, 'src/data/affiliateLinks.ts')
DRY = os.environ.get('DRY') == '1'

# Bypass sandbox cert store for hosts with self-signed / untrusted chains (purplegarden.co)
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

ts = open(TS, encoding='utf-8').read()
aff = dict(re.findall(r'"([a-zA-Z0-9_-]+)":\s*"([^"]+)"', ts))

def official_of(key):
    v = aff.get(key, '')
    m = re.search(r'url=([^&]+)', v)
    if m:
        return urllib.parse.unquote(m.group(1))
    if v.startswith('http'):
        return v
    return None

def curl(url, binary=True, retries=4, timeout=45):
    # strip tracking macros from HTML page URLs before fetching
    fetch_url = url.split('?')[0] if not url.lower().endswith(('.jpg', '.png', '.gif', '.webp')) else url
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(fetch_url, headers={
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            })
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(1.2 * (i + 1))
    if DRY:
        print(f"    NETFAIL {fetch_url} :: {type(last).__name__} {str(last)[:80]}")
    return b''

def img_ext(b):
    if b[:8] == b'\x89PNG\r\n\x1a\n': return '.png'
    if b[:6] in (b'GIF87a', b'GIF89a'): return '.gif'
    if b[:4] == b'RIFF' and b[8:12] == b'WEBP': return '.webp'
    return '.jpg'

def extract_img(html, platform):
    if platform == 'kasamba':
        host = r'k3cdn\.kassrv\.com'
    elif platform == 'purple-garden':
        host = r'purple\.brgsrv\.com'
    else:
        m3 = re.search(r'images\.keen\.com/member3x2/(-?\d+-\d+)Size3by2', html)
        mem = re.search(r'images\.keen\.com/memberphotos/(-?\d+-\d+)Primary\.jpg', html)
        if m3:
            return f"https://images.keen.com/memberphotos/{m3.group(1)}Primary.jpg"
        if mem:
            return f"https://images.keen.com/memberphotos/{mem.group(1)}Primary.jpg"
        return None
    for m in re.findall(r'https://' + host + r'/eyJ[^\s"\')]+', html):
        tok = 'eyJ' + m.split('/eyJ', 1)[1]
        tok += '=' * (-len(tok) % 4)
        for dec in (base64.urlsafe_b64decode, base64.b64decode):
            try:
                if 'profile_image' in dec(tok).decode('utf-8', 'ignore'):
                    return m
            except Exception:
                continue
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

def update_fm(fm, body, dest_rel, av_idx, aff_idx, had_avatar):
    lines = fm.split('\n')
    newline = f'avatarUrl: {dest_rel}'
    if had_avatar:
        lines[av_idx] = newline
    else:
        lines.insert(aff_idx + 1, newline)
    return '---\n' + '\n'.join(lines) + '\n---\n' + body

report = {'ok': [], 'fail': []}
for platform in ['kasamba', 'purple-garden', 'keen']:
    d = os.path.join(ROOT, 'src/content/readers', platform)
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.md'):
            continue
        try:
            p = os.path.join(d, fn)
            text = open(p, encoding='utf-8').read()
            fm, body, key, cur, av_idx, aff_idx = parse_fm(text)
            need = ((platform in ('kasamba', 'purple-garden') and cur and cur.endswith('.svg'))
                    or (platform == 'keen' and not cur))
            if not need:
                continue
            off = official_of(key) if key else None
            if not off:
                report['fail'].append((fn, 'NO_OFFICIAL_URL key=' + str(key))); continue
            html = curl(off).decode('utf-8', 'ignore')
            if len(html) < 1000:
                report['fail'].append((fn, 'FETCH_FAIL')); continue
            img = extract_img(html, platform)
            if not img:
                report['fail'].append((fn, 'NO_IMG:' + off[:70])); continue
            data = curl(img)
            if len(data) < 500:
                report['fail'].append((fn, 'IMG_DL_FAIL')); continue
            ext = img_ext(data)
            base = fn[:-3]
            dest_rel = f'/avatars/{platform}/{base}{ext}'
            if DRY:
                report['ok'].append((fn, dest_rel, len(data))); continue
            dest = os.path.join(ROOT, 'public', 'avatars', platform, base + ext)
            open(dest, 'wb').write(data)
            old = os.path.join(ROOT, 'public', 'avatars', platform, base + '.svg')
            if os.path.exists(old):
                os.remove(old)
            open(p, 'w', encoding='utf-8').write(update_fm(fm, body, dest_rel, av_idx, aff_idx, bool(cur)))
            report['ok'].append((fn, dest_rel, len(data)))
            time.sleep(0.3)
        except Exception as e:
            print(f"  !! EXC {fn}: {type(e).__name__} {str(e)[:120]}", flush=True)
            report['fail'].append((fn, 'EXC:' + type(e).__name__))
print(f"OK: {len(report['ok'])}", flush=True)
for r in report['ok']:
    print("  +", r[0], "->", r[1], f"({r[2]}B)")
print(f"FAIL: {len(report['fail'])}", flush=True)
for r in report['fail']:
    print("  -", r[0], r[1])
sys.stdout.flush()

print(f"OK: {len(report['ok'])}")
for r in report['ok']:
    print("  +", r[0], "->", r[1], f"({r[2]}B)")
print(f"FAIL: {len(report['fail'])}")
for r in report['fail']:
    print("  -", r[0], r[1])
