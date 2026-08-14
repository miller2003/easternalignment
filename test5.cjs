const targetUrl = 'https://www.keen.com/love-relationships/chosenone77/6682497';
fetch(targetUrl, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
}).then(res => res.text()).then(html => {
  const keenMember = [
      ...html.matchAll(/https?:\/\/(si|images)\.keen\.com\/(member(?:photos|3x2)|advisor-images)\/[^\s\"'\\]+?\.(?:png|jpe?g|webp|avif)/gi),
    ].map((m) => m[0]);
    const nonDefault = keenMember.filter((u) => !/default_v3|default-advisor-img/i.test(u));
    if (nonDefault.length) { console.log('Image:', nonDefault[0]); return; }
    
    // nextImg
    const nextImg = [...html.matchAll(/\/_next\/image\?url=([^&]+)&/gi)]
      .map((m) => {
        try {
          return decodeURIComponent(m[1]);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((u) => !/logo|favicon|icon|badge|promo/i.test(u));

    if (nextImg.length) {
      const preferred = nextImg.find((u) => /profile|avatar|advisor|portrait|headshot|photo/i.test(u));
      if (preferred) { console.log('Image:', preferred); return; }
    }
    
    console.log('No image found!');
});
