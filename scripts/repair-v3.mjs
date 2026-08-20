#!/usr/bin/env node
// repair-v3.mjs — fix 6 remaining frontmatter issues:
//  A) arradaza/ask-fran/intuitive-azzy: wedged seoTitle in multi-line title + orphaned
//     continuation lines under the replaced metaDescription
//  B) gina-marie/regina-jacks/the-psychic-one: duplicate metaDescription keys
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.cwd());
const BASE = 'src/content/readers';

function load(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  return { arr: raw.split(/\r?\n/), eol: raw.includes('\r\n') ? '\r\n' : '\n' };
}

// A) rebuild wedged-title files
for (const rel of ['keen/arradaza.md', 'keen/ask-fran.md', 'keen/intuitive-azzy.md']) {
  const fp = path.join(ROOT, BASE, rel);
  const { arr, eol } = load(fp);
  const ti = arr.findIndex(l => l.startsWith("title: '") && !l.trimEnd().endsWith("'"));
  if (ti === -1) { console.log('[SKIP] ' + rel); continue; }
  const part1 = arr[ti].slice("title: '".length).trimEnd();
  let seoLine = null, cont = null, span = 1;
  if (arr[ti + 1] && arr[ti + 1].startsWith('seoTitle:')) {
    seoLine = arr[ti + 1];
    span = 2;
    if (arr[ti + 2] && /^\s+/.test(arr[ti + 2]) && arr[ti + 2].trimEnd().endsWith("'")) { cont = arr[ti + 2].trim(); span = 3; }
  }
  const full = (part1 + ' ' + (cont ? cont.replace(/'$/, '') : '')).replace(/\s+/g, ' ').trim();
  const repl = [`title: '${full}'`];
  if (seoLine) repl.push(seoLine);
  arr.splice(ti, span, ...repl);
  // remove orphaned continuation lines after the single-line metaDescription
  const mi = arr.findIndex(l => l.startsWith('metaDescription:'));
  if (mi !== -1) {
    let j = mi + 1;
    while (j < arr.length && /^\s+\S/.test(arr[j])) j++;
    if (j > mi + 1) arr.splice(mi + 1, j - (mi + 1));
  }
  fs.writeFileSync(fp, arr.join(eol));
  console.log('[REBUILT-A] ' + rel);
}

// B) dedupe metaDescription (keep the clean inserted one, drop the original block)
for (const rel of ['keen/gina-marie.md', 'keen/regina-jacks.md', 'keen/the-psychic-one.md']) {
  const fp = path.join(ROOT, BASE, rel);
  const { arr, eol } = load(fp);
  const idxs = arr.reduce((a, l, i) => (l.startsWith('metaDescription:') ? (a.push(i), a) : a), []);
  if (idxs.length < 2) { console.log('[SKIP] ' + rel + ' (' + idxs.length + ' meta keys)'); continue; }
  // remove all but the first, from the last backwards
  for (let k = idxs.length - 1; k >= 1; k--) {
    const i = idxs[k];
    let j = i + 1;
    while (j < arr.length && /^\s+\S/.test(arr[j])) j++;  // swallow its continuation lines
    arr.splice(i, j - i);
  }
  fs.writeFileSync(fp, arr.join(eol));
  console.log('[DEDUPED-B] ' + rel);
}

// final YAML validity across all 114
import yaml from 'js-yaml';
const broken = [];
for (const d of ['keen', 'kasamba', 'purple-garden']) {
  for (const f of fs.readdirSync(path.join(ROOT, BASE, d))) {
    if (!f.endsWith('.md')) continue;
    const t = fs.readFileSync(path.join(ROOT, BASE, d, f), 'utf8');
    const end = t.indexOf('\n---', 3);
    try { const fm = yaml.load(t.slice(3, end)); if (!fm || !fm.title) broken.push(d + '/' + f); } catch (e) { broken.push(d + '/' + f + ' : ' + e.reason); }
  }
}
console.log(broken.length ? 'STILL BROKEN:\n' + broken.join('\n') : 'ALL 114 FRONTMATTERS VALID');
