/**
 * Cloudflare Pages Functions middleware
 *
 * 承担两件事：
 *
 * 1) 主机名规范化（原有职责）
 *    GSC 显示 www.easternalignment.com 与 easternalignment.com 同时被索引，
 *    权重被拆散。Cloudflare 的 _redirects 无法按 hostname 匹配，所以 301
 *    只能在这里做。
 *
 * 2) Markdown for Agents（2026-09-10 新增）
 *    当请求方明确只要 markdown（`Accept: text/markdown`）时，在边缘把 HTML
 *    转成 markdown 返回。AI 智能体因此拿到干净正文，而不是裹着导航与侧栏的
 *    HTML，引用准确率更高。同一 URL 双表示 → 不产生重复内容，也无需额外构建步骤。
 *
 *    ⚠️ 两条硬约束：
 *      · 转换**绝不能**把页面弄坏 —— 任何异常都退回原始 HTML
 *      · Workers 免费版只有 10ms CPU/请求 —— 转换器已做 O(1) 优化，
 *        这里再加体积上限与长缓存，避免重复转换
 */
import { convertPage } from './_lib/html-to-md.js';

const APEX = 'easternalignment.com';
const MD_TYPE = 'text/markdown; charset=utf-8';

/**
 * 超过这个体积就放弃转换，退回 HTML。
 *
 * 为什么是这个数：Cloudflare Workers **免费版 CPU 上限是 10ms/请求**，
 * 超了会被运行时直接杀掉（返回 1102，连 try/catch 都救不回来）。
 *
 * 本机实测（纯转换 CPU，多次取中位数）：
 *   108KB → 2.9ms ・ 137KB → 5.1ms ・ 235KB → 9.0ms ・ 290KB → 11.9ms
 * 即约 每 1KB 0.04ms，10ms 上限对应约 250KB。
 *
 * 取 150KB → 最差约 5.5ms，**留约 45% 余量**（本机 Node 只是代理指标，
 * Workers 上的实际值会有差异，安全系数不能省）。
 *
 * 覆盖率：站点 561 个内容页里 99.3% 都在 150KB 以内（只有 4 页超标）。
 * 超标页退回 HTML —— 智能体仍能读到内容，只是不如 markdown 干净；
 * 这远好过撞 CPU 上限直接报错。
 */
const MAX_CONVERT_BYTES = 150 * 1024;

/** 不该参与内容协商的路径：联盟跳转、API、带扩展名的静态资源、well-known */
function isNegotiable(pathname) {
  if (pathname.startsWith('/go/')) return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/.well-known/')) return false;
  const last = pathname.split('/').pop() || '';
  if (last.includes('.')) return false;   // 例如 /sitemap.xml、/favicon.ico
  return true;
}

/**
 * 请求方是否明确想要 markdown。
 * 按 q 值比较，只有 markdown 的可接受度**不低于** html 才协商 ——
 * 普通浏览器发的是 text/html,... 自然不会命中。
 */
function wantsMarkdown(request) {
  const a = request.headers.get('Accept') || '';
  if (!/text\/markdown/i.test(a)) return false;
  const re = (type) => new RegExp(type.replace('/', '\\/'), 'i');
  const q = (type) => {
    const m = a.match(new RegExp(type.replace('/', '\\/') + '\\s*;\\s*q=([0-9.]+)', 'i'));
    if (m) return parseFloat(m[1]);
    return re(type).test(a) ? 1 : 0;
  };
  return q('text/markdown') >= q('text/html');
}

/** 保证响应带 Vary: Accept —— 内容协商的正确性前提，缺了会让缓存串味 */
function mergeVary(h) {
  const v = h.get('Vary');
  if (!v) h.set('Vary', 'Accept');
  else if (!/(^|,)\s*Accept\s*($|,)/i.test(v)) h.set('Vary', v + ', Accept');
  return h;
}

function withVary(res) {
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: mergeVary(new Headers(res.headers)) });
}

/**
 * 用已经读出来的明文重新构造 HTML 响应。
 * ⚠️ 不能复用原 res —— 它的 body 已被 res.text() 消费，
 * 再用 `new Response(res.body, …)` 会抛 "body object should not be disturbed"。
 * 这是实测踩到的坑（大页面走体积阈值分支时必现）。
 */
function htmlResponse(res, html) {
  const h = new Headers(res.headers);
  h.delete('Content-Length');
  h.delete('Content-Encoding');
  h.delete('ETag');
  return new Response(html, { status: res.status, headers: mergeVary(h) });
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  const isApex = host === APEX;
  const isPreview = host.endsWith('.pages.dev') || host === 'localhost' || host === '127.0.0.1';

  if (!isApex && !isPreview) {
    url.hostname = APEX;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  const negotiate =
    request.method === 'GET' &&
    wantsMarkdown(request) &&
    isNegotiable(url.pathname);

  if (!negotiate) return withVary(await next());

  // 去掉 Accept-Encoding 再取一次，确保拿到**未压缩**明文；
  // 否则 response.text() 会得到 gzip 字节流。取不到就退回默认请求。
  let res;
  try {
    const bare = new Request(request.url, {
      method: 'GET',
      headers: new Headers([...request.headers].filter(([k]) => k.toLowerCase() !== 'accept-encoding')),
    });
    res = await next(bare);
  } catch {
    res = await next();
  }

  const ctype = res.headers.get('Content-Type') || '';
  if (!res.ok || !ctype.includes('text/html') || res.headers.get('Content-Encoding')) {
    return withVary(res);
  }

  let html;
  try {
    html = await res.text();
  } catch {
    // 读不出明文（极少见）：改用原始请求再取一次，保证仍能返回 HTML
    try {
      return withVary(await next());
    } catch {
      return new Response('Upstream error', { status: 502, headers: { Vary: 'Accept' } });
    }
  }

  if (html.length > MAX_CONVERT_BYTES) return htmlResponse(res, html);

  let markdown = '';
  let words = 0;
  try {
    const out = convertPage(html, { url: request.url });
    markdown = out.markdown;
    words = out.words;
  } catch {
    // 转换失败：原样返回 HTML，绝不让协商把页面弄坏
    return htmlResponse(res, html);
  }
  if (!markdown || words < 20) return htmlResponse(res, html);

  const headers = new Headers(res.headers);
  headers.set('Content-Type', MD_TYPE);
  headers.set('Vary', 'Accept');
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('X-Markdown-For-Agents', '1');
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  headers.delete('ETag');

  return new Response(markdown, { status: 200, headers });
}
