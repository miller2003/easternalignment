/**
 * predeploy_audit.mjs — 西语分站上线前全量审计
 * 运行: node scripts/predeploy-audit.mjs
 *
 * 检查项:
 *  A. frontmatter 必填字段 / 平台一致性 / canonical 一致性
 *  B. SEO 长度 (seoTitle / metaDescription / title)
 *  C. 头像 + OG 文件是否落盘
 *  D. 正文 CTA 深链 vs ES_READER_URLS 一致性
 *  E. 正文内所有 /go/ 引用是否在 affiliateLinks.ts 中存在
 *  F. ES_READER_URLS / affiliateLinks.ts / md 文件 三向集合一致
 *  G. 内容重复度 (重复句子 / 重复段落)
 *  H. 双语残留与常见西语错误扫描
 */
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const ES_CONTENT = path.join(ROOT, 'src/content/es-readers');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PLATFORMS = [
  { folder: 'purple-garden-es', key: 'purple-garden-es', route: 'purple-garden-es', label: 'Purple Garden' },
  { folder: 'psiquicos-web', key: 'psiquicos', route: 'psiquicos-web', label: 'Psíquicos Web' },
];

const issues = [];
const warn = [];
const add = (sev, file, msg) => (sev === 'ERR' ? issues : warn).push({ file, msg });

// ── 载入 ES_READER_URLS ────────────────────────────────────────────────────
const esOffersSrc = fs.readFileSync(path.join(ROOT, 'src/lib/esOffers.ts'), 'utf8');
const readerUrls = {};
{
  const block = esOffersSrc.split('export const ES_READER_URLS')[1].split('\n};')[0];
  for (const m of block.matchAll(/^\s*'?([a-z0-9_-]+)'?:\s*'(\/go\/[^']+)'/gim)) {
    readerUrls[m[1]] = m[2];
  }
}

// ── 载入 affiliateLinks.ts 的 slug 集合 ───────────────────────────────────
const affSrc = fs.readFileSync(path.join(ROOT, 'src/data/affiliateLinks.ts'), 'utf8');
const affSlugs = new Set();
for (const m of affSrc.matchAll(/^\s*"([a-z0-9_\-]+)"\s*:\s*"(https?:[^"]+)"/gim)) {
  affSlugs.add(m[1]);
}
const affUrl = {};
for (const m of affSrc.matchAll(/^\s*"([a-z0-9_\-]+)"\s*:\s*"(https?:[^"]+)"/gim)) {
  affUrl[m[1]] = m[2];
}

// ── 遍历 md ───────────────────────────────────────────────────────────────
const records = {};
for (const p of PLATFORMS) {
  const dir = path.join(ES_CONTENT, p.folder);
  records[p.folder] = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md') || f.startsWith('_')) continue;
    const slug = f.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!fmMatch) { add('ERR', `${p.folder}/${f}`, '缺少 frontmatter 分隔符'); continue; }
    let fm;
    try { fm = YAML.parse(fmMatch[1]); }
    catch (e) { add('ERR', `${p.folder}/${f}`, `YAML 解析失败: ${e.message}`); continue; }
    const body = raw.slice(fmMatch[0].length);
    records[p.folder].push({ slug, f, fm, body, platform: p });
  }
}

// ── A/B/C/D/E 逐篇检查 ────────────────────────────────────────────────────
const REQUIRED = ['title', 'seoTitle', 'metaDescription', 'description', 'platformName',
  'platform', 'rating', 'verdict', 'pricing', 'bestFor', 'publishDate', 'canonicalUrl',
  'avatarUrl', 'ogImage', 'freeOffer', 'entities', 'pros', 'cons'];

for (const p of PLATFORMS) {
  for (const r of records[p.folder]) {
    const tag = `${p.folder}/${r.f}`;
    const fm = r.fm;
    for (const k of REQUIRED) {
      const v = fm[k];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        add('ERR', tag, `frontmatter 缺字段/为空: ${k}`);
      }
    }
    // 平台一致性
    if (fm.platform !== p.key) add('ERR', tag, `platform="${fm.platform}" 应为 "${p.key}"`);
    // canonical
    const expCanon = `https://easternalignment.com/es/resenas/${p.route}/${r.slug}/`;
    if (fm.canonicalUrl && fm.canonicalUrl !== expCanon) {
      add('ERR', tag, `canonicalUrl 不匹配\n      实际: ${fm.canonicalUrl}\n      期望: ${expCanon}`);
    }
    // platformName 前缀
    if (fm.platformName && !fm.platformName.includes(':')) add('ERR', tag, `platformName 缺少 "平台: 名字" 格式: ${fm.platformName}`);
    // 资产落盘
    for (const key of ['avatarUrl', 'ogImage']) {
      const v = fm[key];
      if (typeof v === 'string' && v.startsWith('/')) {
        if (!fs.existsSync(path.join(PUBLIC_DIR, v))) add('ERR', tag, `${key} 文件不存在: ${v}`);
      }
    }
    // SEO 长度
    if (typeof fm.seoTitle === 'string') {
      const n = [...fm.seoTitle].length;
      if (n > 65) add('ERR', tag, `seoTitle ${n} 字符 (>65): ${fm.seoTitle}`);
      else if (n < 25) warn.push({ file: tag, msg: `seoTitle 偏短 ${n} 字符: ${fm.seoTitle}` });
    }
    if (typeof fm.metaDescription === 'string') {
      const n = [...fm.metaDescription].length;
      if (n < 110 || n > 165) add('ERR', tag, `metaDescription ${n} 字符 (期望 120-160): ${fm.metaDescription.slice(0, 70)}...`);
    }
    if (typeof fm.title === 'string') {
      const n = [...fm.title].length;
      if (n > 110) warn.push({ file: tag, msg: `title 偏长 ${n} 字符` });
    }
    if (typeof fm.verdict === 'string' && [...fm.verdict].length < 80) {
      add('ERR', tag, `verdict 过短 (${[...fm.verdict].length} 字符)`);
    }
    // pricing 格式统一
    if (typeof fm.pricing === 'string' && !/\/min/.test(fm.pricing) && !/gratis|varía|según/i.test(fm.pricing)) {
      warn.push({ file: tag, msg: `pricing 未带 /min: "${fm.pricing}"` });
    }
    // FAQ
    const faq = fm.faq;
    if (!Array.isArray(faq) || faq.length === 0) add('ERR', tag, 'frontmatter 无 faq 条目');
    else {
      faq.forEach((it, i) => {
        if (!it?.question || !it?.answer) add('ERR', tag, `faq[${i}] 缺 question/answer`);
        else if ([...it.answer].length < 60) add('ERR', tag, `faq[${i}] answer 过短 (${[...it.answer].length})`);
      });
    }
    // 正文 CTA
    const goLinks = [...r.body.matchAll(/\/go\/([a-z0-9_\-]+)\//gim)].map((m) => m[1]);
    const expected = readerUrls[r.slug];
    if (!expected) add('ERR', tag, `ES_READER_URLS 中无该 slug → CTA 会回退平台级链接`);
    else {
      const exp = expected.replace(/^\/go\/|\/$/g, '');
      if (!goLinks.includes(exp)) {
        add('ERR', tag, `正文未出现按人深链 /go/${exp}/ (实际正文 /go/: ${[...new Set(goLinks)].join(', ') || '无'})`);
      }
    }
    // 正文所有 /go/ 引用必须存在
    for (const s of new Set(goLinks)) {
      if (!affSlugs.has(s)) add('ERR', tag, `正文引用不存在的 /go/ slug: ${s}`);
    }
    // 平台级误用
    const wrongPlatform = p.folder === 'psiquicos-web' ? 'purple-garden-es' : 'psiquicos';
    for (const s of new Set(goLinks)) {
      if (s === wrongPlatform || (wrongPlatform === 'psiquicos' && s.startsWith('psiquicos'))) {
        add('ERR', tag, `跨平台 /go/ 链接: ${s}`);
      }
      if (p.folder === 'purple-garden-es' && s === 'purple-garden-es') {
        add('ERR', tag, `PG 文章仍使用平台级通用链接 /go/purple-garden-es/（应为按人深链）`);
      }
    }
  }
}

// ── F. 三向集合一致性 ─────────────────────────────────────────────────────
const mdSlugs = new Set();
for (const p of PLATFORMS) for (const r of records[p.folder]) mdSlugs.add(r.slug);
const pgMd = new Set(records['purple-garden-es'].map((r) => r.slug));
const psiMd = new Set(records['psiquicos-web'].map((r) => r.slug));

const pgMapKeys = Object.keys(readerUrls).filter((k) => readerUrls[k].includes('purple-garden-es'));
const psiMapKeys = Object.keys(readerUrls).filter((k) => readerUrls[k].includes('/go/psiquicos-'));
for (const k of pgMapKeys) if (!pgMd.has(k)) add('ERR', 'esOffers.ts', `ES_READER_URLS 有 PG 条目但无对应 md: ${k}`);
for (const k of pgMd) if (!readerUrls[k]) add('ERR', 'esOffers.ts', `PG md 无深链条目: ${k}`);
for (const k of psiMapKeys) if (!psiMd.has(k)) add('ERR', 'esOffers.ts', `ES_READER_URLS 有 psi 条目但无对应 md: ${k}`);
for (const k of psiMd) if (!readerUrls[k]) add('ERR', 'esOffers.ts', `psi md 无深链条目: ${k}`);

for (const [slug, url] of Object.entries(readerUrls)) {
  const go = url.replace(/^\/go\/|\/$/g, '');
  if (!affSlugs.has(go)) add('ERR', 'affiliateLinks.ts', `ES_READER_URLS 引用的 /go/ slug 不存在: ${go}`);
}

// 深链 URL 内容核验
for (const [slug, url] of Object.entries(readerUrls)) {
  const go = url.replace(/^\/go\/|\/$/g, '');
  const u = affUrl[go];
  if (!u) continue;
  const offerId = (u.match(/offer_id=(\d+)/) || [])[1];
  const isPg = go.startsWith('purple-garden-es');
  const expOffer = isPg ? '34' : '42';
  if (offerId !== expOffer) add('ERR', 'affiliateLinks.ts', `${go} offer_id=${offerId}，期望 ${expOffer}`);
  if (!/clickid(%3D|=)\{transaction_id\}/.test(u)) add('ERR', 'affiliateLinks.ts', `${go} 缺少 clickid 宏`);
  if (!/aff_id=2326/.test(u)) add('ERR', 'affiliateLinks.ts', `${go} aff_id 不是 2326`);
}

// ── G. 重复度 ─────────────────────────────────────────────────────────────
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const seenSent = new Map(); // 句子 -> [file]
const seenPara = new Map();
for (const p of PLATFORMS) {
  for (const r of records[p.folder]) {
    const body = r.body.replace(/```[\s\S]*?```/g, ' ').replace(/^\s*#{1,6}.*$/gm, '');
    const paras = body.split(/\n\s*\n/).map((x) => norm(x)).filter((x) => [...x].length > 120);
    for (const pa of paras) {
      if (seenPara.has(pa)) add('ERR', `${p.folder}/${r.f}`, `整段与 ${seenPara.get(pa)} 重复`);
      else seenPara.set(pa, `${p.folder}/${r.f}`);
    }
    const sents = body.split(/(?<=[.!?])\s+/).map(norm).filter((x) => [...x].length > 150);
    for (const s of sents) {
      if (seenSent.has(s)) {
        const other = seenSent.get(s);
        if (other !== `${p.folder}/${r.f}`) warn.push({ file: `${p.folder}/${r.f}`, msg: `长句与 ${other} 重复: "${s.slice(0, 60)}..."` });
      } else seenSent.set(s, `${p.folder}/${r.f}`);
    }
  }
}

// ── H. 语言扫描 ───────────────────────────────────────────────────────────
const ANGLICISM = [
  [/\bthe \w+/gi, '英文 the'],
  [/\band\b/gi, '英文 and'],
  [/\bwith\b/gi, '英文 with'],
  [/\bget\b/gi, '英文 get'],
  [/\bfree\b/gi, 'free (应用 gratis)'],
  [/\bslots?\b/gi, 'slots (应用 cupos)'],
  [/\brating\b/gi, 'rating (应用 calificación)'],
  [/\bemail\b/gi, 'email (应用 correo)'],
  [/\bsupport team\b/gi, 'support team'],
  [/\bcustomer\b/gi, 'customer'],
  [/\breview\b/gi, 'review (应用 reseña)'],
  [/\bmatch\b/gi, 'match'],
  [/\bcoaching\b/gi, 'coaching (可接受)'],
  [/\bonline\b/gi, 'online (可接受)'],
];
for (const p of PLATFORMS) {
  for (const r of records[p.folder]) {
    const text = r.body;
    for (const [re, label] of ANGLICISM) {
      const hits = text.match(re);
      if (hits && !/可接受/.test(label)) {
        warn.push({ file: `${p.folder}/${r.f}`, msg: `疑似英文残留 [${label}] ×${hits.length}: ${hits.slice(0, 3).join(' | ')}` });
      }
    }
  }
}

// ── 输出 ──────────────────────────────────────────────────────────────────
const stats = {};
for (const p of PLATFORMS) {
  const rs = records[p.folder];
  const words = rs.map((r) => r.body.split(/\s+/).filter(Boolean).length).sort((a, b) => a - b);
  stats[p.label] = {
    篇数: rs.length,
    正文词数: { min: words[0], p25: words[Math.floor(words.length * 0.25)], 中位: words[Math.floor(words.length / 2)], max: words[words.length - 1] },
    FAQ条数: rs.map((r) => (r.fm.faq || []).length),
    pros: rs.map((r) => (r.fm.pros || []).length),
    rating: rs.map((r) => r.fm.rating),
  };
}

console.log('══════ 统计 ══════');
console.log(JSON.stringify(stats, null, 2));
console.log('\n══════ 阻塞级问题 (ERR) ══════');
if (!issues.length) console.log('  无');
for (const i of issues) console.log(`  ✗ [${i.file}] ${i.msg}`);
console.log(`\n  合计: ${issues.length}`);
console.log('\n══════ 警告 (WARN) ══════');
const grouped = {};
for (const w of warn) { (grouped[w.msg.split(':')[0]] ||= []).push(w); }
for (const [k, arr] of Object.entries(grouped)) {
  console.log(`  • ${k}  ×${arr.length}`);
  for (const w of arr.slice(0, 6)) console.log(`      - [${w.file}] ${w.msg}`);
  if (arr.length > 6) console.log(`      ... 其余 ${arr.length - 6} 条`);
}
console.log(`\n  合计: ${warn.length}`);
