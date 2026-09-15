/**
 * engine/narrative.ts — 主题叙事选取 + 锚定句生成
 *
 * 规格 §8：不得只靠通用 Barnum 式描述完成个性化，
 * **至少一句重要陈述必须锚定在用户显式提供的答案上**。
 * 旧实现的 NarrativeBlock.explicitAnchorField 字段被声明后从未被任何渲染路径消费，
 * 等于这条硬要求根本没落地。这里把它实现成 buildAnchor()。
 */

import type {
  Narrative, NarrativeBlock, SessionAnswers, UserProfile, MechanismNarrative,
} from '../types';
import { NARRATIVE_BLOCKS, getFallbackNarrative } from '../content/narrativeBlocks';
import { getMechanismContent } from '../content/internalMechanisms';
import { INTERNAL_RULES } from '../config';
import { QUIZ_QUESTIONS, optionsFor } from './questions';

/* ── 1. 主题块选取 ─────────────────────────────────────────────────── */

export function selectNarrative(profile: UserProfile): NarrativeBlock {
  const candidates: string[] = [];
  if (profile.relationship_state) candidates.push(`${profile.primary_domain}__${profile.relationship_state}`);
  for (const emo of profile.emotional_states) candidates.push(`${profile.primary_domain}__${emo}`);
  candidates.push(profile.primary_domain);
  if (profile.secondary_domain) candidates.push(profile.secondary_domain);

  for (const c of candidates) {
    const block = NARRATIVE_BLOCKS.find((b) => b.key === c);
    if (block) return block;
  }
  return getFallbackNarrative(profile);
}

/* ── 2. 锚定句 ─────────────────────────────────────────────────────── */

/** 取某题在当前作答下被选中的选项对象序列 */
function pickedOptions(questionId: string, answers: SessionAnswers) {
  const q = QUIZ_QUESTIONS.find((x) => x.id === questionId);
  if (!q) return [];
  const ans = answers[questionId];
  if (ans === undefined || ans === null || ans === '') return [];
  const pool = optionsFor(q, answers);
  const ids = Array.isArray(ans) ? ans : [ans];
  return ids.map((id) => pool.find((o) => o.id === id)).filter(Boolean) as import('../types').QuizOption[];
}

/** 把自由文本裁成一句可安全引用的片段 */
function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

/**
 * 生成明确引用用户自己答案的一段话。
 * 每一句都来自他勾过的选项，没有任何推测。
 *
 * ⚠️ 刻意跳过 q4（机制题）：机制轴是幕后解释，如果在这里复述它，
 * 用户会看到「原来我被归到了这一类」—— 那正是我们要避免的。
 * 机制只以解读段落的形式出现（见 buildMechanismNarrative）。
 */
export function buildAnchor(answers: SessionAnswers): string {
  const parts: string[] = [];

  const q2 = pickedOptions('q2', answers).find((o) => o.anchorPhrase);
  if (q2?.anchorPhrase) parts.push(`You told us that ${q2.anchorPhrase}.`);

  const q6 = pickedOptions('q6', answers).find((o) => o.anchorPhrase);
  if (q6?.anchorPhrase) parts.push(`You said it’s been on your mind ${q6.anchorPhrase}.`);

  const q3 = pickedOptions('q3', answers)[0];
  if (q3?.anchorPhrase) parts.push(`What you’re hoping to find is ${q3.anchorPhrase}.`);

  const q5 = pickedOptions('q5', answers)[0];
  if (q5?.anchorPhrase) parts.push(`Right now the loudest feeling is ${q5.anchorPhrase}.`);

  const free = typeof answers.q8 === 'string' ? (answers.q8 as string).trim() : '';
  if (free.length >= 12) parts.push(`And in your own words: “${snippet(free)}”`);

  return parts.join(' ');
}

/* ── 3. 语气微调 ───────────────────────────────────────────────────── */

export function buildToneLine(profile: UserProfile): string | undefined {
  if (profile.urgency === 'high') {
    return 'Because this still feels fresh, the pressure to resolve it quickly may be stronger than the situation itself warrants.';
  }
  if (profile.urgency === 'low') {
    return 'You have been carrying this for a while now — which usually means you already know more about it than you give yourself credit for.';
  }
  if (profile.spiritual_orientation === 'skeptical') {
    return 'Nothing here asks you to believe anything you would rather not. Take only what is useful and leave the rest.';
  }
  return undefined;
}

/* ── 4. 底层机制解读 ───────────────────────────────────────────────── */

/**
 * 把命中的机制渲染成可展示的解读（规格 §28）。
 *
 * 纪律：
 *   · UI 层拿不到 key —— 这里只返回 paragraphs / reflections，
 *     key 仅用于埋点分布分析与回归测试
 *   · 绝不渲染 actions（用户明确指示不提供解决方法，见
 *     config.ts 的 MECHANISM_ACTIONS_ENABLED）
 *   · 没有命中机制时返回 undefined，结果页不渲染该区块，
 *     不退回任何默认机制（那会让解读变成套话）
 */
export function buildMechanismNarrative(profile: UserProfile): MechanismNarrative | undefined {
  const key = profile.internal_key;
  if (!key) return undefined;

  const content = getMechanismContent(key);
  if (!content) return undefined;

  return {
    key,
    paragraphs: content.narrative,
    // 只取前 N 条：结果页已有 7 个区块，再多没人读完
    reflections: content.reflections.slice(0, INTERNAL_RULES.reflectionCount),
  };
}

/* ── 5. 组装 ───────────────────────────────────────────────────────── */

export function buildNarrative(profile: UserProfile, answers: SessionAnswers): Narrative {
  return {
    block: selectNarrative(profile),
    anchor: buildAnchor(answers),
    toneLine: buildToneLine(profile),
    mechanism: buildMechanismNarrative(profile),
  };
}
