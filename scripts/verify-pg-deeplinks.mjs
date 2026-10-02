#!/usr/bin/env node
/**
 * verify_pg_deeplinks.mjs
 *
 * 四向核验 Purple Garden 西语站「按人深层链接」是否真的全线接通：
 *
 *   ① 用户回填 txt（barges 生成的官方深链）
 *        ↓ 必须逐字符相等
 *   ② src/data/affiliateLinks.ts  key = purple-garden-es-<md-slug>
 *        ↓ 必须能生成 /go/<key>/ 路由
 *   ③ dist/go/purple-garden-es-<slug>/index.html  内嵌的 url 与 ① 一致
 *        ↓ 且页面 CTA 必须指向它
 *   ④ dist/es/resenas/purple-garden-es/<slug>/index.html  出现该 /go/ href
 *
 * 任何一环断裂 = 该篇文章的 CTA 静默走回平台级通用链接（丢归因）。
 *
 * 用法: node scripts/verify-pg-deeplinks.mjs [txt路径]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TXT = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Desktop/new30_official_urls.txt');

const errors = [];
const warns = [];
const ok = [];

// ── ① 解析用户回填 txt ────────────────────────────────────────────────────
const raw = fs.readFileSync(TXT, 'utf8');
const lines = raw.split(/\r?\n/);
/** @type {{idx:string,name:string,slug:string,official:string,tune:string}[]} */
const entries = [];
let cur = null;
for (const line of lines) {
  const mHead = line.match(/^(\d+)\.\s*(.+?)（advisor_id=(\d+)）/);
  if (mHead) { cur = { idx: mHead[1], name: mHead[2].trim(), advisorId: mHead[3] }; continue; }
  const mArticle = line.match(/^\s*文章:\s*\/es\/resenas\/purple-garden-es\/([^/]+)\//);
  if (mArticle && cur) { cur.slug = mArticle[1]; continue; }
  const mOfficial = line.match(/^\s*官网:\s*(\S+)/);
  if (mOfficial && cur) { cur.official = mOfficial[1]; continue; }
  const mTune = line.match(/^(https:\/\/bargestech\.go2cloud\.org\/aff_c\?\S+)$/);
  if (mTune && cur) { cur.tune = mTune[1]; entries.push(cur); cur = null; continue; }
}
console.log(`① txt 解析: ${entries.length} 条深链  (${TXT})`);
if (entries.length !== 30) errors.push(`txt 深链条数 = ${entries.length}，预期 30`);

// ── ② affiliateLinks.ts ──────────────────────────────────────────────────
const affSrc = fs.readFileSync(path.join(ROOT, 'src/data/affiliateLinks.ts'), 'utf8');
/** @type {Map<string,string>} */
const affMap = new Map();
for (const m of affSrc.matchAll(/^\s*"([^"]+)":\s*"([^"]+)",\s*$/gm)) affMap.set(m[1], m[2]);
const pgAffKeys = [...affMap.keys()].filter((k) => k.startsWith('purple-garden-es-'));
console.log(`② affiliateLinks.ts: 共 ${affMap.size} 条，其中 PG-西语按人深链 ${pgAffKeys.length} 条`);

// ── ③ ES_READER_URLS（前端 CTA 真源）────────────────────────────────────
const esOffersSrc = fs.readFileSync(path.join(ROOT, 'src/lib/esOffers.ts'), 'utf8');
const esReaderBlock = esOffersSrc.split('ES_READER_URLS')[1] || '';
/** @type {Map<string,string>} */
const esReaderUrls = new Map();
for (const m of esReaderBlock.matchAll(/'([^']+)':\s*'(\/go\/[^']+)'/g)) esReaderUrls.set(m[1], m[2]);
console.log(`   ES_READER_URLS: ${esReaderUrls.size} 条`);

// ── 逐条四向核验 ─────────────────────────────────────────────────────────
const DIST = path.join(ROOT, 'dist');
for (const e of entries) {
  const tag = `#${e.idx} ${e.slug}`;
  if (!e.slug) { errors.push(`${tag} 未解析到文章 slug`); continue; }
  if (!e.tune) { errors.push(`${tag} 未解析到深层链接`); continue; }

  // 官方链接 vs 深链里的 url= 参数（url 应等于官网 + clickid/utm 后缀）
  const enc = e.tune.split('&url=')[1] || '';
  let decoded = '';
  try { decoded = decodeURIComponent(enc); } catch { decoded = ''; }
  if (!decoded.startsWith(e.official + '?')) {
    errors.push(`${tag} 深链 url= 参数与官网链接不符: ${decoded.slice(0, 90)}`);
  }
  if (!e.tune.includes('offer_id=34')) errors.push(`${tag} 深链不是 offer_id=34`);
  if (!e.tune.includes('aff_id=2326')) errors.push(`${tag} 深链 aff_id 不是 2326`);
  if (!/clickid%3D\{transaction_id\}/.test(e.tune)) warns.push(`${tag} 深链缺 clickid={transaction_id} 宏`);

  // ② affiliateLinks.ts 逐字符比对
  const key = `purple-garden-es-${e.slug}`;
  const affUrl = affMap.get(key);
  if (!affUrl) {
    errors.push(`${tag} affiliateLinks.ts 缺少 "${key}" → /go/ 规则不存在`);
  } else if (affUrl !== e.tune) {
    errors.push(`${tag} affiliateLinks.ts[${key}] 与 txt 不一致\n     txt: ${e.tune}\n     src: ${affUrl}`);
  } else {
    ok.push(`${tag} affiliateLinks 一致`);
  }

  // ③ ES_READER_URLS 指到同一个 /go/ slug
  const esPath = esReaderUrls.get(e.slug);
  if (esPath !== `/go/${key}/`) {
    errors.push(`${tag} ES_READER_URLS["${e.slug}"] = ${esPath ?? '(缺失)'}，应为 /go/${key}/`);
  }

  // ④ dist 产物：/go/ 页内嵌 URL
  const goHtml = path.join(DIST, 'go', key, 'index.html');
  if (!fs.existsSync(goHtml)) {
    errors.push(`${tag} dist 缺少 /go/${key}/index.html（未构建或构建漏页）`);
  } else {
    const h = fs.readFileSync(goHtml, 'utf8');
    // Astro define:vars 会 JSON 序列化，URL 中的 / 不会被转义
    if (!h.includes(e.tune)) errors.push(`${tag} dist /go/${key}/ 内嵌 URL 与 txt 不一致`);
    if (!h.includes('offer_id=34') && !h.includes('offer_id\\u003d34') && !h.includes('offer_id=34'))
      errors.push(`${tag} dist /go/${key}/ 不是 offer 34`);
  }

  // ⑤ dist 文章页 CTA 指向该 /go/
  const revHtml = path.join(DIST, 'es', 'resenas', 'purple-garden-es', e.slug, 'index.html');
  if (!fs.existsSync(revHtml)) {
    errors.push(`${tag} dist 缺少评测页 /es/resenas/purple-garden-es/${e.slug}/`);
  } else {
    const rh = fs.readFileSync(revHtml, 'utf8');
    const selfCount = (rh.match(new RegExp(`href="/go/${key}/"`, 'g')) || []).length;
    const platformLevel = (rh.match(/href="\/go\/purple-garden-es\/"/g) || []).length;
    if (selfCount === 0) errors.push(`${tag} 评测页 CTA 未指向 /go/${key}/（按人深链未接线）`);
    else ok.push(`${tag} 评测页 ${selfCount} 处按人深链`);
    // 平台级链接：逐个定位来源 class，区分「设计如此」与「漏接线」
    for (const m of rh.matchAll(/<a href="\/go\/purple-garden-es\/"[^>]*class="([^"]*)"/g)) {
      const cls = m[1];
      if (/top-offer-bar/.test(cls)) ok.push(`${tag} 平台级链接@top-offer-bar（设计如此）`);
      else warns.push(`${tag} 平台级通用链接 /go/purple-garden-es/ 出现在 class="${cls}"（该位未按人化）`);
    }
    // 其它读师的深链（"otros lectores" 卡片）——属正常互链，全量列出以便人工确认
    const others = [...new Set((rh.match(/\/go\/purple-garden-es-[a-z0-9_-]+/g) || [])
      .map((s) => s.replace(/\/$/, '')))].filter((s) => s !== `/go/${key}`);
    const ghost = others.filter((s) => !affMap.has(s.replace('/go/', '')));
    if (ghost.length) errors.push(`${tag} 评测页含不存在的 /go/ slug: ${ghost.join(', ')}`);
  }
}

// ── 反向检查：src 有、txt 无 ─────────────────────────────────────────────
const txtKeys = new Set(entries.map((e) => `purple-garden-es-${e.slug}`));
for (const k of pgAffKeys) if (!txtKeys.has(k)) warns.push(`affiliateLinks.ts 多出未在 txt 中的深链: ${k}`);
for (const [slug, p] of esReaderUrls) {
  if (p.startsWith('/go/purple-garden-es-') && !esReaderUrls.has(slug)) continue;
}

// ── 路由/回传侧风险：offer_id → 平台码映射 ─────────────────────────────────
const goAstro = fs.readFileSync(path.join(ROOT, 'src/pages/go/[...slug].astro'), 'utf8');
const mapStr = (goAstro.match(/OFFER_TO_PLATFORM_CODE[^=]*=\s*\{([^}]*)\}/) || [])[1] || '';
const pbSrc = fs.readFileSync(path.join(ROOT, 'functions/api/postback.js'), 'utf8');
const pbMapStr = (pbSrc.match(/OFFER_TO_PLATFORM\s*=\s*\{([^}]*)\}/) || [])[1] || '';
const hasGo34 = /['"]34['"]/.test(mapStr);
const hasPb34 = /['"]34['"]/.test(pbMapStr);

// ── 输出 ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(72));
if (errors.length) {
  console.log(`❌ 错误 ${errors.length} 项：`);
  for (const e of errors) console.log('   ✗ ' + e);
} else {
  console.log('✅ 30 条 PG 西语深链：txt → affiliateLinks.ts → dist/go → 评测页 CTA 全链路一致');
}
if (warns.length) {
  console.log(`\n⚠️  提示 ${warns.length} 项：`);
  for (const w of warns) console.log('   · ' + w);
}
console.log('\n【回传侧 /go 平台码映射】');
console.log(`   src/pages/go/[...slug].astro OFFER_TO_PLATFORM_CODE 含 offer 34: ${hasGo34 ? '是' : '否'}`);
console.log(`   functions/api/postback.js OFFER_TO_PLATFORM 含 offer 34: ${hasPb34 ? '是' : '否'}`);
console.log(`   映射表(go): ${mapStr.replace(/\s+/g, ' ').trim()}`);
console.log(`   映射表(pb): ${pbMapStr.replace(/\s+/g, ' ').trim()}`);
console.log('─'.repeat(72));
console.log(`通过 ${ok.length} 项检查`);
process.exit(errors.length ? 1 : 0);
