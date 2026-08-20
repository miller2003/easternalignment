#!/usr/bin/env node
// apply-review-fixes.mjs — one-shot expert repair pass over reader reviews.
// Scope: everything EXCEPT inline source citations (user-excluded).
// Idempotent-ish; writes changelog to scratch/review-fixes-changelog.md
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd());
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'scratch/review-audit.json'), 'utf8'));
const changes = [];

function log(file, what) { changes.push({ file, what }); }

function splitFM(raw) {
  const end = raw.indexOf('\n---', 3);
  const fmRaw = raw.slice(3, end).replace(/^---/, '').trim();
  return { fmRaw, body: raw.slice(end + 4), fm: yaml.load(fmRaw) };
}

function readerName(fm) {
  const pn = fm.platformName || '';
  if (pn.includes(':')) return pn.split(':').slice(1).join(':').trim();
  const t = fm.title || '';
  const m = t.match(/^(.+?)\s+(?:on|Kasamba|Keen|Purple Garden)/);
  return m ? m[1].replace(/ Review.*$/, '').trim() : t.split(/[:—-]/)[0].trim();
}

function netOf(fm, fp) {
  if (/purple-garden/.test(fp)) return 'purple-garden';
  if (/kasamba/.test(fp)) return 'kasamba';
  if (/keen/.test(fp)) return 'keen';
  return (fm.platform || '').toLowerCase();
}

function firstRateSeg(pricing) {
  // "$5.99/min chat · ..." -> "$5.99/min chat"
  const m = (pricing || '').match(/\$[\d.]+\/min[^\n·]*?/);
  return m ? m[0].trim().replace(/\s+$/, '') : '';
}
function ratesIn(s) {
  const out = []; const r = /\$(\d+(?:\.\d+)?)\s*\/min/g; let m;
  while ((m = r.exec(s || '')) !== null) out.push(m[1]);
  return out;
}

function clampMeta(s) {
  s = String(s || '').trim().replace(/\s+/g, ' ');
  if (s.length <= 155) return s;
  const sentences = s.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
  let acc = '';
  for (const sent of sentences) {
    const cand = (acc + sent).trim();
    if (cand.length <= 155) acc = cand; else break;
  }
  if (acc.length >= 100 && acc.length <= 155) return acc;
  let cut = s.slice(0, 155);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('; '), cut.lastIndexOf(', '), cut.lastIndexOf(' — '));
  if (stop > 100) cut = s.slice(0, stop + 1);
  else cut = cut.slice(0, cut.lastIndexOf(' '));
  return cut.trim();
}

function promoPhrase(fm) {
  const fo = (fm.freeOffer || '').toString().trim();
  if (!fo) return '';
  return fo.replace(/\s*\(new[^)]*\)\s*/i, '').replace(/\.$/, '') + '.';
}

function buildMeta(fm) {
  let base = clampMeta(fm.description || '');
  if (base.length < 120) base = clampMeta((fm.description || '') + ' ' + promoPhrase(fm));
  if (base.length < 120) base = clampMeta(base + ' ' + (fm.bestFor || ''));
  return base;
}

function replaceLine(fmRaw, key, newVal) {
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(fmRaw)) return fmRaw.replace(re, `${key}: "${newVal.replace(/"/g, '\\"')}"`);
  return null;
}

const CTA_TEXT = {
  keen: n => `Book ${n} on Keen - First 5 Minutes for $1`,
  kasamba: n => `Book ${n} on Kasamba - First 3 Minutes Free + 50% Off`,
  'purple-garden': n => `Chat with ${n} on Purple Garden - $30 Free Credit`,
};

// ---------- generic fixers ----------

function removeDupH1(fp, raw, fm) {
  const { fmRaw, body } = splitFM(raw);
  const lines = body.split('\n');
  const idx = lines.findIndex(l => /^#\s+/.test(l.trim()));
  if (idx === -1) return raw;
  lines.splice(idx, 1);
  // collapse possible double blank left behind
  let out = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  // bold the reader name at the start of the first paragraph (site convention)
  const name = readerName(fm);
  if (name && !/^\*\*/.test(out.trim())) {
    out = out.replace(new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), (mm) => mm.replace(name, `**${name}**`));
  }
  log(fp, `removed duplicate in-body H1 (+bolded lede name)`);
  return `---\n${fmRaw}\n---${out.startsWith('\n') ? '' : '\n'}${out}`;
}

function insertCTA(fp, raw, fm) {
  const { fmRaw, body } = splitFM(raw);
  if (/<a\s+href="\/go\//i.test(body)) return raw;
  const net = netOf(fm, fp);
  const name = readerName(fm);
  const slug = (fm.affiliateUrl || '').replace(/\/$/, '');
  const cta = `<a href="${slug}/" rel="nofollow sponsored" target="_blank">${CTA_TEXT[net](name)}</a>`;
  const lines = body.split('\n');
  const moreIdx = lines.findIndex(l => /^\*\*More .+reviews:?\*\*/.test(l.trim()));
  let out;
  if (moreIdx !== -1) {
    // walk back to the '---' separator before the More-reviews block
    let ins = moreIdx;
    for (let i = moreIdx - 1; i >= 0; i--) {
      if (lines[i].trim() === '---') { ins = i; break; }
      if (lines[i].trim() !== '') { break; }
    }
    lines.splice(ins, 0, '', cta, '');
    out = lines.join('\n');
  } else {
    const disc = /reader-supported/.test(body) ? '' : '\n*Eastern Alignment is reader-supported. If you book through our links, we may earn a commission at no extra cost to you.*';
    out = body.replace(/\s+$/, '') + `\n\n---\n\n${cta}${disc}\n`;
  }
  log(fp, `inserted body CTA (${net})`);
  return `---\n${fmRaw}\n---${out.startsWith('\n') ? '' : '\n'}${out}`;
}

function fixMeta(fp, raw, fm) {
  const cur = (fm.metaDescription || '').toString();
  if (cur.length >= 120 && cur.length <= 155) return raw;
  let next;
  if (cur.length > 155) {
    next = clampMeta(cur);
    if (next.length < 100) next = clampMeta(fm.description || cur);
  } else {
    next = buildMeta(fm);
  }
  if (!(next.length >= 110 && next.length <= 155)) return raw; // give up rather than mangle
  const { fmRaw, body } = splitFM(raw);
  const replaced = replaceLine(fmRaw, 'metaDescription', next);
  if (!replaced) {
    // insert after description line
    const re = /^description:.*$/m;
    const ins = fmRaw.replace(re, m => m + `\nmetaDescription: "${next.replace(/"/g, '\\"')}"`);
    log(fp, `added metaDescription (${next.length}ch): ${next.slice(0, 60)}...`);
    return `---\n${ins}\n---${body}`;
  }
  log(fp, `metaDescription ${cur.length}->${next.length}ch`);
  return `---\n${replaced}\n---${body}`;
}

function fixSeoTitle(fp, raw, fm) {
  if (fm.seoTitle && String(fm.seoTitle).length > 30 && !/Psychic Satire Kasamba Review \(2026\)$/.test(fm.seoTitle)) return raw;
  const name = readerName(fm);
  const net = netOf(fm, fp);
  const netDisp = { keen: 'Keen', kasamba: 'Kasamba', 'purple-garden': 'Purple Garden' }[net];
  const rate = firstRateSeg(fm.pricing || '');
  const t = `${name} ${netDisp} Review 2026: ${fm.rating} Stars${rate ? ', ' + rate : ''}`;
  const { fmRaw, body } = splitFM(raw);
  const replaced = replaceLine(fmRaw, 'seoTitle', t);
  if (!replaced) return raw;
  log(fp, `seoTitle set: ${t}`);
  return `---\n${replaced}\n---${body}`;
}

function addRateToReviewSchema(fp, raw, fm) {
  if (typeof fm.customSchema !== 'string') return raw;
  let obj; try { obj = JSON.parse(fm.customSchema.replace(/“|”/g, '"')); } catch { return raw; }
  if (obj['@type'] !== 'Review') return raw; // Article-type: layout already emits Review
  if (ratesIn(obj.reviewBody || '').length) return raw;
  const seg = firstRateSeg(fm.pricing || '');
  if (!seg) return raw;
  const add = ` Standard rate ${seg}.`;
  // block format
  let out = raw.replace(/(^(\s*)"reviewBody": ")(.*)(",?\s*$)/m, (m0, a, b, c, d) => c.endsWith('.') ? a + c + add + d : a + c + '.' + add + d);
  if (out !== raw) { log(fp, `schema reviewBody +rate (${seg})`); return out; }
  // inline-string format
  const re = /(\\"reviewBody\\": \\")((?:[^"\\]|\\.)*)(\\")/;
  if (re.test(raw)) {
    out = raw.replace(re, (m0, a, c, d) => c.endsWith('.') ? a + c + add + d : a + c + '.' + add + d);
    if (out !== raw) { log(fp, `schema reviewBody +rate (${seg}) [inline]`); return out; }
  }
  return raw;
}

function addArticleSchema(fp, raw, fm) {
  if (fm.customSchema) return raw;
  const date = fm.publishDate || '2026-08-01';
  const upd = fm.updatedDate || date;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: fm.title,
    description: fm.description || fm.verdict || '',
    datePublished: String(date),
    dateModified: String(upd),
    author: { '@type': 'Organization', name: 'EasternAlignment', url: 'https://easternalignment.com' },
    publisher: { '@type': 'Organization', name: 'EasternAlignment', logo: { '@type': 'ImageObject', url: 'https://easternalignment.com/logo.jpg' } },
    about: [{ '@type': 'Thing', name: fm.platformName || fm.title }],
  };
  const json = JSON.stringify(schema, null, 2).split('\n').map(l => '  ' + l).join('\n');
  const { fmRaw, body } = splitFM(raw);
  log(fp, 'added Article customSchema (layout emits Review)');
  return `---\n${fmRaw}\ncustomSchema: |\n${json}\n---${body.startsWith('\n') ? '' : '\n'}${body}`;
}

function replaceProsCons(fp, raw, pros, cons) {
  let out = raw;
  const prosBlock = 'pros:\n' + pros.map(p => `- "${p}"`).join('\n');
  const consBlock = 'cons:\n' + cons.map(c => `- "${c}"`).join('\n');
  out = out.replace(/^pros:\n(?:- .*\n?)+/m, prosBlock + '\n');
  out = out.replace(/^cons:\n(?:- .*\n?)+/m, consBlock + '\n');
  log(fp, 'pros/cons made specific');
  return out;
}

// ---------- targeted manual patches ----------

const PATCHES = {
  'kasamba/advisor-by-jenny-kasamba-review.md': (raw) => {
    let out = raw;
    out = out.replace(
      'a natural-born psychic and tarot reader with an MBA, 50,170 readings since 2008, from $1.99/min. Method, real quotes, and fit.',
      'a natural-born psychic and tarot reader with an MBA, 50,170 readings since 2008. Chat $3.99/min, voice $5.99/min (promo from $1.99). Method, real quotes, and fit.'
    );
    out = out.replace('50,170 readings since 2008, from $1.99/min. Strengths', '50,170 readings since 2008. Chat $4.99/min');
    out = replaceProsCons('kasamba/advisor-by-jenny-kasamba-review.md', out,
      [
        'MBA + computer-science background brings structured, actionable advice to love readings',
        '50,170 readings since 2008 at promo rates from $1.99/min — rare experience-per-dollar value',
        '18 years on Kasamba with visibly loyal repeat clients',
      ],
      [
        '4.7 rating sits below the perfect-5.0 tier if you sort strictly by score',
        'Promo rates ($1.99–$2.99) are time-limited; standard $3.99 chat / $5.99 voice applies after',
        'Love-centred focus; weaker fit for career or finance questions',
      ]);
    return out;
  },
  'kasamba/danielle-psychic-kasamba-review.md': (raw) => {
    let out = raw;
    out = out.replace(
      '57,935 readings since 2008, from $0.99/min. Strengths, style, and who should book.',
      '57,935 readings since 2008. Chat $4.99/min, voice $1.99/min (promos near $0.99). Strengths, style, and who should book.'
    );
    out = out.replace('57,935 readings since 2008, from $0.99/min. Strengths, style, and who should book.', '57,935 readings since 2008. Voice from $1.99/min (promos near $0.99). Strengths, style, and who should book.');
    out = out.replace('description: "Independent review of Danielle Psychic on Kasamba — a 5.0-star clairaudient and clairvoyant since age 7, 57,935 readings since 2008, from $0.99/min.',
      'description: "Independent review of Danielle Psychic on Kasamba — a 5.0-star clairaudient and clairvoyant since age 7, 57,935 readings since 2008. Voice from $1.99/min (promos near $0.99).');
    out = out.replace('metaDescription: "Danielle Psychic on Kasamba: a natural-born clairaudient with 57,935 readings since 2008 at a perfect 5.0 stars, from $0.99/min. We review her brutal-honesty love style and real quotes."',
      'metaDescription: "Danielle Psychic on Kasamba: 5.0 stars across 57,935 readings since 2008. Chat $4.99/min, voice $1.99/min (promos near $0.99). Her brutal-honesty love style, reviewed."');
    return out;
  },
  'kasamba/psychic-satire-kasamba-review.md': (raw) => {
    let out = raw;
    out = out.replace('At $2.99 per minute (promo $1.49), Satire is priced', 'At $2.99/min (promo $1.49/min), Satire is priced');
    out = out.replace('At $2.99 per minute (promo $1.49), the financial stakes', 'At $2.99/min (promo $1.49/min), the financial stakes');
    out = out.replace('seoTitle: Psychic Satire Kasamba Review (2026)', 'seoTitle: "Psychic Satire Kasamba Review 2026: 4.7 Stars, 20,000+ Reviews, $2.99/min"');
    out = out.replace('metaDescription: Honest 2026 review of Psychic Satire on Kasamba — method, pricing, real client patterns, and who should book.',
      'metaDescription: "Psychic Satire on Kasamba: 4.7 stars across 20,000+ reviews, $2.99/min (promo $1.49). Mediumship and spirit-guide readings — method, pricing, honest fit."');
    return out;
  },
  'kasamba/supernormal-soul-kasamba-review.md': (raw) => replaceProsCons('kasamba/supernormal-soul-kasamba-review.md', raw,
    [
      'Perfect 5.0 across 54,000+ readings since 2017 — sustained at high volume, not a low-count fluke',
      'Certified-coach background gives sessions structure and action orientation, not just impressions',
      'Chat at $5.99/min is reasonable for a 5.0-rated veteran with eight years on the platform',
    ],
    [
      'Voice at $39.99/min is among the highest on the platform — chat is the sane default',
      'Love-and-soulmate focus; career and finance questions fit specialists better',
      'Marketing leans on soulmate tropes ("Supreme Seer") — judge the readings, not the branding',
    ]),
  'kasamba/invincible-insights-kasamba-review.md': (raw) => replaceProsCons('kasamba/invincible-insights-kasamba-review.md', raw,
    [
      '$1.99/min chat is among the lowest rates on Kasamba for a reader with 70,081 readings since 2015',
      'Born clairvoyant and clairaudient with a clear soulmate-reunion specialism',
      'A 20-minute chat runs under $40 — exceptional value for the experience level',
    ],
    [
      'Voice at $11.99/min is six times the chat rate — the value case is chat-only',
      '4.7 rating sits slightly below the platform\'s 5.0 leaders',
      'Reunion language should be held loosely, not treated as guarantees; love-focused over career',
    ]),
  'keen/advisor-suzan.md': (raw) => {
    let out = raw;
    out = out.replace('seoTitle: "Advisor Suzan on Keen Review 2026: The Truth About Her"',
      'seoTitle: "Advisor Suzan on Keen Review 2026: 4.98, 136,000 Readings, $9.99/min"');
    out = out.replace("publishDate: '2026-08-13'",
      `publishDate: '2026-08-13'\nmetaDescription: "Advisor Suzan on Keen: 4.98 stars across 136,000+ readings since 2005. $9.99/min clairvoyant empath for love — style, pricing, and honest fit reviewed."\npros:\n  - "136,000+ readings at 4.98 since 2005 — two decades of sustained top-tier performance"\n  - "Clairvoyant empath who connects fast: clients report accuracy with almost no upfront context"\n  - "Deep love & relationships specialization with an empowerment-focused delivery"\ncons:\n  - "Optimistic highest-outcome framing — critics call it fairy-tale reading; not for doom-seekers"\n  - "$9.99/min sits at the top of Keen's standard band — the $1 trial matters"\n  - "Supportive energy over blunt fatalism; look elsewhere for cold, hard verdicts"`);
    return out;
  },
};

// ---------- main loop ----------

let fixed = 0;
for (const r of audit.results) {
  const rel = r.fp.replace(/\\/g, '/');
  const fp = path.join(ROOT, rel);
  let raw = fs.readFileSync(fp, 'utf8');
  const before = raw;
  const { fm } = splitFM(raw);
  if (!fm) continue;

  const hasIssue = pred => r.issues.some(pred) || r.warns.some(pred);
  const needsCTA = hasIssue(i => i.startsWith('CTA_HTML_COUNT=0'));
  const needsH1 = r.warns.includes('DUP_H1_IN_BODY (layout already renders H1)');
  const needsMeta = hasIssue(w => w.startsWith('META_LEN'));
  const needsSeo = r.warns.includes('SEO_TITLE_MISSING');
  const needsSchema = r.issues.includes('JSONLD_MISSING');

  const key = rel.replace('src/content/readers/', '');
  if (PATCHES[key]) raw = PATCHES[key](raw);

  if (needsSchema) raw = addArticleSchema(rel, raw, fm);
  if (needsH1) raw = removeDupH1(rel, raw, fm);
  if (needsCTA) raw = insertCTA(rel, raw, fm);
  if (needsSeo) raw = fixSeoTitle(rel, raw, fm);
  if (needsMeta) raw = fixMeta(rel, raw, fm);
  raw = addRateToReviewSchema(rel, raw, fm);

  if (raw !== before) { fs.writeFileSync(fp, raw); fixed++; }
}

// changelog
const cl = ['# Review fixes changelog (2026-08-20)', '', `Files modified: ${fixed}`, ''] +
  changes.map(c => `- **${c.file}**: ${c.what}`).join('\n') + '\n';
fs.writeFileSync(path.join(ROOT, 'scratch', 'review-fixes-changelog.md'), cl);
console.log(`Modified ${fixed} files. Changelog: scratch/review-fixes-changelog.md`);
console.log(`Total individual changes: ${changes.length}`);
