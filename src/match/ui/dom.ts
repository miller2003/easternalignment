/**
 * ui/dom.ts — 极小的 DOM 构造工具
 *
 * 用途：所有界面元素都通过这里构造，**不使用 innerHTML 拼接**。
 * 旧实现用 `inner.innerHTML +=` 拼模板串，任何一处漏掉转义（比如读者名里
 * 出现引号）就是注入面；而且每拼一次就会重新解析整棵子树，
 * 结果页一次渲染要重建 DOM 十几次。这里两者都消掉了。
 */

export type Attrs = Record<string, unknown>;
export type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;

    if (k === 'class' || k === 'className') {
      node.className = String(v);
    } else if (k === 'text') {
      node.textContent = String(v);
    } else if (k === 'html') {
      // 仅用于本文件内部确认安全的静态片段
      node.innerHTML = String(v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v as CSSStyleDeclaration);
    } else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v as Record<string, string>)) node.dataset[dk] = dv;
    } else if (k === 'on' && typeof v === 'object') {
      for (const [ev, fn] of Object.entries(v as Record<string, EventListener>)) {
        node.addEventListener(ev, fn);
      }
    } else if (k === 'aria' && typeof v === 'object') {
      for (const [ak, av] of Object.entries(v as Record<string, string | boolean>)) {
        node.setAttribute(`aria-${ak}`, String(av));
      }
    } else if (k.startsWith('data-')) {
      node.setAttribute(k, String(v));
    } else {
      node.setAttribute(k, String(v));
    }
  }

  append(node, children);
  return node;
}

export function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    parent.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return;
}

/** 无障碍的纯装饰元素 */
export function svg(path: string, attrs: Attrs = {}): SVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const node = document.createElementNS(NS, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('focusable', 'false');
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', path);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.75');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  node.appendChild(p);
  return node;
}

/* ── 无障碍辅助 ────────────────────────────────────────────────────── */

/** 切换「屏幕」后滚动到顶 + 把焦点交给主标题（SPA 式界面的两个必备动作） */
export function focusScreen(heading: HTMLElement | null): void {
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

/** 供屏幕阅读器朗读的状态播报区（页面里只有一个） */
let liveRegion: HTMLElement | null = null;
export function announce(message: string): void {
  if (!liveRegion) {
    liveRegion = h('div', {
      class: 'm-visually-hidden',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    });
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = '';
  // 同一个字符串连续播报需要先清空再写，否则屏幕阅读器不会重复朗读
  window.setTimeout(() => { if (liveRegion) liveRegion.textContent = message; }, 40);
}

/* ── 小工具 ────────────────────────────────────────────────────────── */

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function pct(n: number): string {
  return `${clamp(Math.round(n), 0, 99)}%`;
}

export function initials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** 一次性 IntersectionObserver，元素真正进入视口时回调一次 */
export function onceVisible(
  el: Element,
  cb: () => void,
  threshold = 0.5,
): void {
  if (typeof IntersectionObserver === 'undefined') { cb(); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { cb(); io.disconnect(); }
    }
  }, { threshold });
  io.observe(el);
}

/** 滚动到结果页某一段（区块顺序是动态的，所以按 id 找） */
export function scrollToSection(id: string): void {
  const node = document.getElementById(id);
  if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 结果页区块的滚动渐显。
 *
 * 预置态（.m-reveal：透明 + 下沉 16px）只由本函数添加 —— 不用 JS
 * 的访客、不支持 IO 的老浏览器、reduced-motion 用户都直接看到成品，
 * 不存在「JS 没跑起来整页空白」的死角。
 *
 * 首屏内的前几个区块给递增 transitionDelay，形成 Apple 式的错落入场；
 * 更深的区块滚动到时各自单独浮现，不再延迟。
 */
export function revealOnScroll(container: HTMLElement, reducedMotion: boolean): void {
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('.m-block'));
  if (!blocks.length) return;

  if (reducedMotion || typeof IntersectionObserver === 'undefined') {
    blocks.forEach((b) => b.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).classList.add('is-revealed');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
  );

  blocks.forEach((b, i) => {
    b.classList.add('m-reveal');
    if (i < 4) b.style.transitionDelay = `${i * 70}ms`;
    io.observe(b);
  });
}
