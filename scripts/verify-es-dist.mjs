/**
 * verify_es_dist.mjs — 构建产物级核验（西语分站）
 * 运行: node scripts/verify-es-dist.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ES_CONTENT = path.join(ROOT, 'src/content/es-readers');

const errs = [];
const warns = [];
const ok = [];

const read = (p) => fs.readFileSync(p, 'utf8');

// ── 1. 页面产物计数 ────────────────────────────────────────────────────────
const folders = [
  { dir: 'purple-garden-es', route: 'purple-garden-es', goPrefix: 'purple-garden-es-', platform: 'purple-garden-es' },
  { dir: 'psiquicos-web', route: 'psiquicos-web', goPrefix: 'psiquicos-', platform: 'psiquicos' },
];

let totalPages = 0;
for (const f of folders) {
  const srcSlugs = fs.readdirSync(path.join(ES_CONTENT, f.dir))
    .filter((n) => n.endsWith('.md') && !n.startsWith('_'))
    .map((n) => n.replace(/\.md$/, ''));
  const distDir = path.join(DIST, 'es/resenas', f.route);
  const distSlugs = fs.existsSync(distDir)
    ? fs.readdirSync(distDir).filter((n) => fs.statSync(path.join(distDir, n)).isDirectory())
    : [];
  totalPages += distSlugs.length;
  const missing = srcSlugs.filter((s) => !distSlugs.includes(s));
  const extra = distSlugs.filter((s) => !srcSlugs.includes(s));
  if (missing.length) errs.push(`[${f.route}] dist 缺页 ${missing.length}: ${missing.join(', ')}`);
  if (extra.length) warns.push(`[${f.route}] dist 多出页面: ${extra.join(', ')}`);
  ok.push(`[${f.route}] 源 ${srcSlugs.length} 篇 → dist ${distSlugs.length} 页`);
}

// ── 2. 逐页核查 ────────────────────────────────────────────────────────────
for (const f of folders) {
  const srcSlugs = fs.readdirSync(path.join(ES_CONTENT, f.dir))
    .filter((n) => n.endsWith('.md') && !n.startsWith('_'))
    .map((n) => n.replace(/\.md$/, ''));
  for (const slug of srcSlugs) {
    const p = path.join(DIST, 'es/resenas', f.route, slug, 'index.html');
    if (!fs.existsSync(p)) continue;
    const html = read(p);
    const tag = `${f.route}/${slug}`;

    // 2a. 按人 /go/ 深链必须在页面出现
    const goSlug = `${f.goPrefix}${slug}`;
    if (!html.includes(`/go/${goSlug}/`)) errs.push(`[${tag}] 页面未出现按人深链 /go/${goSlug}/`);
    // 2b. 平台级通用链接（顶部 offer 条 / 左栏）出现属设计如此，但必须 ≤2 处，
    //     且不得替代按人深链成为主 CTA。
    const otherPlatform = f.platform === 'psiquicos' ? 'purple-garden-es' : 'psiquicos';
    const selfPlatformGo = (html.match(new RegExp(`href="/go/${f.platform.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/"`, 'g')) || []).length;
    if (selfPlatformGo > 2) errs.push(`[${tag}] 平台级 /go/${f.platform}/ 出现 ${selfPlatformGo} 次（>2，疑有 CTA 未按人化）`);
    // 2c. 其他平台的按人深链不得出现在本页（chrome 的平台级链接除外）
    const foreignDeep = [...html.matchAll(new RegExp(`href="/go/(${otherPlatform}-[a-z0-9_-]+)/"`, 'g'))].map((m) => m[1]);
    if (foreignDeep.length) errs.push(`[${tag}] 出现其他平台的按人深链: ${foreignDeep.slice(0, 3).join(', ')}`);

    // 2d. 计数各 CTA 表面
    const goHits = (html.match(new RegExp(`/go/${goSlug}/`, 'g')) || []).length;
    if (goHits < 4) warns.push(`[${tag}] 按人深链仅出现 ${goHits} 次（hero/DealStrip/sticky/InlineCta/sidebar/CTA盒/正文）`);

    // 2e. SEO 头
    if (!/<link rel="canonical" href="https:\/\/easternalignment\.com\/es\/resenas\//.test(html))
      errs.push(`[${tag}] 缺 canonical`);
    if (!/<meta name="robots" content="index, follow"/.test(html)) errs.push(`[${tag}] robots 不是 index,follow`);
    const og = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (!og) errs.push(`[${tag}] 缺 og:image`);
    else if (!/\/avatars\/es-readers\//.test(og[1])) warns.push(`[${tag}] og:image 非按人图: ${og[1]}`);
    if (!/hreflang="es-419"/.test(html)) errs.push(`[${tag}] 缺 hreflang es-419`);

    // 2f. FAQPage schema
    if (!/"@type":\s*"FAQPage"/.test(html)) errs.push(`[${tag}] 缺 FAQPage JSON-LD`);
    if (!/"@type":\s*"Review"/.test(html)) errs.push(`[${tag}] 缺 Review JSON-LD`);

    // 2g. 图片资源可解析
    for (const m of html.matchAll(/src="(\/avatars\/es-readers\/[^"]+)"/g)) {
      const rel = m[1];
      if (!fs.existsSync(path.join(DIST, rel))) errs.push(`[${tag}] 头像文件未进 dist: ${rel}`);
    }

    // 2h. 无英文 CTA 泄漏
    for (const bad of ['Click Here', 'Read Full Review', 'Check Availability', 'Best for:']) {
      if (html.includes(bad)) errs.push(`[${tag}] 英文文案泄漏: ${bad}`);
    }

    // 2i. 标题/描述长度
    const t = html.match(/<title>([^<]*)<\/title>/);
    if (t) {
      const n = [...t[1]].length;
      if (n > 70) warns.push(`[${tag}] <title> ${n} 字符（Google 约截 60-65）`);
    }
  }
}

// ── 3. /go/ 产物 ───────────────────────────────────────────────────────────
const goDir = path.join(DIST, 'go');
const goNames = fs.existsSync(goDir) ? fs.readdirSync(goDir) : [];
const affSrc = read(path.join(ROOT, 'src/data/affiliateLinks.ts'));
const affSlugs = new Set([...affSrc.matchAll(/^\s*"([a-z0-9_\-]+)":\s*"https?:/gim)].map((m) => m[1]));
const missingGo = [...affSlugs].filter((s) => !goNames.includes(s));
if (missingGo.length) errs.push(`/go/ 产物缺失 ${missingGo.length}: ${missingGo.slice(0, 10).join(', ')}`);
ok.push(`/go/ 源 ${affSlugs.size} 条 → dist ${goNames.length} 页`);
for (const slug of affSlugs) {
  if (!slug.startsWith('purple-garden-es-') && !slug.startsWith('psiquicos-')) continue;
  const idx = path.join(goDir, slug, 'index.html');
  if (!fs.existsSync(idx)) continue;
  const h = read(idx);
  if (!/noindex/.test(h)) errs.push(`/go/${slug}/ 缺 noindex`);
  if (!/bargestech\.go2cloud\.org/.test(h)) errs.push(`/go/${slug}/ 目标不是 bargestech 链接`);
}
// 深链计数
const pgGo = goNames.filter((n) => /^purple-garden-es-[a-z0-9_-]+$/.test(n)).length;
const psiGo = goNames.filter((n) => /^psiquicos-[a-z0-9_-]+$/.test(n)).length;
ok.push(`dist/go 按人深链: PG ${pgGo} 条 / psi ${psiGo} 条`);

// ── 4. sitemap ────────────────────────────────────────────────────────────
const smPath = path.join(DIST, 'sitemap-0.xml');
if (!fs.existsSync(smPath)) errs.push('缺少 dist/sitemap-0.xml');
else {
  const sm = read(smPath);
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const esReviews = urls.filter((u) => u.includes('/es/resenas/') && !/\/es\/resenas\/(purple-garden-es|psiquicos-web)\/$/.test(u) && u !== 'https://easternalignment.com/es/resenas/');
  ok.push(`sitemap 共 ${urls.length} URL；其中 /es/resenas/ 读师页 ${esReviews.length}`);
  if (esReviews.length !== totalPages) errs.push(`sitemap 读师页 ${esReviews.length} ≠ 页面总数 ${totalPages}`);
  if (urls.some((u) => u.includes('/go/'))) errs.push('sitemap 含 /go/ 链接');
  if (urls.some((u) => /\/es\/(privacidad|terminos)\//.test(u))) errs.push('sitemap 含 noindex 法律页');
  const noLm = esReviews.filter((u) => {
    const seg = sm.split(`<loc>${u}</loc>`)[1] || '';
    const body = seg.split('</url>')[0];
    return !body.includes('<lastmod>');
  });
  if (noLm.length) errs.push(`/es/resenas/ 读师页缺 lastmod: ${noLm.join(', ')}`);
  const today = [...sm.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})T/g)].map((m) => m[1]).filter((d) => d === '2026-09-28').length;
  ok.push(`sitemap lastmod=2026-09-28 的条目: ${today}`);
}

// ── 5. hub 页读者卡计数 ────────────────────────────────────────────────────
for (const f of folders) {
  const hub = path.join(DIST, 'es/resenas', f.route, 'index.html');
  if (!fs.existsSync(hub)) { errs.push(`缺少 hub: /es/resenas/${f.route}/`); continue; }
  const h = read(hub);
  const cards = (h.match(/Leer reseña completa/g) || []).length;
  const srcCount = fs.readdirSync(path.join(ES_CONTENT, f.dir))
    .filter((n) => n.endsWith('.md') && !n.startsWith('_')).length;
  ok.push(`hub /es/resenas/${f.route}/ 「Leer reseña completa」×${cards}`);
  if (cards <= srcCount) warns.push(`hub /es/resenas/${f.route}/ 读者卡 ${cards} 条，未覆盖全部 ${srcCount} 篇`);
  if (!/id="lectores/.test(h) && !/readers-grid/.test(h)) errs.push(`hub /es/resenas/${f.route}/ 缺读者列表区块`);
}

// ── 输出 ──────────────────────────────────────────────────────────────────
console.log('══════ 通过项 ══════');
for (const o of ok) console.log('  ✓ ' + o);
console.log('\n══════ 错误 ══════');
if (!errs.length) console.log('  无');
for (const e of errs.slice(0, 60)) console.log('  ✗ ' + e);
console.log(`\n  合计 ${errs.length}`);
console.log('\n══════ 警告 ══════');
if (!warns.length) console.log('  无');
for (const w of warns.slice(0, 40)) console.log('  ! ' + w);
console.log(`\n  合计 ${warns.length}`);
