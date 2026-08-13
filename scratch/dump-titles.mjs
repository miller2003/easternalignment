import fs from 'fs';
import path from 'path';

function fm(file) {
  const t = fs.readFileSync(file, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^(\w+):\s*(.*)$/);
    if (k) o[k[1]] = k[2].replace(/^"|"$/g, '');
  }
  return o;
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

for (const f of walk('src/content')) {
  const o = fm(f);
  console.log(f.replace(/\\/g, '/').replace('src/content/', ''));
  console.log('  title: ' + (o.seoTitle ? 'SEO: ' + o.seoTitle : o.title));
  console.log('  desc : ' + (o.metaDescription ? 'META: ' + o.metaDescription : (o.description || '')));
}
