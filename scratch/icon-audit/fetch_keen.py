import urllib.request, urllib.error, re, gzip, io, sys
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

def fetch(url, timeout=25):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Encoding": "gzip"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            if r.headers.get('Content-Encoding') == 'gzip':
                data = gzip.decompress(data)
            return r.status, data
    except Exception as e:
        return None, str(e).encode()

# 1) check homepage for og:image / image_src / link[icon]
st, html = fetch("https://www.keen.com/")
print(f"homepage: status={st}, bytes={len(html) if isinstance(html,bytes) else html}")
if isinstance(html, bytes):
    text = html.decode('utf-8', errors='ignore')
    for pat in [r'<meta[^>]*property="og:image[^>]*>', r'<meta[^>]*name="twitter:image[^>]*>', r'<link[^>]*rel="image_src"[^>]*>', r'<link[^>]*rel="(icon|apple-touch-icon|shortcut)"[^>]*>']:
        for m in re.findall(pat, text, re.I):
            print(' meta:', m[:300])
    # also any url that ends in .svg/.png with logo/wordmark in path
    for url in re.findall(r'https?://[^"\' ]*\.(?:svg|png|webp)', text, re.I):
        if 'logo' in url.lower() or 'wordmark' in url.lower() or 'brand' in url.lower():
            print(' url:', url)

# 2) try brand/logo/press-kit subpages
for path in ['advisors/logo', 'advisors/brand', 'advisors/press-kit', 'advisors/about']:
    url = f'https://www.keen.com/{path}'
    st, body = fetch(url, timeout=18)
    print(f"\n{url}: status={st}, bytes={len(body) if isinstance(body,bytes) else body}")
    if isinstance(body, bytes) and len(body) > 500:
        text = body.decode('utf-8', errors='ignore')
        # Look for logo assets
        for url2 in re.findall(r'https?://[^"\' ]*\.(?:svg|png|webp)', text, re.I):
            if 'keen' in url2.lower() and any(k in url2.lower() for k in ['logo','wordmark','brand','icon']):
                print(' asset:', url2)
        # Look for image download links
        for url2 in re.findall(r'https?://images-contentstack\.keen\.com/[^"\' ]+', text, re.I)[:30]:
            print(' contentstack:', url2[:200])