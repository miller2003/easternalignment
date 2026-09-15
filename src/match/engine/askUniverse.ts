/**
 * engine/askUniverse.ts — Ask the Universe（规格 §16）
 *
 * 用户随便问一个问题，系统：
 *   1. 分类（领域 / 情绪 / 诉求 / 关系状态）
 *   2. 给出反思性解读（不是预测）
 *   3. 推荐 1–2 篇文章
 *   4. 视诉求决定是否建议真人解读
 *
 * 分类同样是确定性的关键词打分，不走 LLM —— 规格 §24 明确要求
 * 分类与匹配逻辑不得交给模型。这一点也让这个工具在零后端下可用。
 */

import type {
  AskUniverseResult, ArticleMetadata, DesiredOutcome, Domain,
  EmotionalState, RelationshipState, UserProfile, ScoredArticle, ScoredReader,
  ReaderMatchMetadata,
} from '../types';
import { DOMAIN_REFLECTIONS, OUTCOME_TWIST, EMOTION_TONE, HUMAN_READING_TRIGGERS } from '../content/askReflections';
import { scoreReader, rankArticles } from './recommend';
import { deriveSituations } from './scoring';
import { MAX_READERS } from '../config';

/* ── 关键词表 ──────────────────────────────────────────────────────── */

const DOMAIN_KEYWORDS: Array<[Domain, RegExp]> = [
  ['breakup', /\b(broke up|break ?up|split up|separation|separated|divorce|divorced|my ex|dump(ed)?|heartbroken|come[s]? back|coming back|win (him|her|them) back|get (him|her|them) back|no contact|not talking)\b/i],
  ['protection', /\b(curse|hex|evil eye|negative energy|bad luck|protection|cleans(e|ing)|ground(ing)?|drain(ed|ing)?|toxic person|jealous)\b/i],
  ['family', /\b(family|mother|father|mom|mum|dad|parents?|siblings?|brother|sister|in-?laws?|my (son|daughter|child|kids)|pregnan|conceiv)\b/i],
  ['career', /\b(job|career|work|boss|manager|interview|promotion|raise|colleague|business|company|fired|laid off|redundant)\b/i],
  ['money', /\b(money|financ|debt|loan|mortgage|rent|savings|salary|income|afford|broke|bills?|invest)\b/i],
  ['spirituality', /\b(spirit|spiritual|awaken|signs?|angel|1111|222|333|444|synchronicit|intuiti|meditat|past life|twin flame|medium|chakra|energy heal)\b/i],
  ['self_growth', /\b(purpose|direction|my life|who i am|better|growth|stuck|meaning|motivat|confidence|heal(ing)? myself)\b/i],
  ['relationships', /\b(friend|friendship|roommate|coworker|relationship with|boundar|trust|betray|family friend)\b/i],
  ['love', /\b(love|romance|romantic|partner|boyfriend|girlfriend|husband|wife|fianc|date|dating|crush|soulmate|marriage|marry|propose|relationship)\b/i],
  ['future', /\b(future|what will|when will|will i|coming months?|next year|ahead|destiny|fate|timeline)\b/i],
];

const EMOTION_KEYWORDS: Array<[EmotionalState, RegExp]> = [
  ['anxiety', /\b(anxious|anxiety|worried|worry|nervous|stress(ed)?|panic)\b/i],
  ['fear', /\b(afraid|scared|fear(full)?|terrified|dread)\b/i],
  ['grief', /\b(grief|grieving|mourning|loss|lost (him|her|them)|passed away|died|funeral|miss (him|her|them))\b/i],
  ['sadness', /\b(sad|sadness|down|depress|heartbroken|hurting|miserable|unhappy)\b/i],
  ['confusion', /\b(confus(ed|ing)|don'?t understand|mixed signals|unclear|torn|don'?t know what)\b/i],
  ['hope', /\b(hope(ful)?|hoping|optimis|wish(ing)?|pray(ing)?)\b/i],
  ['curiosity', /\b(curious|wondering|interested|just want to know|explore)\b/i],
  ['excitement', /\b(excited|thrilled|can'?t wait|looking forward)\b/i],
  ['frustration', /\b(frustrat(ed|ing)|annoyed|angry|anger|fed up|sick of|tired of)\b/i],
  ['loneliness', /\b(lonely|loneliness|alone|isolated|no one)\b/i],
  ['anticipation', /\b(anticipat|about to|soon|any day|waiting for)\b/i],
  ['uncertainty', /\b(uncertain|unsure|not sure|maybe|might|don'?t know if|up in the air)\b/i],
];

const OUTCOME_KEYWORDS: Array<[DesiredOutcome, RegExp]> = [
  ['prediction', /\b(will (he|she|they|it|i)|when will|what will|how long|timeline|going to happen|happen(ing)? next|predict)\b/i],
  ['action', /\b(should i|what should i|what do i do|how do i|advice|next step|whether to)\b/i],
  ['validation', /\b(am i (wrong|right|crazy)|does (he|she|they) (feel|think|love)|is (he|she|it) (real|true)|confirm)\b/i],
  ['reassurance', /\b(will it be (ok|okay|fine)|is everything|am i going to be|reassur)\b/i],
  ['closure', /\b(closure|move on|let go|forgive|end(ing)? this|get over)\b/i],
  ['clarity', /\b(clarity|clear(er)?|understand|make sense|figure out|see (it|things) clearly)\b/i],
  ['connection', /\b(connect(ion|ed)?|reach out|contact|talk to|relationship with)\b/i],
  ['control', /\b(control|in charge|handle|manage|take back)\b/i],
];

const RELATIONSHIP_KEYWORDS: Array<[RelationshipState, RegExp]> = [
  ['no_contact', /\b(no contact|not talking|hasn'?t (replied|texted|called)|ghost(ed|ing)|ignor(es|ing) me|silence)\b/i],
  ['recently_separated', /\b(broke up|break ?up|we split|separated|divorce|my ex|dumped me)\b/i],
  ['complicated', /\b(situationship|complicated|mixed signals|on and off|undefined|friends with benefits)\b/i],
  ['thinking_about_someone', /\b(should i (text|reach out|message|call)|does (he|she) (think|miss)|can'?t stop thinking about)\b/i],
  ['talking', /\b(we'?re talking|talking stage|talking to someone)\b/i],
  ['dating', /\b(dating|seeing someone|went on a date|early days)\b/i],
  ['single', /\b(i'?m single|no one right now|still single)\b/i],
];

const PREDICTION_SEEKING = /\b(will|when|does (he|she|they)|is (he|she|they) going to|do i|am i|should i)\b/i;

/**
 * 危机信号（自杀意念 / 自伤）。
 *
 * 这是整个工具里唯一「宁可误报也不能漏报」的规则：误报的代价只是给一个
 * 并不需要帮助的人看了一眼求助热线，漏报的代价是一条命。因此词表刻意
 * 收得宽，且不要求语义精确。
 *
 * 覆盖三类常见表达（英国 Samaritans / 美国 988 的危机词表口径）：
 *   1. 直接动作：kill myself / suicide / overdose / end my life
 *   2. 间接意愿：want to die / better off dead / don't want to be here /
 *      no reason to live / can't go on / not worth living（含 isn't / aint /
 *      no longer 等否定前置写法）/ 只想让痛苦结束
 *   3. 替代说法与自伤：self-harm / cutting / hurting myself /
 *      take my own life / unalive（近年社媒上规避审核的隐语）
 *
 * 注意：`\bdie\b` 这种裸词刻意不收 —— "I want to die" 已由上条覆盖，
 * 而 "will he die" / "did my dog die" 属于正常的丧亲与预后提问，
 * 收进来会把大量正常用户误判成危机。
 */
const CRISIS = new RegExp(
  [
    // 1. 直接动作
    'suicid', 'kill myself', 'killin myself', 'kill my self',
    'end my life', 'end it all', 'ending my life', 'take my own life',
    'tak(e|ing) my life', 'overdos', 'un\\s?alive',
    // 2. 间接意愿
    'want to die', 'wanna die', 'want to be dead', 'wish i (was|were) dead',
    'wish i was dead', 'better off dead', 'better off without me',
    'don\'?t want to (be here|live|exist)', 'do not want to be here',
    'no reason to live', 'nothing to live for',
    // 「活着不值得」的各种缩写与否定式：worth living 前面允许出现
    // isn't / is not / aint / no longer 等否定词，用 \W* 吃掉中间的标点空格
    'not worth living', 'isn\'?t worth living', 'aint worth living',
    'no longer worth living', 'worth dying', 'rather be dead',
    'can\'?t go on', 'cannot go on', 'can\'?t do this anymore',
    'tired of living', 'tired of being alive', 'sick of living',
    // 「只想让痛苦结束」类：不要求先说 end the pain，允许 to end / it to end
    'end the pain', 'end this pain', 'end my pain', 'end all this',
    'pain to (just )?end', 'pain to stop', 'want it to end',
    // 3. 替代说法与自伤
    'self[- ]?harm', 'self[- ]?injur', 'hurt(ing)? myself', 'harm(ing)? myself',
    'cut(ting)? myself', 'cut myself', 'burn(ing)? myself',
    'starving myself', 'punish(ing)? myself',
  ].join('|'),
  'i',
);

/* ── 分类 ──────────────────────────────────────────────────────────── */

function firstMatch<T>(text: string, table: Array<[T, RegExp]>): T | undefined {
  for (const [v, re] of table) if (re.test(text)) return v;
  return undefined;
}

function allMatches<T>(text: string, table: Array<[T, RegExp]>): T[] {
  return table.filter(([, re]) => re.test(text)).map(([v]) => v);
}

export interface Classification {
  domain: Domain;
  emotional_states: EmotionalState[];
  desired_outcomes: DesiredOutcome[];
  relationship_state?: RelationshipState;
  prediction_seeking: boolean;
  crisis: boolean;
}

export function classifyQuestion(question: string): Classification {
  const q = question.trim();
  const relationship_state = firstMatch(q, RELATIONSHIP_KEYWORDS);

  let domain = firstMatch(q, DOMAIN_KEYWORDS);
  // 兜底：问题本身没提到具体领域词，但明确描述了关系状态（例如
  // "Will he come back to me?"），此时按关系状态推断领域，
  // 而不是掉进 self_growth 这个通用默认值 —— 那会把恋爱问题错分到成长类。
  if (!domain && relationship_state) {
    domain = relationship_state === 'recently_separated' || relationship_state === 'no_contact'
      ? 'breakup'
      : 'love';
  }

  const emotions = allMatches(q, EMOTION_KEYWORDS).slice(0, 2);
  const outcomes = allMatches(q, OUTCOME_KEYWORDS).slice(0, 2);
  return {
    domain: domain ?? 'self_growth',
    emotional_states: emotions.length ? emotions : ['curiosity'],
    desired_outcomes: outcomes.length ? outcomes : ['clarity'],
    relationship_state,
    prediction_seeking: PREDICTION_SEEKING.test(q),
    crisis: CRISIS.test(q),
  };
}

function profileFrom(c: Classification, question: string): UserProfile {
  const relationship_state = c.relationship_state;
  return {
    primary_domain: c.domain,
    emotional_states: c.emotional_states,
    relationship_state,
    desired_outcomes: c.desired_outcomes,
    temporal_orientation: c.desired_outcomes.includes('prediction') ? 'future'
      : c.desired_outcomes.includes('closure') ? 'past' : 'present',
    urgency: c.emotional_states.includes('anxiety') || c.emotional_states.includes('fear') ? 'high' : 'medium',
    spiritual_orientation: 'open',
    // Ask 路径不做机制识别：一句话的自由提问没有足够信号去判断
    // 「为什么会卡住」这一层。强行猜一个机制会把这里的诚实降级成编造，
    // 因此 internal_key 显式为 undefined，结果页不渲染机制区块。
    internal_key: undefined,
    internalScores: {},
    situations: deriveSituations({ q8: question }, relationship_state, question),
    freeTextAnswer: question,
    rawScores: {},
    normalizedScores: {},
    createdAt: new Date().toISOString(),
    sessionId: 'ask',
  };
}

/* ── 反思文本组装 ──────────────────────────────────────────────────── */

export function composeReflection(c: Classification): string[] {
  const r = DOMAIN_REFLECTIONS[c.domain];
  const paras: string[] = [r.opening];

  const emotion = c.emotional_states[0];
  const tone = emotion ? EMOTION_TONE[emotion] : undefined;
  paras.push(tone ? `${r.underneath} ${tone}` : r.underneath);

  // 直接问「会不会 / 什么时候」时，必须显式拒绝给确定性，并把它翻成可回答的问题
  if (c.prediction_seeking) {
    paras.push(
      'One thing worth saying plainly: a question about what someone else will do cannot be answered with certainty, here or anywhere else. What can be worked with is the part of the situation that is already true — your position in it, and what you are willing to do from there.',
    );
  }

  // 把诉求翻成一句可检验的话，而不是给结论
  const outcome = c.desired_outcomes[0];
  if (outcome && OUTCOME_TWIST[outcome]) paras.push(OUTCOME_TWIST[outcome]);

  paras.push(r.symbolic);
  return paras;
}

/* ── 主入口 ────────────────────────────────────────────────────────── */

export function askUniverse(
  question: string,
  articles: ArticleMetadata[],
  readers: ReaderMatchMetadata[] = [],
): AskUniverseResult {
  const c = classifyQuestion(question);
  const profile = profileFrom(c, question);

  // 与测验结果页共用同一条排序路径，两个入口的口径必须一致
  const { articles: scored } = rankArticles(profile, articles);

  const suggestHumanReading =
    HUMAN_READING_TRIGGERS.some((o) => c.desired_outcomes.includes(o)) || c.prediction_seeking;

  // 只有在确实该建议真人解读时才去算读者 —— 低意图问题不该硬塞付费入口（规格 §27）
  const matchedReaders: ScoredReader[] = suggestHumanReading
    ? readers
        .map((r) => {
          const { score, reasons } = scoreReader(profile, r);
          return { ...r, matchScore: Math.min(99, Math.round(score)), reasons };
        })
        .filter((r) => r.matchScore > 0)
        .sort((x, y) => y.matchScore - x.matchScore || x.slug.localeCompare(y.slug))
        .slice(0, MAX_READERS)
    : [];

  return {
    question,
    classification: {
      domain: c.domain,
      emotional_states: c.emotional_states,
      desired_outcomes: c.desired_outcomes,
      relationship_state: c.relationship_state,
    },
    reflection: composeReflection(c),
    question_to_sit_with: DOMAIN_REFLECTIONS[c.domain].sitWith,
    articles: scored,
    readers: matchedReaders,
    suggestHumanReading,
  };
}

/** 主题相关的风险提示（§21 高风险主题必须给合适提示） */
export function cautionFor(classification: AskUniverseResult['classification']): string | undefined {
  return DOMAIN_REFLECTIONS[classification.domain].caution;
}

export function isCrisis(question: string): boolean {
  return CRISIS.test(question);
}

/**
 * 危机响应文案。集中在这里而不是散在 app.ts 里，是为了让
 * 「测验自由文本」与「Ask the Universe」两条入口给出完全一致的指引 ——
 * 两处措辞不一致会让人怀疑其中一处是敷衍。
 *
 * 措辞纪律（规格 §21）：不做任何解读、不给任何属灵框架、不承诺好转，
 * 只做一件事 —— 把用户推向真人。号码同时给美/英两个辖区，并保留
 * "anywhere: findahelpline.com" 作为非美英用户的出口。
 */
export const CRISIS_MESSAGE =
  'If you are thinking about harming yourself, please stop reading here and talk to someone now. '
  + 'In the US you can call or text 988. In the UK you can call 116 123 (Samaritans), free, any time. '
  + 'Anywhere else, findahelpline.com lists a line for your country. '
  + 'This is not the right place for this, and you deserve a real person.';

/** 测验路径的危机拦截：命中则整个结果页降级，不出推荐、不出付费入口。 */
export function crisisResponse(): { crisis: true; message: string } {
  return { crisis: true, message: CRISIS_MESSAGE };
}
