/**
 * types.ts — /match 的领域类型定义
 *
 * 设计要点：打分权重使用「带命名空间的键」（见 config.ts 的 NS），
 * 因为 domain 与 temporal_orientation 曾共用 `future` 这一个键，
 * 导致「Future & Uncertainty」这道题的权重同时污染了两个维度。
 */

/* ── 维度枚举 ─────────────────────────────────────────────────────── */

export const DOMAINS = [
  'love', 'breakup', 'relationships', 'money', 'career',
  'family', 'spirituality', 'future', 'self_growth', 'protection',
] as const;
export type Domain = (typeof DOMAINS)[number];

export const EMOTIONS = [
  'curiosity', 'hope', 'anxiety', 'fear', 'confusion', 'grief',
  'excitement', 'loneliness', 'frustration', 'anticipation', 'uncertainty', 'sadness',
] as const;
export type EmotionalState = (typeof EMOTIONS)[number];

export const TEMPORAL = ['past', 'present', 'future'] as const;
export type TemporalOrientation = (typeof TEMPORAL)[number];

export const OUTCOMES = [
  'clarity', 'reassurance', 'prediction', 'closure',
  'action', 'validation', 'connection', 'control',
] as const;
export type DesiredOutcome = (typeof OUTCOMES)[number];

/** 合作的三个平台。顺序基线在 config.ts 的 PLATFORM_ORDER */
export type Platform = 'keen' | 'kasamba' | 'purple-garden';

/**
 * 情境维度（比 domain 细一层）。
 *
 * 为什么需要它：只匹配 domain 会做出肉眼可见的错误推荐 —— 实测中出现过
 * 「求职中的人被推荐《异地恋时间线》」「家庭冲突的人被推荐《怀孕占卜》」
 * 「感觉被针对的人被推荐《第三者占卜》」。这些文章与用户的 domain 相同或相邻，
 * 但情境完全不同。有了这个轴，冲突情境可以被显式扣分并排除出旗舰位。
 */
export const SITUATIONS = [
  'single', 'dating', 'breakup_recovery', 'no_contact', 'reconciliation',
  'marriage', 'pregnancy', 'parenting', 'caregiving', 'estrangement',
  'career_money', 'business',
  'pet', 'mediumship', 'past_life', 'dream', 'signs', 'awakening', 'purpose',
  'healing', 'toxic_relationship', 'third_party',
  'ldr', 'age_gap', 'lgbtq', 'mental_health',
  'first_timer', 'cost', 'legitimacy',
] as const;
export type Situation = (typeof SITUATIONS)[number];

export const RELATIONSHIP_STATES = [
  'single', 'talking', 'dating', 'relationship',
  'recently_separated', 'no_contact', 'complicated', 'thinking_about_someone',
] as const;
export type RelationshipState = (typeof RELATIONSHIP_STATES)[number];

export const URGENCIES = ['low', 'medium', 'high'] as const;
export type Urgency = (typeof URGENCIES)[number];

/**
 * 底层机制轴（内部专用）。
 *
 * ⚠️ 这些值是**后台内部代号**，不得出现在任何面向用户的地方：
 * 页面文案、URL 参数、埋点属性、结构化数据、邮件主题 —— 全都不行。
 * 用户只看得到由它选出的解读段落与反思问题，看不到它的名字。
 *
 * 它回答的是「为什么会卡住」，与 primary_domain（卡在什么事上）、
 * situations（具体情境）、emotional_states（表面情绪）三者都正交。
 * 举例：同样是 love + no_contact + uncertainty，
 * 一个人可能卡在 sudden_loss（真的失去了），
 * 另一个人可能卡在 illusion_fixation（对象其实不可得）。
 * 这个区别决定了解读该说什么，但用 domain 和 emotion 都推不出来。
 */
export const INTERNAL_KEYS = [
  'choice_friction', 'scarcity_panic', 'boundary_invasion', 'stagnation_void',
  'identity_crisis', 'toxic_loop', 'sudden_loss', 'illusion_fixation',
] as const;
export type InternalKey = (typeof INTERNAL_KEYS)[number];

export const ORIENTATIONS = ['curious', 'open', 'spiritual', 'experienced', 'skeptical'] as const;
export type SpiritualOrientation = (typeof ORIENTATIONS)[number];

/** 空间有限的枚举 → 索引用短键，压缩内联载荷（见 match.astro 的 build-time index） */
export type WeightMap = Record<string, number>;

/* ── 题目模型 ─────────────────────────────────────────────────────── */

export type QuestionType = 'single' | 'multi' | 'freetext';

export interface QuizOption {
  id: string;
  label: string;
  /** 打分权重，键名带命名空间前缀 */
  weights?: WeightMap;
  /**
   * 用于生成「锚定句」的第二人称改写：用户选了这一项时，
   * 结果页会明确引用他自己的选择。这是规格 §8 的硬要求。
   */
  anchorPhrase?: string;
  /** q1 用：决定 q2 / q6 走哪一套动态选项 */
  branchKey?: string;
}

export interface QuizQuestion {
  id: string;
  /** 短标题，用于进度条与无障碍朗读 */
  shortLabel: string;
  text: string;
  subtext?: string;
  type: QuestionType;
  /** freetext 允许跳过 */
  optional?: boolean;
  /** 多选题最多可选几项 */
  maxSelect?: number;
  options?: QuizOption[];
  /** 该题的选项由另一题的答案决定 */
  branchFrom?: string;
  optionSets?: Record<string, QuizOption[]>;
  placeholder?: string;
}

export interface SessionAnswers {
  [questionId: string]: string | string[];
}

/* ── 用户画像 ─────────────────────────────────────────────────────── */

export interface UserProfile {
  primary_domain: Domain;
  secondary_domain?: Domain;
  emotional_states: EmotionalState[];
  relationship_state?: RelationshipState;
  desired_outcomes: DesiredOutcome[];
  temporal_orientation: TemporalOrientation;
  urgency: Urgency;
  spiritual_orientation: SpiritualOrientation;
  /** 由作答推出的具体情境，供推荐引擎做情境匹配/冲突判定 */
  situations: Situation[];
  /**
   * 底层机制（内部代号，见 INTERNAL_KEYS）。
   * 找不到足够信号时不存在 —— 此时结果页不渲染机制区块，
   * 绝不退回一个泛泛的默认机制（那会让解读变成 Barnum 式套话）。
   */
  internal_key?: InternalKey;
  /** 机制识别所依据的原始分，便于回归测试与埋点分布分析 */
  internalScores: WeightMap;
  /** 依据 q7 自由文本推断的变更/丧失类事件，仅当能识别时存在 */
  loss_or_change?: string;
  freeTextAnswer?: string;
  rawScores: WeightMap;
  normalizedScores: WeightMap;
  createdAt: string;
  sessionId: string;
}

/* ── 叙事 ─────────────────────────────────────────────────────────── */

export interface NarrativeBlock {
  key: string;
  theme: string;
  summary: string[];
  deeperQuestion: string;
  whatNext: string[];
}

export interface Narrative {
  block: NarrativeBlock;
  /** 明确引用用户自己选择的答案，规格 §8 要求的锚定句 */
  anchor: string;
  /** 依据 urgency / orientation 追加的一句语气调整 */
  toneLine?: string;
  /**
   * 底层机制解读（可选）。仅当画像识别出 internal_key 时存在。
   * 这是「为什么会卡住」那一层，与 block（「发生了什么」）互补。
   */
  mechanism?: MechanismNarrative;
}

export interface MechanismNarrative {
  /** 内部代号。⚠️ UI 层不得把它渲染成任何可见文本 */
  key: InternalKey;
  /** 解读段落，按序渲染 */
  paragraphs: string[];
  /** 反思问题，渲染前 MECHANISM_REFLECTION_COUNT 条 */
  reflections: string[];
}

/* ── 内容元数据 ───────────────────────────────────────────────────── */

export type CommercialIntent = 'high' | 'medium' | 'low';

export interface ArticleMetadata {
  slug: string;
  title: string;
  url: string;
  primary_domain: Domain;
  secondary_topics: Domain[];
  emotional_states: EmotionalState[];
  relationship_states: RelationshipState[];
  desired_outcomes: DesiredOutcome[];
  temporal_orientation: TemporalOrientation[];
  commercial_intent: CommercialIntent;
  /** 没有话题证据的文章：不参与领域加权，也不占旗舰位 */
  topic_agnostic?: boolean;
  /** 文章涉及的具体情境 */
  situations?: Situation[];
  recommended_reader_type?: string;
}

export interface ReaderMatchMetadata {
  slug: string;
  platform: 'keen' | 'kasamba' | 'purple-garden';
  displayName: string;
  /** 读者页链接（站内） */
  profileUrl: string;
  /** 联盟跳转链接，必须是站内 /go/ 路由 */
  goUrl: string;
  rating: number;
  avatarUrl?: string;
  freeOffer?: string;
  bestFor?: string;
  specialties: Domain[];
  relationship_states: RelationshipState[];
  style: string[];
  availability: boolean;
}

/* ── 推荐输出 ─────────────────────────────────────────────────────── */

export interface ScoredReader extends ReaderMatchMetadata {
  matchScore: number;
  /** 面向用户展示的匹配理由（必须来自真实元数据，不得编造） */
  reasons: string[];
}

export interface ScoredArticle extends ArticleMetadata {
  matchScore: number;
  reasons: string[];
}

export interface RecommendationResult {
  readers: ScoredReader[];
  articles: ScoredArticle[];
  /** 第一篇是否真的与用户话题相关（否则 UI 不挂「Best match」并改写标题） */
  articleFlagshipIsTopical: boolean;
  emailTopic: string;
  emailTopicShort: string;
  narrative: Narrative;
  /** 依据 §27 的转化原则决定的区块顺序 */
  sectionOrder: ResultSection[];
}

export type ResultSection =
  | 'narrative' | 'mechanism' | 'deeperQuestion' | 'whatNext'
  | 'readers' | 'article' | 'tool' | 'email';

/* ── 免费工具 ─────────────────────────────────────────────────────── */

export type TarotSuit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

export interface TarotCard {
  id: string;
  name: string;
  suit: TarotSuit;
  number: number;
  symbolicMeaning: string;
  reflection: string;
  domainReflections?: Partial<Record<Domain, string>>;
}

export interface AskUniverseResult {
  question: string;
  classification: {
    domain: Domain;
    emotional_states: EmotionalState[];
    desired_outcomes: DesiredOutcome[];
    relationship_state?: RelationshipState;
  };
  reflection: string[];
  question_to_sit_with: string;
  articles: ScoredArticle[];
  readers: ScoredReader[];
  suggestHumanReading: boolean;
}

/* ── 归因 / 埋点 ──────────────────────────────────────────────────── */

export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface AttributionSnapshot {
  anonymous_id: string;
  session_id: string;
  source: string;
  landing_page: string;
  first_touch: UTMData;
  last_touch: UTMData;
  current: UTMData;
  returning: boolean;
  visit_count: number;
}
