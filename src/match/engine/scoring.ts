/**
 * engine/scoring.ts — 确定性打分与画像构建
 *
 * 规格 §6：核心画像不得由 LLM 计算，必须确定性打分。
 * 这个文件是纯函数，没有任何副作用、不读 DOM、不读 localStorage，
 * 因此可以在 Node 里直接跑回归测试（见 scratch/match_test/engine_suite.mjs）。
 */

import {
  DOMAINS, EMOTIONS, TEMPORAL, OUTCOMES, RELATIONSHIP_STATES, URGENCIES, ORIENTATIONS,
  INTERNAL_KEYS,
  type SessionAnswers, type UserProfile, type WeightMap,
  type Domain, type EmotionalState, type TemporalOrientation, type DesiredOutcome,
  type RelationshipState, type Urgency, type SpiritualOrientation,
  type InternalKey, type Situation,
} from '../types';
import { NS, PROFILE_RULES as R, INTERNAL_RULES as IR, INTERNAL_TO_SITUATIONS } from '../config';
import { QUIZ_QUESTIONS, optionsFor } from './questions';

/* ── 1. 聚合原始分 ─────────────────────────────────────────────────── */

export function aggregateScores(answers: SessionAnswers): WeightMap {
  const scores: WeightMap = {};

  const addWeights = (weights?: WeightMap) => {
    if (!weights) return;
    for (const [k, v] of Object.entries(weights)) {
      scores[k] = (scores[k] ?? 0) + v;
    }
  };

  for (const q of QUIZ_QUESTIONS) {
    if (q.type === 'freetext') continue;
    const ans = answers[q.id];
    if (ans === undefined || ans === null) continue;

    const pool = optionsFor(q, answers);
    const picked = Array.isArray(ans) ? ans : [ans];

    for (const id of picked) {
      const opt = pool.find((o) => o.id === id);
      if (!opt) continue; // 分支切换后遗留的失效答案，直接忽略而不是当成 0 分
      addWeights(opt.weights);
    }
  }

  return scores;
}

/* ── 2. 归一化 0–100 ───────────────────────────────────────────────── */

export function normalizeScores(raw: WeightMap): WeightMap {
  const values = Object.values(raw);
  const max = values.length ? Math.max(...values) : 0;
  if (max <= 0) return {};
  const out: WeightMap = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Math.round((v / max) * 100);
  return out;
}

/* ── 3. 取分工具 ───────────────────────────────────────────────────── */

/**
 * 按命名空间取分并排序。
 * 关键修正：只有分数 > 0 的维度才会被返回。
 * 旧实现用 threshold=0，于是「分数的次高者」经常是一个 0 分的噪声维度，
 * 直接被当成 secondary_domain / 次诉求喂给推荐引擎。
 */
function pickTop<T extends string>(
  raw: WeightMap,
  prefix: string,
  universe: readonly T[],
  limit: number,
  minScore: number,
  exclude?: T,
): T[] {
  return universe
    .filter((k) => k !== exclude)
    .map((k) => ({ k, v: raw[prefix + k] ?? 0 }))
    .filter((x) => x.v >= minScore)
    .sort((a, b) => b.v - a.v)
    .slice(0, limit)
    .map((x) => x.k);
}

/* ── 4. 自由文本 → 变更/丧失事件 ───────────────────────────────────── */

const LOSS_PATTERNS: Array<[RegExp, string]> = [
  [/\b(broke up|break ?up|broke it off|we split|separated|separation)\b/i, 'recent_breakup'],
  [/\b(divorce|divorced|divorcing)\b/i, 'divorce'],
  [/\b(no contact|not talking|silence|ghosted|ignores? me)\b/i, 'no_contact_period'],
  [/\b(he|she|they) (left|moved out|walked away)\b/i, 'partner_left'],
  [/\b(lost my job|laid off|redundant|fired)\b/i, 'job_loss'],
  [/\b(died|passed away|funeral|passed|loss of my)\b/i, 'bereavement'],
  [/\b(moved|relocat|new city|immigrat)\b/i, 'relocation'],
  [/\b(diagnos|illness|sick|hospital)\b/i, 'health_event'],
  [/\b(engagement|engaged|married|marriage|wedding)\b/i, 'commitment_change'],
  [/\b(pregnan|baby|miscarriage)\b/i, 'pregnancy_change'],
];

export function detectLossOrChange(freeText?: string): string | undefined {
  if (!freeText) return undefined;
  for (const [re, label] of LOSS_PATTERNS) if (re.test(freeText)) return label;
  return undefined;
}

/** 从自由文本里做一次极轻量的关系状态补强（仅在问卷没给出关系状态时使用） */
function relationshipFromFreeText(freeText?: string): RelationshipState | undefined {
  if (!freeText) return undefined;
  if (/\b(no contact|not talking|hasn'?t (replied|texted)|ghosted)\b/i.test(freeText)) return 'no_contact';
  if (/\b(broke up|break ?up|we split|separation|ex)\b/i.test(freeText)) return 'recently_separated';
  if (/\b(situationship|complicated|mixed signals|on and off)\b/i.test(freeText)) return 'complicated';
  if (/\b(should i (text|reach out|message)|does he|does she|is he|is she)\b/i.test(freeText)) return 'thinking_about_someone';
  return undefined;
}

/* ── 5. 情境推导 ───────────────────────────────────────────────────── */

/**
 * 由作答推出「具体情境」。
 *
 * domain 只说得出「这是家庭类问题」，说不出「这是家庭冲突」还是「想怀孕」。
 * 后者才是决定一篇文章是否真的写给这个人的东西。
 */
const Q2_SITUATIONS: Record<string, import('../types').Situation[]> = {
  // love
  single: ['single'],
  dating: ['dating'],
  talking: ['dating'],
  relationship: [],
  breakup: ['breakup_recovery'],
  no_contact: ['no_contact'],
  thinking: [],
  complicated: [],
  // money
  job_search: ['career_money'],
  lost_job: ['career_money'],
  debt: [],
  stuck: ['career_money'],
  business: ['business', 'career_money'],
  direction: [],
  // future
  feeling_stuck: [],
  big_choice: [],
  need_change: [],
  worry: [],
  shift: [],
  timing: [],
  // direction
  lost_purpose: ['purpose'],
  new_chapter: [],
  bored: [],
  healing: ['healing'],
  creative: [],
  deeper_path: [],
  // spirituality
  seeing_signs: ['signs'],
  awakening: ['awakening'],
  dreams: ['dream'],
  intuition: [],
  guides: [],
  disconnected: [],
  // family
  conflict: [],
  boundaries: [],
  conceive: ['pregnancy'],
  parenting: ['parenting'],
  estranged: ['estrangement'],
  caregiving: ['caregiving'],
  // protection
  bad_luck: [],
  toxic_person: ['toxic_relationship'],
  heaviness: [],
  presence: [],
  cleansing: [],
  boundaries_energy: [],
  // unsure
  just_curious: [],
  need_help: [],
  overwhelmed: [],
  drawn_here: [],
  flat: [],
  other: [],
};

const RELATIONSHIP_SITUATIONS: Partial<Record<RelationshipState, import('../types').Situation[]>> = {
  single: ['single'],
  dating: ['dating'],
  talking: ['dating'],
  recently_separated: ['breakup_recovery'],
  no_contact: ['no_contact'],
  thinking_about_someone: [],
  complicated: [],
  relationship: [],
};

const FREE_TEXT_SITUATIONS: Array<[import('../types').Situation, RegExp]> = [
  ['marriage', /\b(marriage|married|propose|proposal|wedding)\b/i],
  ['pregnancy', /\b(pregnan|trying for a baby|conceiv|miscarriage)\b/i],
  ['ldr', /\b(long distance|ldr|different cit(y|ies)|other country)\b/i],
  ['age_gap', /\b(age gap|older (man|woman)|younger (man|woman))\b/i],
  ['lgbtq', /\b(gay|lesbian|queer|same.sex|my girlfriend|my boyfriend|my wife|my husband)\b/i],
  ['pet', /\b(my dog|my cat|my pet|passed (away)? my (dog|cat))\b/i],
  ['past_life', /\b(past life|reincarnat)\b/i],
  ['dream', /\b(dream|dreams|dreaming)\b/i],
  ['career_money', /\b(new job|job search|interview|laid off|fired|career change|my business|my salary)\b/i],
  ['first_timer', /\b(first (ever )?reading|never (had|done) a reading|how do readings work)\b/i],
  ['signs', /\b(1111|222|333|444|repeating numbers|signs everywhere|synchronicit)\b/i],
  ['toxic_relationship', /\b(toxic|narcissist|manipulat|walking on eggshells)\b/i],
  ['cost', /\b(how much|too expensive|can'?t afford|cheap(er)?)\b/i],
];

export function deriveSituations(
  answers: SessionAnswers,
  relationship_state?: RelationshipState,
  freeText?: string,
  internal_key?: InternalKey,
): Situation[] {
  const out = new Set<Situation>();

  const q2 = answers.q2;
  if (typeof q2 === 'string') (Q2_SITUATIONS[q2] ?? []).forEach((s) => out.add(s));
  if (relationship_state) (RELATIONSHIP_SITUATIONS[relationship_state] ?? []).forEach((s) => out.add(s));

  if (freeText) {
    for (const [tag, re] of FREE_TEXT_SITUATIONS) if (re.test(freeText)) out.add(tag);
  }

  // 机制轴 → 情境轴桥接。
  // 机制比情境更细：两个人可能都是 no_contact，但一个真的失去了（sudden_loss），
  // 一个是对象根本不可得（illusion_fixation）。这一步让推荐引擎用上这层信息，
  // 而不必改动文章池的标注体系。机制情境是**追加**的，不覆盖已有推断 ——
  // 它表达的是「除了字面情境，还有这一层」，冲突时要靠 SITUATION_WEIGHTS 自然裁决。
  if (internal_key) {
    for (const s of INTERNAL_TO_SITUATIONS[internal_key] ?? []) out.add(s);
  }

  return Array.from(out);
}

/* ── 5b. 底层机制轴（内部专用） ─────────────────────────────────────── */

/**
 * 选出底层机制，并返回「是否值得渲染」的判断。
 *
 * 两道闸门（阈值都在 config.INTERNAL_RULES）：
 *   1. minScore —— 冠军机制必须真的被点亮，而不是靠 q2 的辅助权重凑分。
 *      专设题命中即 30 分，所以 18 分这条线意味着「要么直接被选中，
 *      要么在具体困境里被强烈暗示」。
 *   2. minLead  —— 冠军必须比第二名高出足够幅度。
 *      两个人格样本（比如「反复回到伤害自己的人」同时命中
 *      toxic_loop 与被侵蚀的边界 boundary_invasion）如果分差太小，
 *      硬选一个去渲染解读，用户会觉得「说的不完全是我不一样的部分」。
 *      此时返回 undefined，结果页整体不渲染机制区块 —— 这是刻意的：
 *      一个错位的「被理解」比没有更伤信任。
 */
export function pickInternalKey(raw: WeightMap): InternalKey | undefined {
  const ranked = INTERNAL_KEYS
    .map((k) => ({ k, v: raw[NS.internal + k] ?? 0 }))
    .sort((a, b) => b.v - a.v);

  const top = ranked[0];
  if (!top || top.v < IR.minScore) return undefined;

  const second = ranked[1];
  if (second && top.v - second.v < IR.minLead) return undefined;

  return top.k;
}

/**
 * 机制轴的归一化分（仅用于埋点分布分析与回归断言，不渲染）。
 * 单独做而不是复用 normalizeScores，因为后者是全轴最大值归一化，
 * 会被 domain 的大分数稀释，看不出机制内部的相对强弱。
 */
export function normalizeInternalScores(raw: WeightMap): WeightMap {
  const out: WeightMap = {};
  for (const k of INTERNAL_KEYS) {
    const v = raw[NS.internal + k];
    if (v !== undefined && v > 0) out[k] = v;
  }
  return out;
}

/* ── 6. 构建画像 ───────────────────────────────────────────────────── */

export function buildProfile(answers: SessionAnswers, sessionId?: string): UserProfile {
  const rawScores = aggregateScores(answers);
  const normalizedScores = normalizeScores(rawScores);

  const topDomains = pickTop(rawScores, NS.domain, DOMAINS, 2, 1);
  const primary_domain: Domain = topDomains[0] ?? R.fallbackDomain;
  const secondary_domain: Domain | undefined = topDomains[1];

  const emotional_states = pickTop(
    rawScores, NS.emotion, EMOTIONS, R.maxEmotions, R.emotionMinScore,
  ) as EmotionalState[];

  const relTop = pickTop(rawScores, NS.relationship, RELATIONSHIP_STATES, 1, 1)[0] as RelationshipState | undefined;
  // 自由文本是最后一题（q8）。历史事故：插入机制题后此处的题号引用未同步，
  // 会读到一个不存在的键 → freeTextAnswer 永远 undefined，丧失事件检测全体失效。
  const freeTextAnswer = typeof answers.q8 === 'string' ? (answers.q8 as string) : undefined;
  const relationship_state = relTop ?? relationshipFromFreeText(freeTextAnswer);

  const desired_outcomes = pickTop(
    rawScores, NS.outcome, OUTCOMES, R.maxOutcomes, R.outcomeMinScore,
  ) as DesiredOutcome[];

  // 旧 bug：全零时 getTop 返回数组首项 'past'，把所有人默认成「回望过去」
  const temporal_orientation = (pickTop(rawScores, NS.temporal, TEMPORAL, 1, 1)[0]
    ?? R.defaultTemporal) as TemporalOrientation;

  const urgency = (pickTop(rawScores, NS.urgency, URGENCIES, 1, 1)[0] ?? R.defaultUrgency) as Urgency;

  const spiritual_orientation = (pickTop(rawScores, NS.orientation, ORIENTATIONS, 1, 1)[0]
    ?? R.defaultOrientation) as SpiritualOrientation;

  // 机制轴：必须在 deriveSituations 之前算出，因为情境推导要用它做桥接。
  const internal_key = pickInternalKey(rawScores);
  const internalScores = normalizeInternalScores(rawScores);

  const situations = deriveSituations(answers, relationship_state, freeTextAnswer, internal_key);

  return {
    primary_domain,
    secondary_domain,
    emotional_states,
    relationship_state,
    desired_outcomes: desired_outcomes.length ? desired_outcomes : ['clarity'],
    temporal_orientation,
    urgency,
    spiritual_orientation,
    situations,
    internal_key,
    internalScores,
    loss_or_change: detectLossOrChange(freeTextAnswer),
    freeTextAnswer,
    rawScores,
    normalizedScores,
    createdAt: new Date().toISOString(),
    sessionId: sessionId ?? Math.random().toString(36).slice(2, 15),
  };
}

/* ── 6. 画像 → 可读快照（埋点与邮件用） ────────────────────────────── */

export interface ProfileSnapshot {
  domain: Domain;
  secondary?: Domain;
  emotions: EmotionalState[];
  relationship?: RelationshipState;
  outcomes: DesiredOutcome[];
  temporal: TemporalOrientation;
  urgency: Urgency;
  orientation: SpiritualOrientation;
  loss_or_change?: string;
  /** 分数前 5 名，便于在 PostHog 里看分布 */
  top_scores: Array<{ k: string; v: number }>;
}

export function toSnapshot(p: UserProfile): ProfileSnapshot {
  return {
    domain: p.primary_domain,
    secondary: p.secondary_domain,
    emotions: p.emotional_states,
    relationship: p.relationship_state,
    outcomes: p.desired_outcomes,
    temporal: p.temporal_orientation,
    urgency: p.urgency,
    orientation: p.spiritual_orientation,
    loss_or_change: p.loss_or_change,
    top_scores: Object.entries(p.normalizedScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => ({ k: k.replace(/^[a-z]:/, ''), v })),
  };
}

/* ── 7. 持久化辅助 ─────────────────────────────────────────────────── */

export interface StoredProfile {
  profile: UserProfile;
  answers: SessionAnswers;
  theme: string;
  savedAt: string;
}
