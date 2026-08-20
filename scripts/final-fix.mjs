#!/usr/bin/env node
// final-fix.mjs — CRLF-tolerant pros/cons + inline-schema rate injection
import fs from 'node:fs';
import yaml from 'js-yaml';
const B = 'src/content/readers/';

const PROSCONS = {
  'kasamba/advisor-by-jenny-kasamba-review.md': {
    pros: ['MBA + computer-science background brings structured, actionable advice to love readings',
      '50,170 readings since 2008 at promo rates from $1.99/min — rare experience-per-dollar value',
      '18 years on Kasamba with visibly loyal repeat clients'],
    cons: ['4.7 rating sits below the perfect-5.0 tier if you sort strictly by score',
      'Promo rates ($1.99–$2.99) are time-limited; standard $3.99 chat / $5.99 voice applies after',
      'Love-centred focus; weaker fit for career or finance questions'],
  },
  'kasamba/supernormal-soul-kasamba-review.md': {
    pros: ['Perfect 5.0 across 54,000+ readings since 2017 — sustained at high volume, not a low-count fluke',
      'Certified-coach background gives sessions structure and action orientation, not just impressions',
      'Chat at $5.99/min is reasonable for a 5.0-rated veteran with eight years on the platform'],
    cons: ['Voice at $39.99/min is among the highest on the platform — chat is the sane default',
      'Love-and-soulmate focus; career and finance questions fit specialists better',
      'Marketing leans on soulmate tropes ("Supreme Seer") — judge the readings, not the branding'],
  },
  'kasamba/invincible-insights-kasamba-review.md': {
    pros: ['$1.99/min chat is among the lowest rates on Kasamba for a reader with 70,081 readings since 2015',
      'Born clairvoyant and clairaudient with a clear soulmate-reunion specialism',
      'A 20-minute chat runs under $40 — exceptional value for the experience level'],
    cons: ['Voice at $11.99/min is six times the chat rate — the value case is chat-only',
      "4.7 rating sits slightly below the platform's 5.0 leaders",
      'Reunion language should be held loosely, not treated as guarantees; love-focused over career'],
  },
};

for (const [rel, pc] of Object.entries(PROSCONS)) {
  const fp = B + rel;
  const raw = fs.readFileSync(fp, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const arr = raw.split(/\r?\n/);
  const replBlock = (key, items) => {
    const i = arr.findIndex(l => l === key + ':');
    if (i === -1) return false;
    let j = i + 1;
    while (j < arr.length && /^-\s/.test(arr[j])) j++;
    arr.splice(i + 1, j - (i + 1), ...items.map(x => `- "${x.replace(/"/g, '\\"')}"`));
    return true;
  };
  const p = replBlock('pros', pc.pros);
  const c = replBlock('cons', pc.cons);
  fs.writeFileSync(fp, arr.join(eol));
  console.log(`[PROSCONS ${p && c ? 'OK' : 'FAIL'}] ${rel}`);
}

// inline-schema rate injection (parse -> modify -> rewrite line)
for (const rel of ['kasamba/ask-cristina-kasamba-review.md', 'kasamba/elizabeth-kasamba-review.md', 'kasamba/psychic-simmi-kasamba-review.md', 'kasamba/seek-chelle-kasamba-review.md']) {
  const fp = B + rel;
  const raw = fs.readFileSync(fp, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const arr = raw.split(/\r?\n/);
  const ci = arr.findIndex(l => l.startsWith('customSchema:'));
  if (ci === -1) { console.log('[SCHEMA MISS] ' + rel); continue; }
  // reconstruct schema text: inline string (single line) or | block (following indented lines)
  let schemaText, isBlock = arr[ci].trimEnd().endsWith('|');
  if (isBlock) {
    let j = ci + 1; const parts = [];
    while (j < arr.length && (arr[j].startsWith('  ') || arr[j] === '')) { parts.push(arr[j].slice(2)); j++; }
    schemaText = parts.join('\n');
  } else {
    schemaText = yaml.load(arr[ci].replace(/^customSchema:\s*/, ''));
  }
  let obj;
  try { obj = JSON.parse(schemaText.replace(/“|”/g, '"')); } catch (e) { console.log('[SCHEMA PARSE FAIL] ' + rel); continue; }
  if (/\$[\d.]+\/min/.test(obj.reviewBody || '')) { console.log('[SCHEMA HAS RATE] ' + rel); continue; }
  // rate from pricing line
  const pi = arr.findIndex(l => l.startsWith('pricing:'));
  const rate = ((arr[pi] || '').match(/\$[\d.]+\/min/) || [''])[0];
  if (!rate) { console.log('[NO PRICING RATE] ' + rel); continue; }
  const rb = obj.reviewBody || '';
  obj.reviewBody = (rb.endsWith('.') || rb === '' ? rb : rb + '.') + ` Standard rate ${rate}.`;
  const jsonText = JSON.stringify(obj, null, 2);
  if (isBlock) {
    const indented = jsonText.split('\n').map(l => '  ' + l);
    let j = ci + 1;
    while (j < arr.length && (arr[j].startsWith('  ') || arr[j] === '')) j++;
    arr.splice(ci + 1, j - (ci + 1), ...indented);
  } else {
    arr[ci] = 'customSchema: ' + JSON.stringify(jsonText);
  }
  fs.writeFileSync(fp, arr.join(eol));
  console.log(`[SCHEMA +RATE ${rate}] ${rel}`);
}
