import { readFileSync, existsSync, unlinkSync } from 'fs';

try {
  const code = readFileSync('scripts/gen-reader-reviews.mjs', 'utf8');
  let count = 0;
  
  // A simple regex to grab all { slug: '...', platform: '...' } blocks
  const slugRegex = /slug:\s*['"]([^'"]+)['"]/g;
  const platformRegex = /platform:\s*['"]([^'"]+)['"]/g;
  
  let match;
  const slugs = [];
  while ((match = slugRegex.exec(code)) !== null) {
    slugs.push(match[1]);
  }
  
  slugRegex.lastIndex = 0; // reset
  const platforms = [];
  while ((match = platformRegex.exec(code)) !== null) {
    platforms.push(match[1]);
  }
  
  // Note: the arrays might be misaligned if 'slug:' and 'platform:' counts differ, 
  // but looking at the file they are defined in pairs. 
  // Let's just do a safer parse:
  const blocks = code.split('slug:');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const sMatch = block.match(/^\s*['"]([^'"]+)['"]/);
    const pMatch = block.match(/platform:\s*['"]([^'"]+)['"]/);
    if (sMatch && pMatch) {
      const slug = sMatch[1];
      const plat = pMatch[1];
      const p = `src/content/readers/${plat}/${slug}.md`;
      if (existsSync(p)) {
        unlinkSync(p);
        console.log('Deleted ' + p);
        count++;
      }
    }
  }
  
  console.log(`Deleted ${count} review files.`);
} catch(e) {
  console.error(e);
}
