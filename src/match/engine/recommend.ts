/**
 * engine/recommend.ts — 统一推荐引擎（读者 / 文章 / 邮件主题 / 区块顺序）
 *
 * 规格 §9 / §11 / §25 / §27。
 * 权重全部来自 config.ts，改效果不需要碰这个文件之外的东西。
 */

import type {
  ArticleMetadata, RecommendationResult, ResultSection,
  ScoredArticle, ScoredReader, UserProfile, ReaderMatchMetadata, Narrative,
} from '../types';
import {
  ARTICLE_WEIGHTS as AW, READER_WEIGHTS as RW, SITUATION_WEIGHTS as SW,
  MAX_ARTICLES, MAX_READERS, MAX_READERS_PER_PLATFORM, PLATFORM_ORDER,
  HIGH_INTENT_OUTCOMES, SECTION_ORDER, DOMAIN_AFFINITY, TIER, MIN_FLAGSHIP_SCORE,
  EXCLUSIVE_SITUATIONS, READERS_GATE_FOR_LOW_INTENT,
} from '../config';
import {
  DOMAIN_LABEL, EMOTION_LABEL, RELATIONSHIP_LABEL, OUTCOME_LABEL,
  STYLE_LABEL, EMAIL_TOPIC, TEMPORAL_LABEL, SITUATION_LABEL,
} from '../content/labels';
import { titleTokens, jaccard } from '../content/articleClassifier';

/* ── 文章打分 ──────────────────────────────────────────────────────── */

/** 相关性分级 —— 决定一篇文章能不能占旗舰位 */
export function relevanceTier(profile: UserProfile, a: ArticleMetadata): number {
  const situationHit = !!(a.situations && a.situations.some((s) => profile.situations.includes(s)));

  // 「文章讲的就是你的情境」是全部信号里最强的一个，直接置顶，
  // 不管领域是否精确相等 —— 领域只是粗分类，情境才是这个人。
  if (situationHit && !a.topic_agnostic) return TIER.exact_plus;

  if (a.topic_agnostic) return TIER.agnostic;
  if (a.primary_domain === profile.primary_domain) {
    const corroborated =
      (profile.relationship_state && a.relationship_states.includes(profile.relationship_state)) ||
      a.emotional_states.some((e) => profile.emotional_states.includes(e));
    return corroborated ? TIER.exact_plus : TIER.exact;
  }
  if (DOMAIN_AFFINITY[profile.primary_domain]?.includes(a.primary_domain)) return TIER.affine;
  return TIER.agnostic;
}

/** 文章的情境是否与用户明确冲突（命中「窄情境」且用户不在其中） */
export function hasSituationConflict(profile: UserProfile, a: ArticleMetadata): boolean {
  if (!a.situations || !a.situations.length) return false;
  if (a.situations.some((s) => profile.situations.includes(s))) return false;
  return a.situations.some((s) => (EXCLUSIVE_SITUATIONS as readonly string[]).includes(s));
}

export function scoreArticle(profile: UserProfile, a: ArticleMetadata): { score: number; reasons: string[]; tier: number } {
  let score = 0;
  const reasons: string[] = [];
  const tier = relevanceTier(profile, a);

  // 情境：最强的一个信号。扣分只针对「窄情境」冲突 —— 宽情境（work and
  // money / anxiety / healing 这类话题）不命中并不代表跑题，扣分反而会
  // 把本来可用的内容压到旗舰线以下。
  if (a.situations && a.situations.length) {
    const hits = a.situations.filter((s) => profile.situations.includes(s));
    if (hits.length) {
      score += SW.match;
      reasons.push(`It’s about ${hits.map((h) => SITUATION_LABEL[h] ?? h).join(' and ')}, which is what you described`);
    } else if (hasSituationConflict(profile, a)) {
      score += SW.conflict;
    }
  }

  // 没有话题证据的文章（平台测评、信任类内容）不拿领域加权。
  // 否则「Is Purple Garden Legit or a Scam?」会靠 love 这个默认领域
  // 排到恋爱类用户的第一位。
  if (!a.topic_agnostic) {
    if (a.primary_domain === profile.primary_domain) {
      score += AW.primary_domain_match;
      reasons.push(`It’s written for ${DOMAIN_LABEL[a.primary_domain]}`);
    } else if (DOMAIN_AFFINITY[profile.primary_domain]?.includes(a.primary_domain)) {
      score += AW.affinity_domain_match;
      reasons.push(`It overlaps with ${DOMAIN_LABEL[profile.primary_domain]}`);
    }
    if (profile.secondary_domain && a.primary_domain === profile.secondary_domain) {
      score += AW.secondary_domain_match;
      reasons.push(`It touches the ${DOMAIN_LABEL[profile.secondary_domain]} side of this too`);
    }
    if (profile.secondary_domain && a.secondary_topics.includes(profile.secondary_domain)) {
      score += AW.secondary_topic_match;
    }
  }

  let emoHits = 0;
  for (const e of profile.emotional_states) {
    if (a.emotional_states.includes(e)) {
      score += AW.emotional_state_match * Math.pow(AW.emotion_diminish, emoHits);
      emoHits++;
      reasons.push(`It speaks to the ${EMOTION_LABEL[e]} in it`);
    }
  }

  if (profile.relationship_state && a.relationship_states.includes(profile.relationship_state)) {
    score += AW.relationship_state_match;
    reasons.push(`It deals directly with ${RELATIONSHIP_LABEL[profile.relationship_state]}`);
  }

  let outHits = 0;
  for (const o of profile.desired_outcomes) {
    if (a.desired_outcomes.includes(o)) {
      score += AW.desired_outcome_match * Math.pow(AW.outcome_diminish, outHits);
      outHits++;
      reasons.push(`It aims at ${OUTCOME_LABEL[o]}, which is what you asked for`);
    }
  }

  if (a.temporal_orientation.includes(profile.temporal_orientation)) {
    score += AW.temporal_orientation_match;
    reasons.push(`It’s oriented toward ${TEMPORAL_LABEL[profile.temporal_orientation]}`);
  }

  if (a.commercial_intent === 'high') score += AW.commercial_intent_high;
  else if (a.commercial_intent === 'medium') score += AW.commercial_intent_medium;

  return { score, reasons, tier };
}

/* ── 读者打分 ──────────────────────────────────────────────────────── */

export function scoreReader(profile: UserProfile, r: ReaderMatchMetadata): { score: number; reasons: string[] } {
  if (!r.availability) return { score: 0, reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  if (r.specialties.includes(profile.primary_domain)) {
    score += RW.specialty_primary;
    reasons.push(`Works mainly with ${DOMAIN_LABEL[profile.primary_domain]}`);
  } else if (profile.secondary_domain && r.specialties.includes(profile.secondary_domain)) {
    score += RW.specialty_secondary;
    reasons.push(`Works with ${DOMAIN_LABEL[profile.secondary_domain]}`);
  }

  if (profile.relationship_state && r.relationship_states.includes(profile.relationship_state)) {
    score += RW.relationship_match;
    reasons.push(`Has a track record with ${RELATIONSHIP_LABEL[profile.relationship_state]}`);
  }

  // 风格：想要「直白答案」的人配 'direct' 型读者，这比泛泛的「高评分」信息量大
  const wantsDirect = profile.desired_outcomes.includes('clarity') || profile.desired_outcomes.includes('validation');
  if (wantsDirect && r.style.includes('direct')) {
    score += RW.style_match;
    reasons.push('Reads direct, which is what you asked for');
  } else if (r.style.includes('empathetic')) {
    score += RW.style_match * 0.5;
    reasons.push(`Described by clients as ${STYLE_LABEL.empathetic ?? 'warm'}`);
  }

  const ratingPoints = Math.max(0, r.rating - RW.rating_baseline) * RW.rating_per_point;
  score += ratingPoints;
  if (r.rating >= 4.5) reasons.push(`Rated ${r.rating.toFixed(1)}`);

  if (r.freeOffer) {
    score += RW.free_offer_bonus;
    reasons.push(`Offers ${r.freeOffer} for first-time clients`);
  }

  const idx = PLATFORM_ORDER.indexOf(r.platform);
  if (idx > 0) score -= idx * RW.platform_priority_step;

  return { score, reasons: reasons.slice(0, 3) };
}

/* ── 商业意图与区块顺序（规格 §27） ────────────────────────────────── */

export function commercialIntent(profile: UserProfile): 'high' | 'medium' | 'low' {
  const highHits = profile.desired_outcomes.filter((o) =>
    (HIGH_INTENT_OUTCOMES as readonly string[]).includes(o)).length;
  if (highHits >= 1 && profile.urgency !== 'low') return 'high';
  if (profile.urgency === 'high' && profile.relationship_state === 'no_contact') return 'high';
  if (highHits === 0 && profile.desired_outcomes.includes('clarity')) return 'low';
  return 'medium';
}

function sectionOrderFor(intent: 'high' | 'medium' | 'low'): ResultSection[] {
  return SECTION_ORDER[intent] as ResultSection[];
}

/** 读者：同平台配额，避免结果页被单一平台占满 */
function rankReaders(profile: UserProfile, readers: ReaderMatchMetadata[]): ScoredReader[] {
  const perPlatform: Record<string, number> = {};
  return readers
    .map((r) => {
      const { score, reasons } = scoreReader(profile, r);
      return { ...r, matchScore: score, reasons };
    })
    .filter((r) => r.matchScore > 0)
    .sort((x, y) => y.matchScore - x.matchScore || x.slug.localeCompare(y.slug))
    .filter((r) => {
      perPlatform[r.platform] = (perPlatform[r.platform] ?? 0) + 1;
      return perPlatform[r.platform] <= MAX_READERS_PER_PLATFORM;
    })
    .slice(0, MAX_READERS)
    .map((r) => ({ ...r, matchScore: Math.min(99, Math.round(r.matchScore)) }));
}

/**
 * 文章排序：分级 → 分数 → 去重。
 * 测验结果页与 Ask the Universe 共用这一条路径，
 * 避免两个入口给出不一致的推荐口径。
 */
export function rankArticles(
  profile: UserProfile,
  articles: ArticleMetadata[],
): { articles: ScoredArticle[]; flagshipIsTopical: boolean } {
  const ranked = articles
    // 窄情境冲突的文章直接排除：给求职中的人推《异地恋时间线》、
    // 给家庭冲突的人推《怀孕占卜》，这类错误在用户眼里最刺眼，
    // 而且会连带损害整页推荐的可信度。
    .filter((a) => !hasSituationConflict(profile, a))
    .map((a) => {
      const { score, reasons, tier } = scoreArticle(profile, a);
      return { ...a, matchScore: score, reasons, tier };
    })
    .filter((a) => a.matchScore > 0)
    .sort((x, y) => x.tier - y.tier || y.matchScore - x.matchScore || x.slug.localeCompare(y.slug));

  // 同题去重，两重判定：
  //   1. 标题近似度（how-to-choose / how-to-pick 这类成对文章）
  //   2. 意图签名（领域 + 诉求 + 情境 + 是否无话题）—— 签名相同的两篇
  //      在推荐语境里是可互换的，同时推给一个人等于浪费一个名额
  const picked: Array<ScoredArticle & { tier: number }> = [];
  const takenTokens: Array<Set<string>> = [];
  const takenSignatures = new Set<string>();
  for (const a of ranked) {
    const tokens = titleTokens(a.title);
    const signature = [
      a.topic_agnostic ? 'generic' : a.primary_domain,
      [...a.desired_outcomes].sort().join('+'),
      [...(a.situations ?? [])].sort().join('+'),
    ].join('|');

    const nearDuplicate = takenTokens.some((t) => jaccard(t, tokens) > 0.5);
    const sameIntent = takenSignatures.has(signature);
    if (nearDuplicate || sameIntent) continue;

    takenTokens.push(tokens);
    takenSignatures.add(signature);
    picked.push(a);
    if (picked.length >= MAX_ARTICLES) break;
  }

  // 旗舰位必须既相关（tier）、又足够像在说这个人（分数下限）。
  // 两条都不满足时如实降级：UI 换标题、不挂「Best match」。
  const flagshipIsTopical = picked.length > 0
    && picked[0].tier <= TIER.affine
    && picked[0].matchScore >= MIN_FLAGSHIP_SCORE;

  // 没有合格旗舰时，列表本身改按分数排序 —— 降级状态下第一名的意义
  // 只是「最接近的一篇」，不该继续沿用「分级优先」的排序。
  if (!flagshipIsTopical) {
    picked.sort((x, y) => y.matchScore - x.matchScore || x.slug.localeCompare(y.slug));
  }
  const out: ScoredArticle[] = picked.map((item) => {
    const { tier, ...rest } = item;
    void tier;
    return rest;
  });
  return { articles: out, flagshipIsTopical };
}

/* ── 编排 ─────────────────────────────────────────────────────────── */

export interface RecommendInput {
  profile: UserProfile;
  readers: ReaderMatchMetadata[];
  articles: ArticleMetadata[];
  narrative: Narrative;
}

export function getRecommendations({
  profile, readers, articles, narrative,
}: RecommendInput): RecommendationResult {
  const { articles: scoredArticles, flagshipIsTopical: articleFlagshipIsTopical } = rankArticles(profile, articles);
  const scoredReaders = rankReaders(profile, readers);

  const topic = EMAIL_TOPIC[profile.primary_domain];
  const intent = commercialIntent(profile);

  return {
    // 低意图门禁（规格 §27）：只是好奇、想要一个新视角的人，不该一进结果页
    // 就被推付费咨询。此前 SECTION_ORDER.low 已把 readers 排到最后，但区块
    // 依然渲染 —— 于是「不硬推」只做到了排序、没做到取舍。
    // 注意这里只是把它从结果页拿掉，Ask 工具与文章内链仍可到达读者页。
    readers: READERS_GATE_FOR_LOW_INTENT && intent === 'low' ? [] : scoredReaders,
    articles: scoredArticles,
    articleFlagshipIsTopical,
    emailTopic: topic.line,
    emailTopicShort: topic.short,
    narrative,
    sectionOrder: sectionOrderFor(intent),
  };
}
