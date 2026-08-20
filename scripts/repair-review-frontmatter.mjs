#!/usr/bin/env node
// repair-review-frontmatter.mjs (v2 — line-array based, safe for multi-line YAML values)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.cwd());
const BASE = 'src/content/readers';

// ---------- hand-authored metaDescriptions (120–155 chars) ----------
const METAS = {
  'kasamba/david-james-kasamba-review.md': "David James on Kasamba: 111,359 readings since 2004, a 4.7 earned the hard way. Scottish no-sugarcoating style at $6.99/min — we read the bad reviews too.",
  'kasamba/divine-master-kasamba-review.md': "Divine Master on Kasamba: 77,204 readings since 2011, 4.9 stars, 35 years of experience. Love, breakup, and reunite guidance with timelines at $7.99/min.",
  'kasamba/golden-eye-kasamba-review.md': "Golden Eye on Kasamba: 113,722 readings since 2004, a 4.9, and a rare range — tarot, astrology, mediumship, numerology. Chat $4.99/min, voice $10.99/min.",
  'kasamba/immense-spark-n-au-kasamba-review.md': "Immense Spark on Kasamba: 66,152 readings since 2007, a 4.8, inherited gifts, and clients who've returned for a decade. Chat $10.99/min promo (reg. $21.99).",
  'kasamba/invincible-insights-kasamba-review.md': "Invincible Insights on Kasamba: a $1.99/min clairvoyant with 70,081 readings since 2015 and a soulmate-reunion specialism. Real pricing, method, and caveats.",
  'kasamba/love-specialist-isabelle-kasamba-review.md': "Love Specialist Isabelle on Kasamba: 99,057 readings since 2005, a perfect 5.0, and clients returning years later to confirm predictions. $14.99/min promo (reg. $29.99).",
  'kasamba/psychic-safina-kasamba-review.md': "Psychic Safina on Kasamba: 59,565 readings since 2007, a 4.9, and a third-generation psychic whose great-grandmother read a ragged Tarot deck. $7.99/min.",
  'kasamba/psychic-satire-kasamba-review.md': "Psychic Satire on Kasamba: a 4.7-star medium with 20,000+ reviews at $2.99/min (promo $1.49). Tested firsthand — method, spirit-guide readings, and honest fit.",
  'kasamba/psychic-yazmin-kasamba-review.md': "Psychic Yazmin on Kasamba: a perfect 5.0 across 119,836 readings since 2005 at $4.99/min. Her clients stay for months through the hardest seasons — we traced why.",
  'kasamba/raven-franks-kasamba-review.md': "Raven Franks on Kasamba: 67,179 readings since 2003, a perfect 5.0, remote viewer and top empath — 'the only reader I deal with.' $9.49/min promo (reg. $18.99).",
  'kasamba/seek-chelle-kasamba-review.md': "Seek Chelle on Kasamba: a 20-year intuitive with triple-clair gifts, 55,000+ readings, and a 5.0 — she surfaces the real question behind yours. $9.98/min chat.",
  'kasamba/supernormal-soul-kasamba-review.md': "Supernormal Soul on Kasamba: a 5.0-star clairvoyant 'Supreme Seer' with 54,000+ readings since 2017, love and soulmate focus. Chat $5.99/min, voice $39.99.",
  'kasamba/sweet-spirit-of-love-kasamba-review.md': "Sweet Spirit of Love on Kasamba: 69,177 readings since 2006 and a 4.6 earned in public — bad reviews included. Chat & voice $5.49/min, 3 free minutes.",
  'kasamba/truthful-visions-kasamba-review.md': "Truthful Visions on Kasamba: a 5.0-star intuitive with 55,271 readings since 2015, love and career specialist. Chat $4.99/min, voice $5.99 — real quotes and fit.",
  'kasamba/master-enigma-kasamba-review.md': "Master Enigma on Kasamba: 355,674 readings since 2007 and a perfect 5.0 — the platform's volume king. Chat $5.99/min promo (reg. $11.99). Who should book him.",
  'kasamba/love-stefans-psychic-soul-kasamba-review.md': "Love Stefan on Kasamba: 138,003 readings since 2007, a 4.9, and a Top 3 experience tag. Third-generation psychic at $5.49/min promo + 3 free minutes. Honest fit.",
  'kasamba/best-psychic-readings-kasamba-review.md': "Best Psychic Readings on Kasamba: 153,514 readings since 2003, a 4.9 across 40,000+ reviews, at $1.99/min — the lowest-risk first reading on the platform.",
  'kasamba/cosmic-fusion-kasamba-review.md': "Cosmic Fusion on Kasamba: a perfect 5.0 across 70,360 readings since 2011. Chat $3.99/min but voice $39.99 — a 10x gap we explain. The one rule before you book.",
  'kasamba/danielle-psychic-kasamba-review.md': "Danielle Psychic on Kasamba: 5.0 stars across 57,935 readings since 2008. Chat $4.99/min, voice $1.99/min (promos near $0.99). Her brutal-honesty love style, reviewed.",
  'kasamba/elizabeth-kasamba-review.md': "Elizabeth on Kasamba: a sixth-generation psychic and certified Reiki Master with 47,000+ readings since 2003, rated 4.8. $4.99/min (intro $2.49) — honest fit.",
  'kasamba/wisdom-and-love-kasamba-review.md': "Wisdom and Love on Kasamba: the No.2 psychic — 102,414 readings since 2004, a perfect 5.0, at $13.99/min chat promo. The priciest reader we cover, receipts included.",
  'keen/advisor-suzan.md': "Advisor Suzan on Keen: 4.98 stars across 136,000+ readings since 2005. $9.99/min clairvoyant empath for love — style, pricing, and honest fit reviewed.",
  'keen/arradaza.md': "Arradaza on Keen: a 4.93 across 26K ratings and a five-tool method refined over 25 years. $5.99/min — the '98% accuracy' claim, real clients, and honest fit.",
  'keen/ask-fran.md': "Ask Fran on Keen: 150K readings over 25 years and a polarizing 4.6. Why the same reader earns devotion and frustration — and the one move that changes it.",
  'keen/intuitive-azzy.md': "Intuitive Azzy on Keen: 4.9 stars across 3,100+ reviews at $2.22/min. Who she reads best, where the value holds, and the honest limits — reviewed.",
  'keen/psychic-suzen-on-keen-review-2026.md': "Psychic SuZen on Keen: life coach, social worker, and empath — 4.84★ across 8K ratings. Her action-oriented style, Women's Issues focus, and honest fit.",
  'keen/psychicreader19622-raymond-keen-review-2026.md': "psychicreader19622 (Raymond) on Keen: 98% five-star rating, Top Advisor badge, cartomancy with playing cards. What 19 years of readings say — honest fit.",
  'keen/gina-marie.md': "Gina Marie on Keen: 12,000 ratings across 20 years for a no-tools pure-channel clairvoyant. $6.99/min — what the record reveals and who gets value.",
  'keen/regina-jacks.md': "Regina Jacks on Keen: 109,000 readings and 18,000 verified ratings. Her clairvoyant-first style, pricing breakdown, and exactly who gets the most value.",
  'keen/the-psychic-one.md': "the psychic one on Keen: 183,000 sessions in 25 years and one bold promise — precise dates and details. Where her record holds, and who should book.",
  'keen/master-sher.md': "Master Sher on Keen: his tarot method, real accuracy standards, and pricing breakdown — an honest assessment from someone who's tested dozens of readers.",
  'keen/c-garrett.md': "C Garrett on Keen: 54,000 readings since 2001 and a 4.84. Her 75% energy, 25% tarot hybrid method, dream readings, and honest timing limits at $4.89/min.",
  'keen/david7.md': "David7 on Keen: 94,000 readings and a no-tools clairvoyant take on twin flames. $6.99/min — the male psychic perspective, real reviews, and who gets value.",
  'purple-garden/emmanuelle-berger.md': "Emmanuelle Berger on Purple Garden: the highest-volume soul-mate specialist — 76,154 readings since 2015 at 5.0. Chat $6.49/min, $30 free credit.",
};

// seoTitle formulas for the 6 rebuilt files: name -> {file, rating, rate}
const REBUILD = {
  'keen/c-garrett.md': { name: 'C Garrett', rating: '4.84', rate: '$4.89/min' },
  'keen/david7.md': { name: 'David7', rating: '4.9', rate: '$6.99/min' },
  'keen/gina-marie.md': { name: 'Gina Marie', rating: '4.87', rate: '$6.99/min' },
  'keen/master-sher.md': { name: 'Master Sher', rating: null, rate: null },
  'keen/regina-jacks.md': { name: 'Regina Jacks', rating: null, rate: null },
  'keen/the-psychic-one.md': { name: 'the psychic one', rating: null, rate: null },
};

const report = [];

function lines(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  return { arr: raw.split(/\r?\n/), eol };
}

// ---------- 1) rebuild the 6 malformed heads ----------
for (const [rel, cfg] of Object.entries(REBUILD)) {
  const fp = path.join(ROOT, BASE, rel);
  const { arr, eol } = lines(fp);
  // find title start / wedged seoTitle / continuation
  let ti = arr.findIndex(l => l.startsWith("title: '") && !l.trimEnd().endsWith("'"));
  if (ti === -1) { report.push(`[SKIP-REBUILD] ${rel} (no malformed title)`); continue; }
  const titlePart1 = arr[ti].slice("title: '".length).trimEnd();
  // seoTitle wedged line + continuation
  let cont = null, removeIdxs = [];
  if (arr[ti + 1] && arr[ti + 1].startsWith('seoTitle:')) {
    if (arr[ti + 2] && /^\s+/.test(arr[ti + 2]) && arr[ti + 2].trimEnd().endsWith("'")) {
      cont = arr[ti + 2].trim();
      removeIdxs = [ti + 1, ti + 2];
    } else { removeIdxs = [ti + 1]; }
  }
  const fullTitle = (titlePart1 + ' ' + (cont ? cont.replace(/'$/, '') : '')).replace(/\s+/g, ' ').trim();
  const newTitleLine = `title: '${fullTitle}'`;
  // build replacement lines for the title block
  arr.splice(ti, removeIdxs.length + 1, newTitleLine);
  // join multi-line description
  const di = arr.findIndex((l, ix) => ix > 0 && /^description: /.test(l) && !/^description: ['"]/.test(l));
  if (di !== -1) {
    let j = di + 1; const parts = [arr[di].replace(/^description: /, '')];
    while (j < arr.length && /^\s+\S/.test(arr[j]) && !arr[j].startsWith('customSchema')) { parts.push(arr[j].trim()); j++; }
    if (j > di + 1) {
      const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
      arr.splice(di, j - di, `description: "${joined.replace(/"/g, '\\"')}"`);
    }
  }
  // insert seoTitle + metaDescription right after title line (single-line values, safe)
  const ins = [];
  if (cfg.rating) ins.push(`seoTitle: "${cfg.name} Keen Review 2026: ${cfg.rating} Stars, ${cfg.rate}"`);
  if (METAS[rel]) ins.push(`metaDescription: "${METAS[rel].replace(/"/g, '\\"')}"`);
  arr.splice(ti + 1, 0, ...ins);
  fs.writeFileSync(fp, arr.join(eol));
  report.push(`[REBUILT] ${rel} (title joined, ${ins.length} keys inserted)`);
}

// ---------- 2) replace metaDescription lines (single-line, line-array based) ----------
for (const [rel, meta] of Object.entries(METAS)) {
  if (REBUILD[rel]) continue; // handled above
  const fp = path.join(ROOT, BASE, rel);
  const { arr, eol } = lines(fp);
  const mi = arr.findIndex(l => l.startsWith('metaDescription:'));
  if (mi === -1) { report.push(`[MISS] ${rel} has no metaDescription line`); continue; }
  arr[mi] = `metaDescription: "${meta.replace(/"/g, '\\"')}"`;
  fs.writeFileSync(fp, arr.join(eol));
  const len = meta.length;
  report.push(`[${len < 120 || len > 155 ? 'LEN!' : 'OK'} ${len}] ${rel}`);
}

// ---------- 3) jenny leftovers ----------
{
  const rel = 'kasamba/advisor-by-jenny-kasamba-review.md';
  const fp = path.join(ROOT, BASE, rel);
  let t = fs.readFileSync(fp, 'utf8');
  const before = t;
  t = t.split('"Advisor by Jenny Kasamba Review (2026): 50,170 Readings, from $1.99/min"').join('"Advisor by Jenny Kasamba Review (2026): 50,170 Readings, $3.99/min Chat"');
  t = t.split('50,170 readings since 2008, from $1.99/min. Method').join('50,170 readings since 2008. Chat $3.99/min, voice $5.99/min (promo from $1.99). Method');
  if (t !== before) { fs.writeFileSync(fp, t); report.push('[JENNY] schema name/reviewBody/seoTitle rate phrasing fixed'); }
  else report.push('[JENNY] no change (check manually)');
}

// ---------- 4) master-sher / regina-jacks / the-psychic-one seoTitle from fm ----------
for (const rel of Object.keys(REBUILD)) {
  const cfg = REBUILD[rel];
  if (cfg.rating) continue;
  const fp = path.join(ROOT, BASE, rel);
  const { arr, eol } = lines(fp);
  if (arr.some(l => l.startsWith('seoTitle:'))) continue;
  const raw = fs.readFileSync(fp, 'utf8');
  const end = raw.indexOf('\n---', 3);
  const fmRawTxt = raw.slice(3, end);
  const rating = (fmRawTxt.match(/^rating:\s*([\d.]+)/m) || [])[1];
  const pricing = (fmRawTxt.match(/^pricing:\s*([^\\\r\n]+)/m) || [])[1] || '';
  const rate = (pricing.match(/\$[\d.]+\/min/) || [''])[0];
  const ti = arr.findIndex(l => l.startsWith('title:'));
  arr.splice(ti + 1, 0, `seoTitle: "${cfg.name} Keen Review 2026: ${rating || 'Honest'} Stars${rate ? ', ' + rate : ''}"`);
  fs.writeFileSync(fp, arr.join(eol));
  report.push(`[SEOTITLE] ${rel} -> ${cfg.name} Keen Review 2026: ${rating || 'Honest'} Stars${rate ? ', ' + rate : ''}`);
}

console.log(report.join('\n'));
const bad = report.filter(r => r.startsWith('[LEN!') || r.startsWith('[MISS'));
console.log(`\nOut-of-range/missing: ${bad.length}`);
