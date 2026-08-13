import { readdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

try {
  const dirs = ['src/content/readers/kasamba', 'src/content/readers/purple-garden'];
  let count = 0;
  
  for (const dir of dirs) {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const p = join(dir, f);
      const text = readFileSync(p, 'utf8');
      
      // Check for AI generated template headers from gen-reader-reviews.mjs
      if (text.includes('## What Clients Actually Experience: Patterns from') ||
          text.includes('## Is ') && text.includes('Right for You? Honest Verdict') ||
          text.includes('### Not the Right Match If...') ||
          text.includes('### Starting with ')) {
        
        unlinkSync(p);
        console.log('Deleted generated file by template matching: ' + p);
        count++;
      }
    }
  }
  console.log(`Deleted ${count} additional generated files.`);
} catch(e) {
  console.error(e);
}
