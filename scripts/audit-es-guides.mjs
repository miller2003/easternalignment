/**
 * audit-es-guides.mjs — auditoría previa al despliegue de /es/guias/
 * Ejecutar: node scripts/audit-es-guides.mjs
 *
 * Las rutas /es/guias/ leen con import.meta.glob (sin zod), así que este
 * script ES la validación. Comprueba:
 *  A. frontmatter obligatorio, categoría y plataforma válidas
 *  B. longitudes SEO (seoTitle ≤ 65, metaDescription 120–160)
 *  C. ctaReader / featuredReaders existen en es-readers y en ES_READER_URLS
 *  D. todo /go/<slug>/ del cuerpo existe en affiliateLinks.ts y no cruza plataformas
 *  E. todo enlace interno /es/... del cuerpo resuelve a una página real
 *  F. FAQ completas (respuesta ≥ 60 caracteres)
 *  G. párrafos duplicados entre guías
 *  H. restos en inglés habituales
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const GUIDES = path.join(ROOT, 'src/content/es-guides');
const READERS = path.join(ROOT, 'src/content/es-readers');
const CATEGORIES = ['amor', 'tarot', 'senales', 'consultante'];
const PLATFORMS = ['psiquicos', 'purple-garden-es'];
const REQUIRED = ['title', 'seoTitle', 'metaDescription', 'description', 'category', 'publishDate', 'platform', 'keywords', 'shortAnswer', 'faq'];

const errs = [];
const warns = [];
const err = (f, m) => errs.push(`[${f}] ${m}`);
const warn = (f, m) => warns.push(`[${f}] ${m}`);

// ── fuentes de verdad ─────────────────────────────────────────────────────
const affSrc = fs.readFileSync(path.join(ROOT, 'src/data/affiliateLinks.ts'), 'utf8');
const affSlugs = new Set([...affSrc.matchAll(/^\s*"([a-z0-9_\-]+)"\s*:\s*"https?:/gim)].map((m) => m[1]));
const esOffers = fs.readFileSync(path.join(ROOT, 'src/lib/esOffers.ts'), 'utf8');
const readerUrls = {};
for (const m of esOffers.split('export const ES_READER_URLS')[1].split('\n};')[0].matchAll(/^\s*'?([a-z0-9_-]+)'?:\s*'(\/go\/[^']+)'/gim)) readerUrls[m[1]] = m[2];

const readers = {}; // slug -> folder
for (const folder of fs.readdirSync(READERS)) {
  for (const f of fs.readdirSync(path.join(READERS, folder))) {
    if (f.endsWith('.md') && !f.startsWith('_')) readers[f.replace(/\.md$/, '')] = folder;
  }
}

const guideFiles = fs.readdirSync(GUIDES).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
const guideSlugs = new Set(guideFiles.map((f) => f.replace(/\.md$/, '')));
const STATIC_ES = new Set(['/es/', '/es/resenas/', '/es/resenas/psiquicos-web/', '/es/resenas/purple-garden-es/', '/es/guias/', '/es/acerca-de/', '/es/divulgacion/', '/es/privacidad/', '/es/terminos/']);

const resolveEs = (href) => {
  const u = href.split('#')[0];
  if (STATIC_ES.has(u)) return true;
  let m = u.match(/^\/es\/guias\/([a-z0-9-]+)\/$/);
  if (m) return guideSlugs.has(m[1]);
  m = u.match(/^\/es\/resenas\/(psiquicos-web|purple-garden-es)\/([a-z0-9_-]+)\/$/);
  if (m) return readers[m[2]] === m[1];
  return false;
};

const norm = (s) => s.toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const seenPara = new Map();
const stats = [];

for (const f of guideFiles) {
  const raw = fs.readFileSync(path.join(GUIDES, f), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) { err(f, 'sin frontmatter'); continue; }
  let fm;
  try { fm = YAML.parse(m[1]); } catch (e) { err(f, `YAML: ${e.message}`); continue; }
  const body = raw.slice(m[0].length);

  // A
  for (const k of REQUIRED) {
    const v = fm[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) err(f, `falta ${k}`);
  }
  if (fm.category && !CATEGORIES.includes(fm.category)) err(f, `category inválida: ${fm.category}`);
  if (fm.platform && !PLATFORMS.includes(fm.platform)) err(f, `platform inválida: ${fm.platform}`);
  if (fm.publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(fm.publishDate)) err(f, 'publishDate no es YYYY-MM-DD');

  // B
  const tl = [...(fm.seoTitle || '')].length;
  if (tl > 65) err(f, `seoTitle ${tl} > 65`);
  else if (tl < 30) warn(f, `seoTitle corto (${tl})`);
  const ml = [...(fm.metaDescription || '')].length;
  if (ml < 120 || ml > 160) err(f, `metaDescription ${ml} (120–160)`);

  // C
  const platFolder = fm.platform === 'psiquicos' ? 'psiquicos-web' : 'purple-garden-es';
  if (fm.ctaReader) {
    if (!readers[fm.ctaReader]) err(f, `ctaReader sin reseña: ${fm.ctaReader}`);
    else if (readers[fm.ctaReader] !== platFolder) err(f, `ctaReader ${fm.ctaReader} no es de la plataforma ${fm.platform}`);
    if (!readerUrls[fm.ctaReader]) err(f, `ctaReader sin deeplink en ES_READER_URLS: ${fm.ctaReader}`);
  }
  for (const r of fm.featuredReaders || []) {
    if (!readers[r]) err(f, `featuredReaders sin reseña: ${r}`);
    if (!readerUrls[r]) err(f, `featuredReaders sin deeplink: ${r}`);
  }

  // D
  const goLinks = [...body.matchAll(/\/go\/([a-z0-9_\-]+)\//gi)].map((x) => x[1]);
  for (const s of new Set(goLinks)) {
    if (!affSlugs.has(s)) err(f, `/go/${s}/ no existe en affiliateLinks.ts`);
    if (!/^(psiquicos|purple-garden-es)/.test(s)) err(f, `/go/${s}/ no es una oferta del subsitio /es`);
  }
  // cada /go/ por lector debe corresponder a la reseña enlazada del mismo lector
  for (const [slug, url] of Object.entries(readerUrls)) {
    const go = url.replace(/^\/go\/|\/$/g, '');
    if (goLinks.includes(go) && !body.includes(`/es/resenas/${readers[slug]}/${slug}/`)) warn(f, `deeplink ${go} sin enlace a la reseña de ${slug}`);
  }

  // E
  for (const x of body.matchAll(/(?:\]\(|href=")(\/es\/[^)"\s]*)/g)) {
    if (!resolveEs(x[1])) err(f, `enlace interno roto: ${x[1]}`);
  }
  for (const x of body.matchAll(/(?:\]\(|href=")(\/(?!es\/|go\/)[^)"\s]*)/g)) err(f, `enlace a página no /es: ${x[1]}`);

  // F
  (fm.faq || []).forEach((q, i) => {
    if (!q?.question || !q?.answer) err(f, `faq[${i}] incompleta`);
    else if ([...q.answer].length < 60) err(f, `faq[${i}] respuesta corta`);
  });

  // G
  for (const p of body.split(/\n\s*\n/).map(norm).filter((p) => [...p].length > 140)) {
    if (seenPara.has(p) && seenPara.get(p) !== f) err(f, `párrafo duplicado con ${seenPara.get(p)}: "${p.slice(0, 60)}…"`);
    else seenPara.set(p, f);
  }

  // H
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\]\([^)]*\)/g, ']');
  for (const [re, label] of [[/\bthe\b/gi, 'the'], [/\band\b/gi, 'and'], [/\bfree\b/gi, 'free'], [/\breview\b/gi, 'review'], [/\brating\b/gi, 'rating'], [/\bemail\b/gi, 'email']]) {
    const h = text.match(re);
    if (h) warn(f, `posible inglés [${label}] ×${h.length}`);
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  stats.push({ guía: f.replace(/\.md$/, ''), palabras: words, h2: (body.match(/^## /gm) || []).length, go: goLinks.length, faq: (fm.faq || []).length, seoTitle: tl, metaDesc: ml });
}

console.table(stats);
console.log(`\nERR (${errs.length})`);
errs.forEach((e) => console.log('  ✗ ' + e));
console.log(`\nWARN (${warns.length})`);
warns.forEach((w) => console.log('  • ' + w));
process.exit(errs.length ? 1 : 0);
