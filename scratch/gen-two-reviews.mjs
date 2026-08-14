import { readFileSync, writeFileSync } from 'fs';
import { generateHighQualityReview } from '../scripts/regenerate-high-quality-reviews.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const suzenReader = {
    platformLabel: 'Keen',
    displayName: 'Psychic SuZen',
    rating: 4.84,
    readings: 40627,
    sinceYear: 2018,
    specialty: "Women's Issues, Life Coach, Social Worker, relationships, life direction",
    pricing: '$5.40/min',
    freeOffer: '$1 for first 5 minutes'
  };

  const eliReader = {
    platformLabel: 'Keen',
    displayName: 'Eli Casey',
    rating: 4.96,
    readings: 200000,
    sinceYear: 2001,
    specialty: 'Love & Relationships, Breakups & Divorce, Commitment-phobia, Empath',
    pricing: '$8.97/min',
    freeOffer: '$1 for first 5 minutes'
  };

  console.log('Generating SuZen...');
  const suzenBody = await generateHighQualityReview(suzenReader);
  const suzenFrontmatter = readFileSync(join(__dirname, '../src/content/readers/keen/psychic-suzen-on-keen-review-2026.md'), 'utf8').split('---')[1];
  writeFileSync(join(__dirname, '../src/content/readers/keen/psychic-suzen-on-keen-review-2026.md'), `---\n${suzenFrontmatter}---\n\n${suzenBody}`);

  console.log('Generating Eli Casey...');
  const eliBody = await generateHighQualityReview(eliReader);
  const eliFrontmatter = readFileSync(join(__dirname, '../src/content/readers/keen/eli-casey.md'), 'utf8').split('---')[1];
  writeFileSync(join(__dirname, '../src/content/readers/keen/eli-casey.md'), `---\n${eliFrontmatter}---\n\n${eliBody}`);
  
  console.log('Done!');
}

run();
