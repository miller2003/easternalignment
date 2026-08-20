#!/usr/bin/env node
// validate-reviews.mjs  (v2 — calibrated)
// Audits every reader-review .md against REVIEW_CONTENT_PROMPT.md Hard Rules + quality bar.
// Layout renders H1 from frontmatter title, so body must NOT contain its own H1 (would duplicate).
// Usage: node scripts/validate-reviews.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd());
const REVIEW_DIR = path.join(ROOT, 'src/content/readers');
const AFF = path.join(ROOT, 'src/data/affiliateLinks.ts');

const affRaw = fs.readFileSync(AFF, 'utf8');
const slugKeys = new Set();
const re = /"([^"]+)":\s*"https?:/g;
let m;
while ((m = re.exec(affRaw)) !== null) slugKeys.add(m[1]);

const NETWORK_KEYWORD = { keen: /keen/i, kasamba: /kasamba/i, 'purple-garden': /purple\s*garden/i };
const GENERIC_PHRASES = [
  /in today's (fast-paced|fast paced|ever-changing|modern) world/i,
  /in the world of (psychic|tarot|love|spiritual)/i,
  /when it comes to (finding|choosing) (a|the) (psychic|reader)/i,
  /are you (looking|searching) for/i,
  /whether you'?re (a believer|skeptical)/i,
];
const SOURCE_RE = /(thepsychicreviews\.com|keen\.com|kasamba\.com|purplegarden\.co|purple-garden|reddit\.com|trustpilot|yelp\.com|\.forum|source:|according to|profile at|her profile|his profile|on (their|the) (page|profile))/i;

function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: null, body: raw, fmRaw: '' };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: null, body: raw, fmRaw: '' };
  const fmRaw = raw.slice(3, end).replace(/^---/, '').trim();
  const body = raw.slice(end + 4);
  let fm = null;
  try { fm = yaml.load(fmRaw); } catch { fm = null; }
  return { fm, body, fmRaw };
}

function rates(str) {
  const out = [];
  const r = /\$(\d+(?:\.\d+)?)\s*\/min/gi;
  let mm;
  while ((mm = r.exec(str || '')) !== null) out.push(mm[1]);
  return out;
}

function networkOf(fm, affUrl, slug) {
  const p = (fm.platform || fm.platformName || '').toString().toLowerCase();
  if (p.includes('keen')) return 'keen';
  if (p.includes('kasamba')) return 'kasamba';
  if (p.includes('purple')) return 'purple-garden';
  if ((slug || '').startsWith('keen')) return 'keen';
  if ((slug || '').startsWith('kasamba')) return 'kasamba';
  if ((slug || '').startsWith('purple-garden')) return 'purple-garden';
  if ((affUrl || '').includes('keen')) return 'keen';
  if ((affUrl || '').includes('kasamba')) return 'kasamba';
  if ((affUrl || '').includes('purple')) return 'purple-garden';
  return '';
}

function auditFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const { fm, body, fmRaw } = splitFrontmatter(raw);
  const issues = [], warns = [];
  let score = 100;

  if (!fm || typeof fm !== 'object') { issues.push('FRONTMATTER_UNPARSEABLE'); score -= 25; return { fp, score, issues, warns, fm, bodyLen: body.length }; }

  const title = (fm.title || '').toString();
  const bodyLines = body.split('\n');

  // H1: layout renders it -> body must NOT contain a duplicate H1
  let dupH1 = false;
  for (const ln of bodyLines) {
    const h = ln.trim().match(/^#\s+(.*)$/);
    if (h) { dupH1 = true; break; }
  }
  if (dupH1) { warns.push('DUP_H1_IN_BODY (layout already renders H1)'); score -= 4; }

  // CTA: exactly one HTML anchor to /go/, slug valid, mentions network
  const htmlCtas = (body.match(/<a\s+href="\/go\//gi) || []).length;
  const mdCtas = (body.match(/\]\((\/go\/[^)]*)\)/g) || []).length;
  if (htmlCtas !== 1) { issues.push(`CTA_HTML_COUNT=${htmlCtas} (expected 1)`); score -= 12; }
  if (mdCtas > 0) { issues.push(`CTA_MARKDOWN_DUP=${mdCtas}`); score -= 6; }

  const affUrl = fm.affiliateUrl || '';
  const slug = (affUrl.match(/\/go\/([^/]+)\//) || [])[1] || '';
  if (!slug) { issues.push('AFFILIATE_SLUG_MISSING'); score -= 8; }
  else if (!slugKeys.has(slug)) { issues.push(`SLUG_NOT_IN_AFFILIATELINKS:${slug}`); score -= 8; }
  else if (htmlCtas >= 1) {
    const ctaBlock = body.slice(body.lastIndexOf('<a href="/go/'));
    const net = networkOf(fm, affUrl, slug);
    if (net && !NETWORK_KEYWORD[net].test(ctaBlock)) { warns.push(`CTA_NETWORK_NAME_MISSING(${net})`); score -= 2; }
  }

  // JSON-LD (customSchema). NOTE: the layout auto-renders a Review schema from frontmatter,
  // so an Article-type customSchema is a valid complement — only Review-type must carry the rate.
  const schema = fm.customSchema;
  let schemaOk = false, schemaRate = null, schemaRating = null, schemaType = null;
  if (typeof schema === 'string') {
    try {
      const obj = JSON.parse(schema.replace(/“|”/g, '"'));
      schemaOk = true;
      schemaType = obj['@type'] || null;
      const rb = obj.reviewBody || '';
      const pr = rates(rb);
      if (pr.length) schemaRate = pr[pr.length - 1];
      const rv = obj.reviewRating && obj.reviewRating.ratingValue;
      schemaRating = rv != null ? parseFloat(rv) : null;
    } catch (e) { issues.push('JSONLD_INVALID:' + e.message.slice(0, 50)); score -= 10; }
  } else { issues.push('JSONLD_MISSING'); score -= 8; }

  // rating consistency (numeric)
  const fmRating = fm.rating != null ? parseFloat(fm.rating) : null;
  if (fmRating != null && schemaRating != null && Math.abs(fmRating - schemaRating) > 0.001) {
    issues.push(`RATING_MISMATCH fm=${fm.rating} schema=${schemaRating}`); score -= 6;
  }

  // pricing consistency: headline rate (schema) must appear in fm.pricing AND body
  const fmRates = rates(fm.pricing);
  const bodyRates = rates(body);
  if (schemaRate) {
    if (fmRates.length && !fmRates.includes(schemaRate)) {
      issues.push(`PRICE_MISMATCH schema=$${schemaRate} not in frontmatter($${fmRates.join('/')})`); score -= 8;
    }
    if (!bodyRates.includes(schemaRate)) { warns.push(`PRICE_NOT_IN_BODY $${schemaRate}`); score -= 3; }
  } else if (schemaOk && schemaType === 'Review') { warns.push('JSONLD_REVIEWBODY_NO_RATE'); score -= 2; }

  // pros/cons/verdict
  for (const key of ['pros', 'cons']) {
    const arr = fm[key];
    if (!Array.isArray(arr) || !arr.length) { issues.push(`${key.toUpperCase()}_EMPTY`); score -= 4; }
    else { const avg = arr.join(' ').length / arr.length; if (avg < 35) { warns.push(`${key}_GENERIC_SHORT(${avg.toFixed(0)}ch)`); score -= 2; } }
  }
  if ((fm.verdict || '').length < 80) { warns.push('VERDICT_SHORT'); score -= 2; }

  // meta/title
  if (!fm.seoTitle) { warns.push('SEO_TITLE_MISSING'); score -= 2; }
  const md = fm.metaDescription || '';
  if (md.length < 120 || md.length > 165) { warns.push(`META_LEN=${md.length}`); score -= 2; }
  if (!fm.description) { warns.push('DESC_MISSING'); score -= 1; }

  // AI tells
  for (const gp of GENERIC_PHRASES) { if (gp.test(body)) { warns.push('AI_TELL'); score -= 2; break; } }

  // fabrication risk: attributed/abundant quotes with no source anywhere in file
  const attributed = /["“][^"”]{15,}["”]\s*[—–,(]?\s*(?:said|told|wrote|posted|reported|noted|texted|messaged)/i.test(body);
  const quoteCount = (body.match(/"[^"]{20,}"/g) || []).length + (body.match(/“[^”]{20,}”/g) || []).length;
  const hasSource = SOURCE_RE.test(fmRaw + '\n' + body);
  if (attributed && !hasSource) { warns.push('FAB_QUOTE_RISK(no source)'); score -= 5; }
  else if (quoteCount >= 3 && !hasSource) { warns.push('QUOTE_NO_INLINE_SOURCE'); score -= 3; }

  // depth
  const bodyText = body.replace(/```[\s\S]*?```/g, '').trim();
  if (bodyText.length < 1500) { warns.push('SHALLOW_BODY'); score -= 3; }

  return { fp: path.relative(ROOT, fp), score: Math.max(0, score), issues, warns, fm, bodyLen: bodyText.length };
}

const results = [];
for (const net of ['keen', 'kasamba', 'purple-garden']) {
  const dir = path.join(REVIEW_DIR, net);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) results.push(auditFile(path.join(dir, f)));
}

results.sort((a, b) => a.score - b.score);
const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
console.log(`\n=== REVIEW AUDIT v2: ${results.length} files, avg ${avg.toFixed(1)} ===\n`);
const buckets = { fail: 0, weak: 0, ok: 0, good: 0, top: 0 };
for (const r of results) { const t = r.score < 70 ? 'FAIL' : r.score < 82 ? 'WEAK' : r.score < 90 ? 'OK' : r.score < 96 ? 'GOOD' : 'TOP'; buckets[t.toLowerCase()]++; }
console.log('Distribution:', JSON.stringify(buckets));
console.log('\n--- LOWEST 18 ---');
for (const r of results.slice(0, 18)) { console.log(`[${r.score}] ${r.fp}`); if (r.issues.length) console.log('   ISS ' + r.issues.join(' | ')); if (r.warns.length) console.log('   warn ' + r.warns.join(' | ')); }
console.log('\n--- HIGHEST 12 ---');
for (const r of results.slice(-12).reverse()) console.log(`[${r.score}] ${r.fp} (iss:${r.issues.length} warn:${r.warns.length} len:${r.bodyLen})`);

const freq = {};
for (const r of results) for (const i of r.issues) { const k = i.split(' ')[0].split(':')[0]; freq[k] = (freq[k] || 0) + 1; }
const wfreq = {};
for (const r of results) for (const w of r.warns) { const k = w.split(':')[0].split('(')[0].split('=')[0].trim(); wfreq[k] = (wfreq[k] || 0) + 1; }
console.log('\nISSUE FREQ:', JSON.stringify(freq));
console.log('WARN FREQ:', JSON.stringify(wfreq));
fs.writeFileSync(path.join(ROOT, 'scratch', 'review-audit.json'), JSON.stringify({ avg, buckets, results }, null, 2));
console.log('\nWrote scratch/review-audit.json');
