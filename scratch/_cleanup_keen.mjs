import { readdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

try {
  const dir = 'src/content/readers/keen';
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  
  let count = 0;
  for (const f of files) {
    const p = join(dir, f);
    const text = readFileSync(p, 'utf8');
    
    // Check for the AI generated template headers
    if (text.includes('## Before You Book:') || 
        text.includes('## Reading Style in Practice:') || 
        text.includes('## Who Should Book')) {
      unlinkSync(p);
      console.log('Deleted Keen generated file: ' + p);
      count++;
    }
  }
  console.log(`Deleted ${count} Keen files.`);
} catch(e) {
  console.error(e);
}
