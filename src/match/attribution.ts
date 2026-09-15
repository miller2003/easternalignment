/**
 * attribution.ts — 归因与身份（规格 §19）
 *
 * 硬规则：
 *   · first-touch 一旦写入，永不被覆盖
 *   · last-touch 每次带 UTM 的访问都更新
 *   · 邮箱提交后把匿名身份合并到已知身份（PostHog identify）
 *   · 匿名 id 沿用旧键名 ea_match_anon_id，保证与历史数据连续
 */

import type { AttributionSnapshot, UTMData } from './types';
import { STORAGE } from './config';

const K = {
  anon: 'ea_match_anon_id',
  session: 'ea_match_session_id',
  first: 'ea_match_first_touch',
  firstSource: 'ea_match_first_source',
  last: 'ea_match_last_touch',
  lastSource: 'ea_match_last_source',
  visits: 'ea_match_visits',
  landing: 'ea_match_landing',
} as const;

declare global {
  interface Window { posthog?: any }
}

const safe = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* 隐私模式 */ }
  },
  sget(key: string): string | null {
    try { return sessionStorage.getItem(key); } catch { return null; }
  },
  sset(key: string, value: string) {
    try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
  },
};

function randomId(len = 13): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id = safe.get(K.anon);
  if (!id) {
    id = randomId(20);
    safe.set(K.anon, id);
  }
  return id;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = safe.sget(K.session);
  if (!id) {
    id = randomId(16);
    safe.sset(K.session, id);
  }
  return id;
}

export function readUTMFromURL(): UTMData {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const utm: UTMData = {};
  (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const).forEach((k) => {
    const v = p.get(k);
    if (v) utm[k] = v.slice(0, 120);
  });
  return utm;
}

/** 外部来源主机；同源或空 referrer 归为 'direct' */
export function referrerHost(): string {
  if (typeof window === 'undefined') return 'direct';
  const ref = document.referrer || '';
  if (!ref) return 'direct';
  try {
    const host = new URL(ref).host;
    return host === window.location.host ? 'internal' : host;
  } catch {
    return 'direct';
  }
}

/** 来源标识：优先 UTM source，其次 referrer 主机 */
function sourceLabel(utm: UTMData): string {
  if (utm.utm_source) return utm.utm_source;
  const host = referrerHost();
  return host === 'internal' ? 'internal' : host;
}

function bumpVisitCount(): number {
  const n = (parseInt(safe.get(K.visits) ?? '0', 10) || 0) + 1;
  safe.set(K.visits, String(n));
  return n;
}

/**
 * 页面启动时调用一次。
 * 注意顺序：first-touch 只在「尚未存在」时写入，绝不覆盖。
 */
export function initAttribution(): AttributionSnapshot {
  const utm = readUTMFromURL();
  const hadFirstTouch = safe.get(K.first) !== null;
  const source = sourceLabel(utm);

  if (!hadFirstTouch) {
    safe.set(K.first, JSON.stringify(utm));
    safe.set(K.firstSource, source);
  }
  if (Object.keys(utm).length > 0) {
    safe.set(K.last, JSON.stringify(utm));
    safe.set(K.lastSource, source);
  }
  if (!safe.get(K.landing)) {
    safe.set(K.landing, window.location.pathname + window.location.search);
  }

  const visits = hadFirstTouch ? bumpVisitCount() : (safe.set(K.visits, '1'), 1);

  return {
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    source,
    landing_page: safe.get(K.landing) ?? window.location.pathname,
    first_touch: parse(safe.get(K.first)),
    last_touch: parse(safe.get(K.last)),
    current: utm,
    returning: hadFirstTouch,
    visit_count: visits,
  };
}

function parse(raw: string | null): UTMData {
  if (!raw) return {};
  try { return JSON.parse(raw) as UTMData; } catch { return {}; }
}

export function getAttribution(): AttributionSnapshot {
  const utm = readUTMFromURL();
  return {
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    source: sourceLabel(utm),
    landing_page: safe.get(K.landing) ?? '',
    first_touch: parse(safe.get(K.first)),
    last_touch: parse(safe.get(K.last)),
    current: utm,
    returning: safe.get(K.first) !== null,
    visit_count: parseInt(safe.get(K.visits) ?? '0', 10) || 0,
  };
}

/** 压缩成埋点用的扁平属性 */
export function attributionProps(): Record<string, unknown> {
  const a = getAttribution();
  return {
    anonymous_id: a.anonymous_id,
    session_id: a.session_id,
    source: a.source,
    landing_page: a.landing_page,
    first_touch_source: safe.get(K.firstSource) ?? a.source,
    last_touch_source: safe.get(K.lastSource) ?? a.source,
    utm_source: a.current.utm_source ?? null,
    utm_medium: a.current.utm_medium ?? null,
    utm_campaign: a.current.utm_campaign ?? null,
    utm_content: a.current.utm_content ?? null,
    utm_term: a.current.utm_term ?? null,
    first_touch_utm_source: a.first_touch.utm_source ?? null,
    first_touch_utm_campaign: a.first_touch.utm_campaign ?? null,
    visit_count: a.visit_count,
    returning: a.returning,
  };
}

/**
 * 邮箱提交后调用：把匿名身份合并到已知身份。
 * 这正是规格 §19 要求的 anonymous-to-known merging —— 合并之后，
 * 该浏览器此前的匿名事件会归到同一个 person 下。
 */
export function identify(email: string, props: Record<string, unknown> = {}): void {
  try {
    if (typeof window !== 'undefined' && window.posthog?.identify) {
      window.posthog.identify(email, { email, ...props });
    }
  } catch { /* ignore */ }
}

export const __private = { K, safe };
