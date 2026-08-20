import fs from 'fs';

const B = 'src/content/readers/kasamba/';
const fixes = [
  {
    file: B + 'ask-cristina-kasamba-review.md',
    from: '\\"dateModified\\": \\"2026-05-09. Standard rate $2.10/min.\\"',
    to: '\\"dateModified\\": \\"2026-05-09\\"',
  },
  {
    file: B + 'elizabeth-kasamba-review.md',
    from: '\\"dateModified\\": \\"2026-05-09. Standard rate $4.99/min.\\"',
    to: '\\"dateModified\\": \\"2026-05-09\\"',
  },
  {
    file: B + 'psychic-simmi-kasamba-review.md',
    from: '\\"dateModified\\": \\"2026-05-09. Standard rate $3.99/min.\\"',
    to: '\\"dateModified\\": \\"2026-05-09\\"',
  },
  {
    file: B + 'seek-chelle-kasamba-review.md',
    from: '\\"name\\": \\"Intuitive Energy Reading. Standard rate $9.98/min.\\"',
    to: '\\"name\\": \\"Intuitive Energy Reading\\"',
  },
];

let changed = 0;
for (const { file, from, to } of fixes) {
  const raw = fs.readFileSync(file, 'utf8');
  // The literal substring in the file uses backslash-escaped quotes.
  const target = from.replace(/\\\\/g, '\\');
  if (!raw.includes(target)) {
    console.log('WARN not found:', file, '::', target.slice(0, 40));
    continue;
  }
  const updated = raw.split(target).join(to.replace(/\\\\/g, '\\'));
  fs.writeFileSync(file, updated);
  changed++;
  console.log('FIXED:', file);
}
console.log('changed', changed, '/', fixes.length);
