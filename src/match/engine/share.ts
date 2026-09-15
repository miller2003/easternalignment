/**
 * engine/share.ts — 结果页永久链接的编解码（规格 §14 / §19 的落地手法）
 *
 * 为什么需要它：默认的邮件 provider 是 'local'，后端不发信。
 * 那么「保存」这个动作必须是用户真能拿到的某种东西 —— 一条可收藏的 URL，
 * 打开就能还原同一份主题、同一段锚定句、同一批推荐。
 *
 * 载荷极小：画像（8 个短字段）+ 作答（选项 id）+ 自由文本（截断）。
 */

import type { SessionAnswers, UserProfile } from '../types';
import { buildProfile } from './scoring';
import { QUIZ_QUESTIONS } from './questions';

/** UTF-8 安全的 base64url */
function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64decode(s: string): string {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export interface SharedResult {
  profile: UserProfile;
  answers: SessionAnswers;
}

export function encodeResult(answers: SessionAnswers): string {
  const compact: SessionAnswers = {};
  for (const q of QUIZ_QUESTIONS) {
    const a = answers[q.id];
    if (a === undefined || a === null) continue;
    if (typeof a === 'string' && a.trim() === '') continue;
    compact[q.id] = typeof a === 'string' && a.length > 220 ? a.slice(0, 220) : a;
  }
  return b64encode(JSON.stringify(compact));
}

/**
 * 允许出现在分享载荷里的键。与 QUIZ_QUESTIONS 的 id 集合保持一致。
 *
 * 为什么要白名单：`?r=` 是用户可以任意构造的公开入口。没有白名单时，
 * 一个 `{"q1":"x","__proto__":{...}}` 会被 buildProfile 当成正常答案，
 * 而超长载荷会让同步解码 + 全池打分卡死主线程（分享链接是要被点开的，
 * 这是个真实的 DoS 面）。
 */
const ALLOWED_ANSWER_KEYS = new Set(QUIZ_QUESTIONS.map((q) => q.id));

/** base64url 载荷的长度上限。实测真实载荷（7 题 + 220 字自由文本）约 400 字符。 */
const MAX_TOKEN_LENGTH = 1200;

export function decodeResult(token: string): SharedResult | null {
  // 校验在解码之前：先挡掉超长载荷，别让它进 atob
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  // 只接受 base64url 字符集，避免把畸形输入交给 atob 抛异常
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;

  try {
    const parsed = JSON.parse(b64decode(token)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    // 逐键白名单过滤：只留下已知题目 id，其余（含 __proto__ 之类的注入尝试）一律丢弃
    const answers: SessionAnswers = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!ALLOWED_ANSWER_KEYS.has(k)) continue;
      if (typeof v === 'string') {
        answers[k] = v.slice(0, 220);
      } else if (Array.isArray(v)) {
        answers[k] = v.filter((x): x is string => typeof x === 'string').slice(0, 8);
      }
    }

    // q1 是画像的必填项，缺了就无法构建画像
    if (!answers.q1) return null;

    return { profile: buildProfile(answers), answers };
  } catch {
    return null;
  }
}

/** 结果页可分享的绝对 URL */
export function resultUrl(token: string): string {
  if (typeof window === 'undefined') return `/match/?r=${token}`;
  return `${window.location.origin}/match/?r=${token}`;
}
