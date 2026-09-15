/**
 * email.ts — 邮件订阅的 provider 抽象层（规格 §13 / §32）
 *
 * ⚠️ 事实前提：本站是 Cloudflare Pages 静态站，functions/ 下只有一个
 * 联盟回传接收器，**没有任何邮件后端**。旧版 /match 的邮箱表单会直接显示
 * "Reading sent! Check your inbox shortly."，但没有任何代码发出过任何请求 ——
 * 那是一句纯粹的假承诺，同时把提交的邮箱原地丢掉。
 *
 * 这里的处理方式：
 *   · 把「往哪儿提交」抽象成一个 provider，换服务只改 config.ts 一行
 *   · provider='local'（默认）**不承诺投递**，只做本地保存 + 埋点，
 *     并且结果页会给用户一条可收藏的永久链接 —— 让他真的拿到东西
 *   · 一旦填入 endpoint / convertkit / brevo，文案自动切换成真实投递口径
 */

import type { UserProfile } from './types';
import { EMAIL_CONFIG, STORAGE } from './config';
import { toSnapshot } from './engine/scoring';

/**
 * ⚠️ 必须显式写联合类型，不能用 `typeof EMAIL_CONFIG.provider`。
 *
 * 原因：EMAIL_CONFIG 带 `as const`，所以 `typeof ... .provider` 会被收窄成
 * 字面量 `'local'` —— 而下面 `submitEndpoint` 返回的 provider 是 'endpoint'，
 * 与声明类型直接冲突。当前只是因为类型推断的求值顺序侥幸通过编译；
 * 一旦有人把 EMAIL_CONFIG.provider 改成别的值，这里会一次性报出多处错误。
 */
export type EmailProvider = 'local' | 'endpoint' | 'convertkit' | 'brevo';

export interface EmailPayload {
  email: string;
  profile?: UserProfile;
  topic: string;
  /** 用户当前章节，用于订阅后的分主题发送 */
  theme?: string;
  consent: boolean;
}

export interface EmailResult {
  ok: boolean;
  provider: EmailProvider;
  /** 是否真的完成了一次对外投递（决定 UI 能说什么） */
  delivered: boolean;
  message: string;
  reason?: string;
}

export function providerCanDeliver(): boolean {
  if (EMAIL_CONFIG.provider === 'endpoint') return EMAIL_CONFIG.endpoint.length > 0;
  if (EMAIL_CONFIG.provider === 'convertkit') return EMAIL_CONFIG.convertkitFormId.length > 0;
  if (EMAIL_CONFIG.provider === 'brevo') return EMAIL_CONFIG.brevoFormUrl.length > 0;
  return false;
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at > -1 ? email.slice(at + 1).toLowerCase() : 'invalid';
}

/**
 * 邮箱格式校验。
 *
 * 此前用的是 `/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i`，它会放过
 * `a@b..com`、`x@-.com`、以及带全角字符的地址 —— 而这里的值会被
 * `identify(email)` 直接当作 PostHog 的 distinct_id，脏值会污染人物档案
 * 并且无法事后清理。收紧到「域名部分不允许连续点、不允许首尾连字符」。
 *
 * 刻意不追求 RFC 5322 完全兼容：真正的合法性只能靠发送确认邮件验证，
 * 前端正则的任务只是挡住明显的垃圾输入。
 */
export function isValidEmail(email: string): boolean {
  const v = email.trim();
  if (v.length < 6 || v.length > 254) return false;
  // 本地部分：常见字符集，不允许多余的点
  const local = '[A-Za-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&\'*+/=?^_`{|}~-]+)*';
  // 域名：标签由字母数字与连字符组成、首尾不得为连字符；标签间单点分隔；
  // 顶级域至少 2 个字母
  const domain = '(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}';
  return new RegExp(`^${local}@${domain}$`).test(v);
}

function saveLocally(payload: EmailPayload): void {
  try {
    localStorage.setItem(STORAGE.email, payload.email);
    if (payload.consent) localStorage.setItem(STORAGE.consent, new Date().toISOString());
  } catch { /* 隐私模式 */ }
}

/** 订阅者画像写进 PostHog person 属性，供后续分主题发送时导出 */
function profileFields(profile?: UserProfile): Record<string, string> {
  if (!EMAIL_CONFIG.includeProfileFields || !profile) return {};
  const s = toSnapshot(profile);
  return {
    ea_domain: s.domain,
    ea_secondary_domain: s.secondary ?? '',
    ea_relationship: s.relationship ?? '',
    ea_outcomes: s.outcomes.join(','),
    ea_emotions: s.emotions.join(','),
    ea_urgency: s.urgency,
    ea_orientation: s.orientation,
    ea_temporal: s.temporal,
  };
}

/* ── 具体 provider 实现 ────────────────────────────────────────────── */

async function submitEndpoint(payload: EmailPayload): Promise<EmailResult> {
  // 典型目标：Google 表单的 formResponse 地址（免费、无需后端、收件落在 Sheets）
  const body = new FormData();
  body.append('email', payload.email);
  body.append('topic', payload.topic);
  if (payload.theme) body.append('theme', payload.theme);
  for (const [k, v] of Object.entries(profileFields(payload.profile))) body.append(k, v);

  await fetch(EMAIL_CONFIG.endpoint, { method: 'POST', body, mode: 'no-cors' });

  // ⚠️ 已知局限（务必知情后再启用这个 provider）：
  // `mode: 'no-cors'` 是发起跨域表单提交的必要代价 —— 浏览器会对响应做
  // opaque 处理，读不到 status。所以这里**无法区分**「对方 200 收下了」
  // 与「对方 404 / 域名挂了」。下面返回的 delivered: true 只意味着
  // 「请求已成功发出」，不意味着「订阅已建立」。
  //
  // 这正是默认 provider 选择 'local' 的原因 —— 它不做任何投递承诺，
  // 因此也不会说谎。若要启用 endpoint，请改用一个你控制的、
  // 返回可读 CORS 响应的端点（那样就能在下方校验 res.ok）。
  return {
    ok: true, provider: 'endpoint', delivered: true,
    message: 'You’re on the list. Your first reading will go to this address.',
  };
}

async function submitConvertKit(payload: EmailPayload): Promise<EmailResult> {
  const res = await fetch(
    `https://app.convertkit.com/forms/${EMAIL_CONFIG.convertkitFormId}/subscriptions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email_address: payload.email,
        fields: { topic: payload.topic, theme: payload.theme ?? '', ...profileFields(payload.profile) },
      }),
    },
  );
  if (!res.ok) {
    return {
      ok: false, provider: 'convertkit', delivered: false,
      message: 'That didn’t go through. Please try again in a moment.',
      reason: `http_${res.status}`,
    };
  }
  return {
    ok: true, provider: 'convertkit', delivered: true,
    message: 'You’re on the list. Please confirm from the email we just sent.',
  };
}

async function submitBrevo(payload: EmailPayload): Promise<EmailResult> {
  const body = new FormData();
  body.append('EMAIL', payload.email);
  body.append('email_address_check', '');
  body.append('locale', 'en');
  for (const [k, v] of Object.entries(profileFields(payload.profile))) body.append(k, v);
  await fetch(EMAIL_CONFIG.brevoFormUrl, { method: 'POST', body, mode: 'no-cors' });
  return {
    ok: true, provider: 'brevo', delivered: true,
    message: 'You’re on the list. Please confirm from the email we just sent.',
  };
}

function submitLocal(payload: EmailPayload): EmailResult {
  // 零基建模式：不做任何投递承诺。用户拿到的东西是可收藏的结果链接 + 本地保存。
  return {
    ok: true, provider: 'local', delivered: false,
    message: 'Saved. Bookmark your reading above — it will still be here when you come back.',
  };
}

/* ── 对外入口 ──────────────────────────────────────────────────────── */

export async function submitEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!isValidEmail(payload.email)) {
    return { ok: false, provider: EMAIL_CONFIG.provider, delivered: false, message: 'That doesn’t look like a valid email address.', reason: 'invalid_email' };
  }
  if (EMAIL_CONFIG.requireConsent && !payload.consent) {
    return { ok: false, provider: EMAIL_CONFIG.provider, delivered: false, message: 'Please tick the box so we know it’s okay to email you.', reason: 'no_consent' };
  }

  saveLocally(payload);

  try {
    if (!providerCanDeliver()) return submitLocal(payload);
    if (EMAIL_CONFIG.provider === 'endpoint') return await submitEndpoint(payload);
    if (EMAIL_CONFIG.provider === 'convertkit') return await submitConvertKit(payload);
    if (EMAIL_CONFIG.provider === 'brevo') return await submitBrevo(payload);
    return submitLocal(payload);
  } catch (err) {
    return {
      ok: false, provider: EMAIL_CONFIG.provider, delivered: false,
      message: 'That didn’t go through. Please try again in a moment.',
      reason: err instanceof Error ? err.message : 'unknown',
    };
  }
}

/** 供 UI 决定标题/副文案用 —— 不能让界面承诺后端做不到的事 */
export function emailCopy(topicShort: string) {
  if (providerCanDeliver()) {
    return {
      heading: 'Get your weekly reading',
      body: `One short personalized reading each week, built around ${topicShort}. No filler, unsubscribe any time.`,
      cta: 'Send me the readings',
    };
  }
  return {
    heading: 'Save this reading',
    body: `Keep your theme, your reflection and the guides matched to ${topicShort}. Your answers stay on this device with your anonymous ID — and you’ll be first to know when weekly readings open.`,
    cta: 'Save my reading',
  };
}
