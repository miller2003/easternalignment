const fs = require('fs');
const path = require('path');
const html = fs.readFileSync('chosen_test.html', 'utf16le');

function pickImageFromHtml(html, pageUrl = "") {
  const isKasamba = /kasamba\.com/i.test(pageUrl) || /kassrv\.com/i.test(html);
  const isKeen = true;
  const isPurpleGarden = /purplegarden\.co/i.test(pageUrl) || /purple\.brgsrv\.com/i.test(html);

  if (isKeen) {
    // Keen: prefer the actual profile image from Next.js payload
    const keenMember = [
      ...html.matchAll(/https?:\/\/(si|images)\.keen\.com\/member(?:photos|3x2)\/[^\s\"'\\]+?\.(?:png|jpe?g|webp|avif)/gi),
    ].map((m) => m[0]);
    const nonDefault = keenMember.filter((u) => !/default_v3|default-advisor-img/i.test(u));
    if (nonDefault.length) return nonDefault[0];

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
      if (preferred) return preferred;
    }
  }

  if (isKasamba || isKeen || isPurpleGarden) {
    return null;
  }

  return null;
}

console.log('Returned:', pickImageFromHtml(html, 'https://www.keen.com/love-relationships/chosenone77/6682497'));
