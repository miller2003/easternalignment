const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/samja/Desktop/site/easternalignment/src/content/guides/';
const files = [
  'age-gap-relationship-psychics.md',
  'best-lgbtq-psychics-online.md',
  'best-love-psychics-kasamba-ranked.md',
  'best-love-psychics-keen-ex-recovery.md',
  'best-psychics-for-breakups.md',
  'best-soulmate-psychics-online.md',
  'best-tarot-readers-for-love.md',
  'best-twin-flame-psychics-online.md',
  'brutally-honest-psychics-keen.md',
  'cheap-love-psychics-online.md',
  'divorce-breakup-psychics-online.md',
  'does-he-like-me-psychics.md',
  'evidential-mediums-passed-spouse.md',
  'financial-motives-psychics.md',
  'kasamba-love-readings-review.md',
  'keen-ldr-timelines-close-the-gap.md',
  'keen-love-psychics-review.md',
  'long-distance-relationship-psychics.md',
  'love-after-loss-mediums.md',
  'love-or-career-psychics.md',
  'love-triangles-psychics.md',
  'online-dating-psychics.md',
  'other-woman-psychic-readings.md',
  'real-marriage-psychics.md',
  'single-parent-psychics.md',
  'when-will-i-get-married-psychics.md',
  'will-he-propose-psychics.md',
  'win-her-back-psychics.md'
];

const dates = [
  '2026-03-01', '2026-03-05', '2026-03-10', '2026-03-12', '2026-03-15', '2026-03-18', '2026-03-22', '2026-03-25', '2026-03-29',
  '2026-04-02', '2026-04-05', '2026-04-08', '2026-04-12', '2026-04-15', '2026-04-18', '2026-04-20', '2026-04-22', '2026-04-25', '2026-04-28', '2026-04-30',
  '2026-05-01', '2026-05-02', '2026-05-04', '2026-05-05', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10'
];

files.forEach((file, index) => {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/2026-05-15/g, dates[index]);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file} to ${dates[index]}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
