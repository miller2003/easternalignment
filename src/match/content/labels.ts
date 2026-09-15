/**
 * content/labels.ts — 维度 → 人话
 *
 * 推荐理由（"为什么这个人适合你"）必须是对真实元数据的翻译，
 * 不能由 LLM 自由发挥。集中在这里，保证全站口径一致。
 */

import type {
  Domain, EmotionalState, RelationshipState, DesiredOutcome,
  TemporalOrientation, SpiritualOrientation, Urgency, Platform, Situation,
} from '../types';

/** 情境 → 用于推荐理由的一句话（必须读起来像人话） */
export const SITUATION_LABEL: Record<Situation, string> = {
  single: 'being single right now',
  dating: 'early dating',
  breakup_recovery: 'getting through a breakup',
  no_contact: 'no contact',
  reconciliation: 'the question of getting back together',
  marriage: 'marriage',
  pregnancy: 'trying to conceive',
  parenting: 'parenting',
  caregiving: 'caring for someone',
  estrangement: 'a distance inside the family',
  career_money: 'work and money',
  business: 'building something of your own',
  pet: 'a pet',
  mediumship: 'contact with someone who has passed',
  past_life: 'past-life material',
  dream: 'dreams',
  signs: 'the signs you keep noticing',
  awakening: 'what feels like an awakening',
  purpose: 'a loss of direction',
  healing: 'recovering from something',
  toxic_relationship: 'a relationship that drains you',
  third_party: 'a third person in the picture',
  ldr: 'a long-distance relationship',
  age_gap: 'an age-gap relationship',
  lgbtq: 'a same-sex relationship',
  mental_health: 'anxiety and mental health',
  first_timer: 'a first reading',
  cost: 'what a reading costs',
  legitimacy: 'whether a platform can be trusted',
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  love: 'love and relationships',
  breakup: 'breakups and endings',
  relationships: 'the people closest to you',
  money: 'money',
  career: 'work and career',
  family: 'family and home',
  spirituality: 'spiritual experience',
  future: 'what comes next',
  self_growth: 'personal growth',
  protection: 'energy and protection',
};

/** 用在「你的主题是 X」这类短句里 */
export const DOMAIN_NOUN: Record<Domain, string> = {
  love: 'love',
  breakup: 'endings',
  relationships: 'relationships',
  money: 'money',
  career: 'career',
  family: 'family',
  spirituality: 'spirituality',
  future: 'what’s ahead',
  self_growth: 'growth',
  protection: 'protection',
};

export const EMOTION_LABEL: Record<EmotionalState, string> = {
  curiosity: 'curiosity',
  hope: 'hope',
  anxiety: 'anxiety',
  fear: 'fear',
  confusion: 'confusion',
  grief: 'grief',
  excitement: 'excitement',
  loneliness: 'loneliness',
  frustration: 'frustration',
  anticipation: 'anticipation',
  uncertainty: 'uncertainty',
  sadness: 'sadness',
};

/** 用在 "你选中的那种 X" 里 */
export const RELATIONSHIP_LABEL: Record<RelationshipState, string> = {
  single: 'being single right now',
  talking: 'the stage where you’re talking but nothing is defined',
  dating: 'early dating',
  relationship: 'a relationship that feels off',
  recently_separated: 'a recent separation',
  no_contact: 'a no-contact situation',
  complicated: 'a situation nobody has been able to name',
  thinking_about_someone: 'someone who keeps coming back to mind',
};

export const OUTCOME_LABEL: Record<DesiredOutcome, string> = {
  clarity: 'clarity',
  reassurance: 'reassurance',
  prediction: 'a sense of what may happen next',
  closure: 'closure',
  action: 'something you can actually do',
  validation: 'confirmation of what you already sense',
  connection: 'connection',
  control: 'a sense of footing',
};

export const TEMPORAL_LABEL: Record<TemporalOrientation, string> = {
  past: 'what already happened',
  present: 'what is happening now',
  future: 'what may come next',
};

export const ORIENTATION_LABEL: Record<SpiritualOrientation, string> = {
  curious: 'just curious',
  open: 'open-minded',
  spiritual: 'spiritually inclined',
  experienced: 'experienced with readings',
  skeptical: 'skeptical',
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: 'this has been sitting with you a while',
  medium: 'this has been building',
  high: 'this is fresh',
};

export const STYLE_LABEL: Record<string, string> = {
  empathetic: 'warm and unhurried',
  direct: 'direct',
  detailed: 'thorough',
};

export const PLATFORM_NAME: Record<Platform, string> = {
  kasamba: 'Kasamba',
  'purple-garden': 'Purple Garden',
  keen: 'Keen',
};

/** 邮件主题行（规格 §13：每个订阅者有自己的 topic profile） */
export const EMAIL_TOPIC: Record<Domain, { short: string; line: string }> = {
  love: { short: 'love & relationships', line: 'Your weekly love and relationship reading' },
  breakup: { short: 'healing & closure', line: 'Your weekly guidance through the ending' },
  relationships: { short: 'relationships', line: 'Your weekly relationship reading' },
  money: { short: 'money & security', line: 'Your weekly money and security reading' },
  career: { short: 'work & direction', line: 'Your weekly work and direction reading' },
  family: { short: 'family & home', line: 'Your weekly family and home reading' },
  spirituality: { short: 'spiritual practice', line: 'Your weekly spiritual message' },
  future: { short: 'what’s ahead', line: 'Your weekly guidance reading' },
  self_growth: { short: 'growth & direction', line: 'Your weekly growth and direction reading' },
  protection: { short: 'energy & grounding', line: 'Your weekly grounding and protection reading' },
};
