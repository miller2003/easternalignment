#!/usr/bin/env node
/**
 * CTA 归因埋点审计
 *
 * 背景：2026-09-10 分析发现 21.8% 的真实点击 ctaSource='unknown'，导致
 * 「哪个位置的按钮在赚钱」这个问题无法回答。根因是部分组件渲染 /go/ 链接时
 * 没有带 data-cta-source。
 *
 * 运行时兜底（PostHog.astro 的三级推断）已经把 unknown 压下去了，但属性标注
 * 才是准确答案。本脚本扫描源码，列出所有「渲染了 /go/ 链接、但所在元素没有
 * data-cta-source」的位置，供人工补齐。
 *
 * 用法：node scripts/audit-cta-source.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const SKIP = new Set(['node_modules', '.astro', 'dist', '.git']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(astro|tsx|jsx|html)$/.test(name)) out.push(full);
  }
  return out;
}

const componentCache = new Map();

/**
 * 组件是否在自己内部标注了 data-cta-source。
 * 用于消除「把 URL 作为 prop 传给组件」这类误报：真正的渲染点在组件里，
 * 组件内部已经标注，调用处不需要也不应该重复标注。
 */
function componentAnnotates(name) {
  if (componentCache.has(name)) return componentCache.get(name);
  const candidates = [
    join(SRC, 'components', `${name}.astro`),
    join(SRC, 'components', `${name}.tsx`),
  ];
  let result = null;
  for (const c of candidates) {
    try {
      const t = readFileSync(c, 'utf8');
      if (/data-cta-source\s*=/.test(t)) {
        // 取出它标注的值，便于在报告里显示
        const m = t.match(/data-cta-source\s*=\s*["'{]*([\w-]*)/);
        result = (m && m[1]) || 'yes';
      } else {
        result = null;
      }
      break;
    } catch (_) { /* 换下一个候选路径 */ }
  }
  componentCache.set(name, result);
  return result;
}

/** 从某一行往上找最近的 <ComponentName 开标签 */
function enclosingComponent(lines, i) {
  for (let k = i; k >= Math.max(0, i - 25); k--) {
    const m = lines[k].match(/<([A-Z][A-Za-z0-9]*)/);
    if (m) return m[1];
  }
  return null;
}

const files = walk(SRC);
const rows = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (!/\/go\//.test(line)) return;
    const trimmed = line.trim();
    // 跳过注释与文档示例
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
    // 只保留真正的「渲染点」：href= / href: / buttonUrl 等传给组件或 DOM 的位置。
    if (!/(href\s*[=:]|buttonUrl|<a\s)/i.test(line)) return;

    // 先看是否为「prop 传值」——渲染点其实在组件内部
    if (/buttonUrl\s*=/i.test(line) && !/href\s*=/i.test(line)) {
      const comp = enclosingComponent(lines, i);
      const annotated = comp ? componentAnnotates(comp) : null;
      if (annotated) {
        rows.push({
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1, kind: 'prop-ok', via: `${comp} (data-cta-source="${annotated}")`,
          snippet: trimmed.slice(0, 92),
        });
        return;
      }
    }

    // 定位「所在元素」：从本行起向前找最近的 '<' 未闭合标签，向后找到 '>'
    let start = i;
    let buf = '';
    for (let k = i; k >= Math.max(0, i - 12); k--) {
      buf = lines.slice(k, i + 1).join('\n');
      if (buf.includes('<')) { start = k; break; }
    }
    let tagText = '';
    for (let k = start; k <= Math.min(lines.length - 1, i + 12); k++) {
      tagText = lines.slice(start, k + 1).join('\n');
      if (/>/.test(lines[k])) break;
    }
    const openIdx = tagText.indexOf('<');
    const closeIdx = tagText.indexOf('>', openIdx + 1);
    const tag = closeIdx > -1 ? tagText.slice(openIdx, closeIdx + 1) : tagText.slice(openIdx);

    const hasAttr = /data-cta-source\s*=/.test(tag);
    // 祖先启发式：往上 30 行内存在更浅缩进的 data-cta-source 开标签
    const indent = line.length - line.trimStart().length;
    let ancestor = false;
    for (let k = i - 1; k >= Math.max(0, i - 30); k--) {
      const l = lines[k];
      if (!/data-cta-source\s*=/.test(l)) continue;
      const li = l.length - l.trimStart().length;
      if (li < indent) { ancestor = true; break; }
    }

    rows.push({
      file: relative(ROOT, file).replace(/\\/g, '/'),
      line: i + 1,
      kind: hasAttr ? 'self' : (ancestor ? 'ancestor' : 'missing'),
      snippet: trimmed.slice(0, 92),
    });
  });
}

const by = (k) => rows.filter((r) => r.kind === k);
const self = by('self');
const ancestor = by('ancestor');
const propOk = by('prop-ok');
const missing = by('missing');

console.log('CTA 归因埋点审计 —', new Date().toISOString().slice(0, 10));
console.log('─'.repeat(100));
console.log(`扫描文件 ${files.length} 个，发现 /go/ 渲染点 ${rows.length} 处`);
console.log(`  ① 自身标注 data-cta-source      : ${self.length}`);
console.log(`  ② 靠祖先元素继承                 : ${ancestor.length}`);
console.log(`  ③ 传给已自标组件（无需重复标注） : ${propOk.length}`);
console.log(`  ④ 真要补的位置（会落到 unknown） : ${missing.length}`);
console.log('─'.repeat(100));

if (propOk.length) {
  console.log('\n③ 经组件内部标注（合法，无需改动）：');
  for (const r of propOk) console.log(`  ${r.file}:L${r.line}  → ${r.via}`);
}

if (ancestor.length) {
  console.log('\n② 依赖祖先继承（可接受；祖先改动会一起失效，建议改为自标）：');
  for (const r of ancestor) console.log(`  ${r.file}:L${r.line}  ${r.snippet}`);
}

if (missing.length === 0) {
  console.log('\n④ 为空 —— 所有 /go/ 渲染点都能定位到 CTA 位置。');
} else {
  console.log('\n④ 需要补齐的位置（按文件分组）：\n');
  const grouped = {};
  for (const r of missing) (grouped[r.file] ||= []).push(r);
  for (const [file, list] of Object.entries(grouped).sort()) {
    console.log(`  ${file}`);
    for (const r of list) console.log(`    L${String(r.line).padStart(4)}  ${r.snippet}`);
    console.log('');
  }
  console.log('修法：给该 <a> 元素加 data-cta-source="<位置>"。既有取值：');
  console.log('  hero | end | inline | sidebar | sticky | topbar | score-panel | sidebar-deal | coupons-platform');
  process.exitCode = 1;
}

console.log('\n部署后可用下面这条核对运行时兜底效果（ctaSourceMethod 会告诉你值是哪来的）：');
console.log('  SELECT properties.ctaSourceMethod, properties.ctaSource, count()');
console.log("  FROM events WHERE event='affiliate_link_click' GROUP BY 1,2 ORDER BY 3 DESC");
