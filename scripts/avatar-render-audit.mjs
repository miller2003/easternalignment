/**
 * avatar_render_audit.mjs — 西语站全站「头像是否真的渲染出来」的浏览器级审计。
 *
 * 为什么需要它：源码级/dist 级审计只能证明 HTML 里存在 <img>，证明不了浏览器
 * 真的解码成功。2026-09-29 的事故正是这类——PG/psi 两个 hub 的精选卡渲染的是
 * 渐变底首字母 div，源码里连 <img> 都没有，静态检查全绿。
 *
 * 做法：生成一个同源探针页（放进 dist，用完删除），页内用 iframe 逐个加载目标
 * 页面，读每张 /avatars/ 图片的 naturalWidth（>0 才是真加载），最后把汇总 JSON
 * 写进 DOM，用 chrome --dump-dom 取回。
 *
 * 用法（三步，因为沙箱内 node 子进程 spawn Chrome 会 EBUSY，必须由 bash 直接跑）：
 *   1) node scripts/avatar-render-audit.mjs gen
 *   2) chrome --headless ... --dump-dom http://127.0.0.1:8765/_probe-all-es.html > dump.html
 *   3) node scripts/avatar-render-audit.mjs parse dump.html
 */
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = 'C:/Users/samja/Desktop/site/easternalignment';
const DIST = path.join(ROOT, 'dist');
const OUTDIR = path.join(ROOT, 'scratch/es-readers');
const MODE = process.argv[2] || 'gen';

// ── 目标页清单 ────────────────────────────────────────────────────────────────
const slugsOf = (dir) =>
  fs
    .readdirSync(path.join(ROOT, 'src/content/es-readers', dir))
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => f.replace(/\.md$/, ''));

const pages = [
  '/es/',
  '/es/resenas/',
  '/es/resenas/purple-garden-es/',
  '/es/resenas/psiquicos-web/',
  ...slugsOf('purple-garden-es').map((s) => `/es/resenas/purple-garden-es/${s}/`),
  ...slugsOf('psiquicos-web').map((s) => `/es/resenas/psiquicos-web/${s}/`),
];

// ── 生成探针页 ────────────────────────────────────────────────────────────────
const probe = `<!doctype html>
<html><head><meta charset="utf-8"><title>probe</title>
<style>html,body{margin:0}#f{width:1000px;height:800px;border:0}pre{font:11px monospace;white-space:pre-wrap}</style>
</head><body data-probe="pending"><iframe id="f"></iframe><pre id="out">waiting…</pre>
<script>
var PAGES = ${JSON.stringify(pages)};
var f = document.getElementById('f'), out = document.getElementById('out');
var results = [];

function emit(o) {
  var t = 'PROBE_JSON:' + JSON.stringify(o) + ':END_PROBE_JSON';
  document.title = t; out.textContent = t;
  document.body.setAttribute('data-probe', 'done');
}

function waitImgs(doc, budget) {
  return new Promise(function (resolve) {
    var tries = 0;
    (function tick() {
      var imgs = [].slice.call(doc.querySelectorAll('img'));
      var pending = imgs.filter(function (i) {
        return /\\/avatars\\//.test(i.getAttribute('src') || '') && !(i.complete && i.naturalWidth > 0);
      });
      if (pending.length === 0 || tries > budget) return resolve();
      tries++;
      setTimeout(tick, 60);
    })();
  });
}

function collect(doc) {
  return [].slice.call(doc.querySelectorAll('img')).filter(function (i) {
    return /\\/avatars\\//.test(i.getAttribute('src') || '');
  }).map(function (i) {
    var sec = i.closest('section, article, .reader-card, .pg-reader-card, .reader-showcase-card');
    return {
      src: i.getAttribute('src'),
      naturalW: i.naturalWidth,
      naturalH: i.naturalHeight,
      box: Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height),
      alt: (i.getAttribute('alt') || '').slice(0, 40),
      section: sec ? (sec.className || sec.tagName).toString().slice(0, 60) : null
    };
  });
}

var idx = 0;
function next() {
  if (idx >= PAGES.length) return emit({ pages: results });
  var p = PAGES[idx++];
  var done = false;
  var to = setTimeout(function () { if (!done) { done = true; finish(0, 'timeout'); } }, 8000);
  function finish(status, note) {
    try {
      var doc = f.contentDocument;
      var imgs = collect(doc);
      results.push({
        page: p, httpStatus: status, note: note || null,
        total: imgs.length,
        broken: imgs.filter(function (x) { return x.naturalW === 0; }).length,
        brokenList: imgs.filter(function (x) { return x.naturalW === 0; }).map(function (x) { return x.src + ' <' + x.section + '>'; }),
        samples: imgs.slice(0, 3)
      });
    } catch (e) { results.push({ page: p, error: String(e) }); }
    setTimeout(next, 30);
  }
  f.onload = function () {
    if (done) return;
    waitImgs(f.contentDocument, 40).then(function () {
      if (done) return; done = true; clearTimeout(to); finish(200, null);
    });
  };
  f.src = p;
}
next();
</script></body></html>`;

const probePath = path.join(DIST, '_probe-all-es.html');
fs.writeFileSync(probePath, probe, 'utf8');
const budget = Math.max(180000, pages.length * 3000);

if (MODE === 'gen') {
  console.log(`probe written: ${probePath}`);
  console.log(`pages: ${pages.length}`);
  console.log(`budget: ${budget}`);
  console.log(`dump cmd: "${CHROME}" --headless --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=${budget} --dump-dom http://127.0.0.1:8765/_probe-all-es.html > scratch/es-readers/_dump.html`);
  process.exit(0);
}

// ── 解析 ─────────────────────────────────────────────────────────────────────
const dumpPath = process.argv[3];
const dump = fs.readFileSync(dumpPath, 'utf8');

const m = dump.match(/PROBE_JSON:([\s\S]*?):END_PROBE_JSON/);
if (!m) {
  console.error('探针未产出 JSON，state=', (dump.match(/data-probe="[a-z]+"/) || ['?'])[0]);
  process.exit(2);
}
const data = JSON.parse(m[1]);

// 预期不含解读师头像的页面（首页只有站标）
const EXPECT_NO_AVATAR = ['/es/'];

const bad = data.pages.filter((r) => r.error || r.broken > 0);
const unexpectedEmpty = data.pages.filter((r) => !r.error && r.total === 0 && !EXPECT_NO_AVATAR.includes(r.page));
const withImgs = data.pages.filter((r) => r.total > 0);
const totalImgs = withImgs.reduce((a, r) => a + r.total, 0);
const totalBroken = withImgs.reduce((a, r) => a + (r.broken || 0), 0);

const lines = [];
lines.push(`目标页数: ${pages.length}`);
lines.push(`含头像的页面: ${withImgs.length}   预期无头像: ${EXPECT_NO_AVATAR.length}   意外无头像: ${unexpectedEmpty.length}`);
lines.push(`问题页(未解码头像/报错): ${bad.length}`);
lines.push(`头像总数: ${totalImgs}   未解码: ${totalBroken}`);
lines.push(`判定: ${bad.length === 0 && unexpectedEmpty.length === 0 ? 'PASS' : 'FAIL'}`);
lines.push('');
for (const r of data.pages) {
  const flag = r.error || r.broken > 0 ? 'FAIL' : r.total === 0 ? (EXPECT_NO_AVATAR.includes(r.page) ? 'NONE' : 'EMPTY') : 'OK  ';
  lines.push(`${flag} ${String(r.page).padEnd(52)} imgs=${String(r.total).padEnd(4)} broken=${r.broken ?? '-'}${r.error ? ' err=' + r.error : ''}`);
  for (const b of r.brokenList || []) lines.push(`        └ unrecovered: ${b}`);
}

fs.writeFileSync(path.join(OUTDIR, 'avatar-render-audit.json'), JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(path.join(OUTDIR, 'avatar-render-audit.txt'), lines.join('\n') + '\n', 'utf8');
fs.unlinkSync(probePath);

console.log(lines.join('\n'));
process.exit(bad.length > 0 || unexpectedEmpty.length > 0 ? 1 : 0);
