/**
 * analytics.ts — 埋点（规格 §18 / §19）
 *
 * 事件名沿用已有的 `match_` 前缀（旧版已经在 PostHog 里跑，
 * 改名会让历史看板断掉），在此之上补齐规格要求但此前缺失的事件。
 *
 * 每个事件都自动带上 attributionProps()：anonymous_id / session_id /
 * source / landing_page / utm_* / first_touch_source / visit_count。
 */

import type { ProfileSnapshot } from './engine/scoring';
import { attributionProps } from './attribution';

declare global {
  interface Window { posthog?: any }
}

type Props = Record<string, unknown>;

/** 仅开发环境把事件打到控制台，方便本地验证埋点是否按预期触发 */
const IS_DEV = (() => {
  try { return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV); } catch { return false; }
})();

function capture(event: string, props: Props = {}): void {
  const payload = {
    ...attributionProps(),
    ...props,
    timestamp: new Date().toISOString(),
  };
  try {
    if (typeof window !== 'undefined' && window.posthog?.capture) {
      window.posthog.capture(event, payload);
    } else if (IS_DEV) {
      console.debug(`[match] ${event}`, payload);
    }
  } catch {
    /* 埋点永不阻塞交互 */
  }
}

export const track = {
  /* ── 测验漏斗 ── */
  quizStarted: (source: string) => capture('match_quiz_started', { source }),

  questionAnswered: (params: {
    questionId: string; stepIndex: number; total: number;
    optionIds: string[]; msOnQuestion: number; changedAnswer: boolean;
  }) => capture('match_question_answered', params),

  questionSkipped: (params: { questionId: string; stepIndex: number }) =>
    capture('match_question_skipped', params),

  quizCompleted: (params: {
    profile: ProfileSnapshot; durationMs: number; answered: number; skippedFreeText: boolean;
  }) => capture('match_quiz_completed', {
    profile_snapshot: params.profile,
    quiz_duration_ms: params.durationMs,
    answered_count: params.answered,
    skipped_free_text: params.skippedFreeText,
  }),

  quizAbandoned: (params: { lastQuestionIndex: number; total: number; durationMs: number }) =>
    capture('match_quiz_abandoned', params),

  backNavigated: (params: { fromQuestion: string; toQuestion: string; fromIndex: number }) =>
    capture('match_back_navigated', params),

  /* ── 结果页 ── */
  resultViewed: (params: {
    profile: ProfileSnapshot; theme: string; intent: string;
    readerCount: number; articleCount: number; restored: boolean;
  }) => capture('match_result_viewed', {
    profile_snapshot: params.profile,
    theme: params.theme,
    commercial_intent: params.intent,
    reader_count: params.readerCount,
    article_count: params.articleCount,
    restored_from_storage: params.restored,
  }),

  /** 结果页读完深度：只有真正读到读者区块才会曝光，用来算漏损点 */
  sectionViewed: (section: string, scrollPct: number, msSinceResult: number) =>
    capture('match_section_viewed', { section, scroll_pct: scrollPct, ms_since_result: msSinceResult }),

  resultLinkCopied: (profile: ProfileSnapshot) =>
    capture('match_result_link_copied', { profile_snapshot: profile }),

  /* ── 读者 ── */
  readerImpression: (params: {
    readerSlug: string; platform: string; position: number; matchScore: number;
    profile: ProfileSnapshot;
  }) => capture('match_reader_impression', {
    readerSlug: params.readerSlug,
    platform: params.platform,
    position: params.position,
    matchScore: params.matchScore,
    profile_snapshot: params.profile,
  }),

  readerClicked: (params: {
    readerSlug: string; platform: string; position: number; matchScore: number;
    profile: ProfileSnapshot;
  }) => capture('match_reader_clicked', {
    readerSlug: params.readerSlug,
    platform: params.platform,
    position: params.position,
    matchScore: params.matchScore,
    profile_snapshot: params.profile,
  }),

  /* ── 文章 ── */
  articleImpression: (params: {
    articleSlug: string; position: number; isFlagship: boolean; profile: ProfileSnapshot;
  }) => capture('match_article_impression', {
    articleSlug: params.articleSlug,
    position: params.position,
    is_flagship: params.isFlagship,
    profile_snapshot: params.profile,
  }),

  articleClicked: (params: {
    articleSlug: string; position: number; url: string; isFlagship: boolean; profile: ProfileSnapshot;
  }) => capture('match_article_clicked', {
    articleSlug: params.articleSlug,
    position: params.position,
    url: params.url,
    is_flagship: params.isFlagship,
    profile_snapshot: params.profile,
  }),

  /* ── 邮件 ── */
  emailFormViewed: (profile: ProfileSnapshot) =>
    capture('match_email_form_viewed', { profile_snapshot: profile }),

  emailSubmitted: (params: {
    emailDomain: string; provider: string; consent: boolean; topic: string;
  }) => capture('match_email_submitted', {
    // 不落完整邮箱：只落域名，既够做质量分析，又不把 PII 写进分析库
    email_domain: params.emailDomain,
    provider: params.provider,
    consent: params.consent,
    email_topic: params.topic,
  }),

  emailFailed: (params: { provider: string; reason: string }) =>
    capture('match_email_failed', params),

  /* ── 每日牌 ── */
  dailyCardStarted: (profile?: ProfileSnapshot) =>
    capture('match_daily_card_started', { profile_snapshot: profile ?? null }),

  dailyCardCompleted: (params: {
    cardName: string; cardId: string; repeated: boolean; streak: number; profile?: ProfileSnapshot;
  }) => capture('match_daily_card_completed', {
    cardName: params.cardName,
    cardId: params.cardId,
    was_repeat_of_previous: params.repeated,
    streak: params.streak,
    profile_snapshot: params.profile ?? null,
  }),

  /* ── Ask the Universe ── */
  askStarted: (profile?: ProfileSnapshot) =>
    capture('match_ask_started', { profile_snapshot: profile ?? null }),

  askCompleted: (params: {
    questionLength: number; domain: string; outcomes: string[];
    predictionSeeking: boolean; articleCount: number; suggestedHuman: boolean;
  }) => capture('match_ask_completed', {
    question_length: params.questionLength,
    classified_domain: params.domain,
    classified_outcomes: params.outcomes,
    prediction_seeking: params.predictionSeeking,
    article_count: params.articleCount,
    suggested_human_reading: params.suggestedHuman,
  }),

  /* ── 合规 ── */
  /**
   * 危机拦截。**刻意不落任何用户文本**（连长度都不落）：
   * 这类内容的分析价值远低于它一旦泄漏造成的伤害。
   * 只记来源与是否被拦截，用于确认护栏在两条入口上都活着。
   */
  crisisDetected: (params: { source: 'quiz' | 'ask' }) =>
    capture('match_crisis_detected', { source: params.source, blocked: true }),

  /* ── 通用 ── */
  error: (where: string, message: string) =>
    capture('match_error', { where, message: message.slice(0, 300) }),
};

export type Track = typeof track;
