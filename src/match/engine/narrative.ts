/**
 * engine/narrative.ts — 主题叙事选取 + 锚定句生成
 *
 * 规格 §8：不得只靠通用 Barnum 式描述完成个性化，
 * **至少一句重要陈述必须锚定在用户显式提供的答案上**。
 * 旧实现的 NarrativeBlock.explicitAnchorField 字段被声明后从未被任何渲染路径消费，
 * 等于这条硬要求根本没落地。这里把它实现成 buildAnchor()。
 */

import type {
  Narrative, NarrativeBlock, SessionAnswers, UserProfile,
} from '../types';
import { NARRATIVE_BLOCKS, getFallbackNarrative } from '../content/narrativeBlocks';
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
 */
export function buildAnchor(answers: SessionAnswers): string {
  const parts: string[] = [];

  const q2 = pickedOptions('q2', answers).find((o) => o.anchorPhrase);
  if (q2?.anchorPhrase) parts.push(`You told us that ${q2.anchorPhrase}.`);

  const q5 = pickedOptions('q5', answers).find((o) => o.anchorPhrase);
  if (q5?.anchorPhrase) parts.push(`You said it’s been on your mind ${q5.anchorPhrase}.`);

  const q3 = pickedOptions('q3', answers)[0];
  if (q3?.anchorPhrase) parts.push(`What you’re hoping to find is ${q3.anchorPhrase}.`);

  const q4 = pickedOptions('q4', answers)[0];
  if (q4?.anchorPhrase) parts.push(`Right now the loudest feeling is ${q4.anchorPhrase}.`);

  const free = typeof answers.q7 === 'string' ? (answers.q7 as string).trim() : '';
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

/* ── 4. 组装 ───────────────────────────────────────────────────────── */

export function buildNarrative(profile: UserProfile, answers: SessionAnswers): Narrative {
  return {
    block: selectNarrative(profile),
    anchor: buildAnchor(answers),
    toneLine: buildToneLine(profile),
  };
}
