/**
 * check_es_links.mjs — 西语分站内部链接全量解析核验
 * 扫描 dist/es 下的所有 HTML，抽出所有站内 href/src，逐一验证目标文件存在。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
};

const pubRoot = path.join(DIST);
const exists = (urlPath) => {
  let p = urlPath.split('#')[0].split('?')[0];
  if (!p.startsWith('/')) return true;
  const abs = path.join(pubRoot, decodeURIComponent(p));
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  if (fs.existsSync(path.join(abs, 'index.html'))) return true;
  return false;
};

const files = walk(path.join(DIST, 'es'));
const broken = new Map();
const external = new Set();
let internalCount = 0;

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = '/' + path.relative(DIST, f).replace(/\\/g, '/').replace(/index\.html$/, '');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const v = m[1];
    if (/^(https?:)?\/\//.test(v) || v.startsWith('mailto:') || v.startsWith('data:') || v.startsWith('#')) {
      if (/^https?:\/\//.test(v)) external.add(new URL(v).host);
      continue;
    }
    if (!v.startsWith('/')) continue;
    internalCount++;
    if (!exists(v)) {
      const key = v.split('#')[0];
      if (!broken.has(key)) broken.set(key, new Set());
      broken.get(key).add(rel || '/es/');
    }
  }
}

console.log(`扫描 /es 页面 ${files.length} 个；站内链接 ${internalCount} 条；外链域名 ${[...external].join(', ')}`);
console.log(`\n失效站内目标 ${broken.size} 个:`);
for (const [t, srcs] of [...broken].sort()) {
  const arr = [...srcs];
  console.log(`  ✗ ${t}   (被 ${arr.length} 页引用: ${arr.slice(0, 3).join(', ')}${arr.length > 3 ? ' …' : ''})`);
}
