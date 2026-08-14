const fs = require('fs');
const html = fs.readFileSync('chosen_test.html', 'utf16le');
const nextImg = [...html.matchAll(/\/_next\/image\?url=([^&]+)&/gi)]
      .map((m) => decodeURIComponent(m[1]));
console.log('Next Images:', nextImg);
