const fs = require('fs');
const html = fs.readFileSync('chosen_test.html', 'utf16le');
const keenMember = [...html.matchAll(/https?:\/\/(si|images)\.keen\.com\/(member(?:photos|3x2)|advisor-images)\/[^\s\"'\\]+?\.(?:png|jpe?g|webp|avif)/gi)].map(m => m[0]);
console.log('Matches:', [...new Set(keenMember)]);
