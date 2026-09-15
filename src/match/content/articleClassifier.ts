/**
 * content/articleClassifier.ts — 文章标签推断（构建期运行）
 *
 * 保留原有的标签规则（它在 112 篇 guides 上的分布是合理的），
 * 但改了两件事：
 *   1. 不再拿 slugToTitle() 当标题 —— slug 转标题会把撇号吃掉
 *      （"Why Can't I Stop..." → "Why Cant I Stop..."），
 *      现在标题直接取 guides frontmatter 里的真实 title
 *   2. 不再维护一份硬编码的 GUIDE_SLUGS 清单 —— 它和实际目录会漂移。
 *      改为构建期扫目录，任何新增文章自动进入推荐池。
 */

import type {
  ArticleMetadata, CommercialIntent, DesiredOutcome, Domain,
  EmotionalState, RelationshipState, Situation, TemporalOrientation,
} from '../types';

/**
 * 情境规则。顺序无关 —— 一篇文章可以同时属于多个情境
 * （例如「离婚后的异地恋」）。
 */
const SITUATION_RULES: Array<[Situation, RegExp]> = [
  ['pregnancy', /pregnan|conceiv|baby|miscarriage|fertility/],
  ['marriage', /marriage|married|propose|proposal|wedding|husband|wife/],
  ['parenting', /parenting|single-parent|children|kids|step-?child/],
  ['caregiving', /caregiv|elderly|unwell|terminal|hospice/],
  ['estrangement', /estrang|cut-off|cutting-off|no-longer-speaking/],
  ['career_money', /career|\bjob\b|work|money|financial|salary|debt|abundance|wealth|interview|promotion|employ/],
  ['business', /business|entrepreneur|startup|self-employ/],
  ['pet', /pet-|pets-|animal|\bdog\b|\bcat\b/],
  ['mediumship', /medium|mediumship|passed-away|deceased|evidential|afterlife/],
  ['past_life', /past-life|reincarnat/],
  ['dream', /dream/],
  ['signs', /angel-number|1111|222|333|444|synchronicit|repeating-number|-signs|signs-|seeing-signs/],
  ['awakening', /awakening/],
  ['purpose', /life-purpose|purpose|-direction|finding-direction|self-growth|personal-growth/],
  ['healing', /healing|heal-|move-on|closure|recovery/],
  ['toxic_relationship', /toxic|narciss|manipulat|boundar|drain/],
  ['third_party', /third-party|other-woman|jealous|rival|affair|infidelity|cheating/],
  ['ldr', /\bldr\b|long-distance|close-the-gap/],
  ['age_gap', /age-gap/],
  ['lgbtq', /lgbtq|gay|lesbian|queer|same-sex/],
  ['mental_health', /anxiety|therapy|depress|mental-health/],
  ['first_timer', /first-psychic|first-reading|beginner|what-to-expect|questions-to-ask|how-to-prepare/],
  ['cost', /\bcost\b|prices|price|cheap|how-much|afford|free-psychic/],
  ['legitimacy', /legit|scam|fake|are-psychics-real|spot-fake|refund/],
  ['breakup_recovery', /breakup|heartbreak|divorce|separation/],
  ['no_contact', /no-contact/],
  ['reconciliation', /reconcil|coming-back|win-her-back|win-him-back/],
  ['single', /i-?m-single|\bsingle\b|soulmate|find-love|dating-prospects/],
  ['dating', /dating|date-|situationship|talking-stage|crush|does-he-like/],
];

export function classifySituations(slug: string): Situation[] {
  const s = slug.toLowerCase();
  const out: Situation[] = [];
  for (const [tag, re] of SITUATION_RULES) if (re.test(s)) out.push(tag);
  return out;
}

export interface ArticleTags {
  primary_domain: Domain;
  secondary_topics: Domain[];
  emotional_states: EmotionalState[];
  relationship_states: RelationshipState[];
  desired_outcomes: DesiredOutcome[];
  temporal_orientation: TemporalOrientation[];
  commercial_intent: CommercialIntent;
  /**
   * 有没有「话题证据」。
   *
   * 旧版把没有任何话题词的 slug 一律默认成 love。后果实测很具体：
   * 「Is Purple Garden Legit or a Scam?」这类平台信任类内容会因为
   * reassurance 标签 + 高商业意图排到恋爱用户的第一位 —— 在一个问
   * 「我单身，想知道未来会怎样」的人面前，旗舰文章变成一篇平台测评。
   *
   * 现在：没有任何话题证据的文章被显式标记，推荐时拿不到领域加权，
   * 也不会占旗舰位。
   */
  topic_agnostic: boolean;
  /** 这篇文章具体讲的是哪些情境 */
  situations: Situation[];
}

/* 话题证据表：顺序即优先级。数组靠前的先匹配 */
const DOMAIN_EVIDENCE: Array<[Domain, RegExp]> = [
  ['breakup', /breakup|break-?up|divorce|separation|separated|\bex-|heartbreak|win-her-back|win-him-back|signs-your-ex|no-contact|reconcil|come-back/],
  ['family', /single-parent|pregnan|marriage|married|propose|when-will-i-get-married|real-marriage|family|children|kids|parents?/],
  ['career', /career|job|work|business|money|financial|abundance|salary|debt|wealth/],
  ['protection', /third-party|other-woman|jealous|protection|negative-energy|cleans|hex|curse|red-flag/],
  ['self_growth', /self-growth|personal-growth|life-purpose|purpose|awakening|confidence|anxiety|therapy|healing-after/],
  ['future', /future|timeline|when-will|predict|coming-months|what-happens-next/],
  ['spirituality', /spiritual|angel|aura|clairs|palm|past-life|tarot|medium|evidential|astrology|zodiac|numerolog|chakra|dream/],
  ['love', /love|romance|romantic|relationship|soulmate|twin-?flame|dating|date-|crush|does-he|does-she|is-he-the-one|situationship|ldr|long-distance/],
];

export function classifyArticleTags(slug: string): ArticleTags {
  const s = slug.toLowerCase();

  // ── 领域：只有命中证据才认领；全都没命中则标记为无话题 ──
  const matched = DOMAIN_EVIDENCE.find(([, re]) => re.test(s));
  const topic_agnostic = !matched;
  const primary_domain: Domain = matched ? matched[0] : 'love';

  const secondary_topics: Domain[] = [];
  if (/tarot/.test(s)) secondary_topics.push('spirituality');
  if (/medium|passed|deceased|evidential/.test(s)) secondary_topics.push('spirituality');
  if (/career|money/.test(s) && primary_domain !== 'career') secondary_topics.push('career');
  if (/love|relationship|romance/.test(s) && primary_domain !== 'love') secondary_topics.push('love');
  if (/breakup|ex-|divorce|separation/.test(s) && primary_domain !== 'breakup') secondary_topics.push('breakup');
  if (/no-contact/.test(s) && primary_domain !== 'breakup') secondary_topics.push('breakup');

  const emotional_states: EmotionalState[] = [];
  if (/anxiety|anxious|worry/.test(s)) emotional_states.push('anxiety');
  if (/healing|heartbreak|grief|loss|love-after/.test(s)) emotional_states.push('grief');
  if (/confusion|uncertain/.test(s)) emotional_states.push('confusion');
  if (/hope|coming-back|signs-your-ex|reconcil/.test(s)) emotional_states.push('hope');
  if (/fear|scared/.test(s)) emotional_states.push('fear');
  if (/lonely|alone|single/.test(s)) emotional_states.push('loneliness');
  if (/not-come-true|fake|red-flag|scam/.test(s)) emotional_states.push('frustration');
  if (/anticipat|waiting|timeline/.test(s)) emotional_states.push('anticipation');

  const relationship_states: RelationshipState[] = [];
  if (/no-contact/.test(s)) relationship_states.push('no_contact');
  if (/breakup|divorce|ex-|separation|heartbreak|win-her-back|signs-your-ex/.test(s)) relationship_states.push('recently_separated');
  if (/does-he|is-he|specific-person|does-she/.test(s)) relationship_states.push('thinking_about_someone');
  if (/situationship|complicated|love-triangle|third-party|other-woman/.test(s)) relationship_states.push('complicated');
  if (/marriage|propose|when-will-i-get-married|real-marriage/.test(s)) relationship_states.push('relationship');
  if (/online-dating|age-gap/.test(s)) relationship_states.push('dating');
  if (/soulmate|twin-flame/.test(s) && !relationship_states.length) relationship_states.push('thinking_about_someone');

  const desired_outcomes: DesiredOutcome[] = [];
  if (/win-her-back|coming-back|reconcil|signs-your-ex/.test(s)) desired_outcomes.push('action');
  if (/healing|closure|move-on|let-go/.test(s)) desired_outcomes.push('closure');
  if (/clarity|choose|how-to-pick|choose-the-right|prepare/.test(s)) desired_outcomes.push('clarity');
  if (/predict|when-will|future|timeline|how-often/.test(s)) desired_outcomes.push('prediction');
  if (/reassur|legit|are-psychics-real|is-psychics|spot-fake|scam|refund/.test(s)) desired_outcomes.push('reassurance');
  if (/anxiety|vs-therapy|skeptic/.test(s)) desired_outcomes.push('reassurance');
  if (/how-to-|guide|first-psychic-reading|questions-to-ask|cost|prices/.test(s)) desired_outcomes.push('action');
  if (/does-he-like-me|is-he-the-one|twin-flame-vs-soulmate/.test(s)) desired_outcomes.push('validation');
  if (/soulmate|connection|evidential-mediums|love-after-loss|signs-spiritual/.test(s)) desired_outcomes.push('connection');

  const temporal_orientation: TemporalOrientation[] = ['present'];
  if (/future|when-will|predict|timeline|coming-back/.test(s)) temporal_orientation.push('future');
  if (/past-life|ex-|signs-your-ex|dreaming-about-ex|healing-after/.test(s)) temporal_orientation.push('past');

  let commercial_intent: CommercialIntent = 'low';
  if (/^(best|top)-|kasamba|keen|purple-garden|credit|minutes|most-accurate|cheap/.test(s)) commercial_intent = 'high';
  else if (/guide|review|how-to|first-psychic|before-you-pay|should-you-pay|cost|prices|legit/.test(s)) commercial_intent = 'medium';

  return {
    primary_domain,
    secondary_topics: Array.from(new Set(secondary_topics)),
    emotional_states: Array.from(new Set(emotional_states)),
    relationship_states: Array.from(new Set(relationship_states)),
    desired_outcomes: Array.from(new Set(desired_outcomes)),
    temporal_orientation,
    commercial_intent,
    topic_agnostic,
    situations: classifySituations(slug),
  };
}

export function buildArticle(slug: string, title: string): ArticleMetadata {
  return {
    slug,
    title,
    url: `/guides/${slug}/`,
    ...classifyArticleTags(slug),
  };
}

/**
 * 标题近似度（用于去重）。
 *
 * 语料里真实存在成对的同题文章，例如
 *   how-to-choose-a-psychic-reader
 *   how-to-pick-a-psychic-reader
 * 旧版会把两篇一起推荐给同一个用户，看起来像内容池没整理过。
 */
const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'your', 'you', 'is', 'are', 'my', 'it', 'that', 'this', 'with', 'how', 'what', 'why', 'should', 'do', 'does', 'guide', '2026', 'vs']);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}
