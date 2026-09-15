/**
 * config.ts — /match 的全部可调参数（唯一真源）
 *
 * 规格要求「业务逻辑不得硬编码在 UI 层」「权重必须可配置」。
 * 因此所有阈值、权重、排序、区块顺序都集中在这里：
 * 改推荐效果不需要碰 UI，也不需要重新理解渲染代码。
 */

import type { Domain, InternalKey, Platform, Situation } from './types';
import { PLATFORM_PRIORITY } from '../lib/offers';

/* ── 权重键命名空间 ──────────────────────────────────────────────────
 * 历史事故：domain 与 temporal_orientation 都使用裸键 `future`，
 * 于是 q1「Future & Uncertainty」的 20 分同时把 temporal_orientation
 * 钉成 future，并让 domain=future 的分数无法与时间取向区分。
 * 现在所有维度都走带前缀的键，物理上不可能再碰撞。
 */
export const NS = {
  domain: 'd:',
  emotion: 'e:',
  relationship: 'r:',
  outcome: 'o:',
  temporal: 't:',
  urgency: 'u:',
  orientation: 's:',
  /**
   * 底层机制轴（内部代号，永不外显）。
   * 单独一个命名空间，物理上不可能与上面任何一个撞键。
   */
  internal: 'i:',
} as const;

export const key = {
  domain: (d: Domain) => `${NS.domain}${d}`,
  emotion: (e: string) => `${NS.emotion}${e}`,
  relationship: (r: string) => `${NS.relationship}${r}`,
  outcome: (o: string) => `${NS.outcome}${o}`,
  temporal: (t: string) => `${NS.temporal}${t}`,
  urgency: (u: string) => `${NS.urgency}${u}`,
  orientation: (s: string) => `${NS.orientation}${s}`,
  internal: (k: InternalKey) => `${NS.internal}${k}`,
};


/* ── 画像阈值 ──────────────────────────────────────────────────────── */

export const PROFILE_RULES = {
  /** 情绪维度入选的最低分。低于此分数视为「顺带沾染」，不进画像。 */
  emotionMinScore: 10,
  /** 情绪维度最多保留几个 */
  maxEmotions: 3,
  /** 诉求维度入选的最低分（多选题每题 20 分，故 20 = 用户显式勾选） */
  outcomeMinScore: 20,
  maxOutcomes: 2,
  /** 没有任何时间取向信号时的默认值（历史 bug：返回了数组首项 'past'） */
  defaultTemporal: 'present' as const,
  defaultUrgency: 'medium' as const,
  defaultOrientation: 'open' as const,
  /** 完全没有领域信号时（q1 选「我不确定」且 q2 未给出领域）的兜底 */
  fallbackDomain: 'self_growth' as Domain,
} as const;

/* ── 读者匹配权重（规格 §11 的可配置公式） ─────────────────────────── */

export const READER_WEIGHTS = {
  /** 主领域命中 */
  specialty_primary: 40,
  /** 次领域命中 */
  specialty_secondary: 14,
  /** 关系状态命中 */
  relationship_match: 26,
  /** 风格与用户的期望取向匹配（direct ↔ 想要直白答案） */
  style_match: 8,
  /** 评分加分：以 4.0 为基线，每 0.1 分记 1 分 */
  rating_per_point: 10,
  rating_baseline: 4.0,
  /** 有免费额度（3 free minutes / $30 credit）—— 降低首单心理门槛 */
  free_offer_bonus: 6,
  /** 平台优先级：按全站基线 Kasamba > Purple Garden > Keen 递减 */
  platform_priority_step: 3,
} as const;

/** 同一平台最多推荐几位读者，避免结果页被单一平台占满 */
export const MAX_READERS_PER_PLATFORM = 2;
export const MAX_READERS = 3;

/* ── 文章匹配权重（规格 §25 的加权标签匹配） ───────────────────────── */

export const ARTICLE_WEIGHTS = {
  primary_domain_match: 30,
  /** 亲和领域的命中：低于精确命中，但足以让相邻领域的文章可用 */
  affinity_domain_match: 12,
  secondary_domain_match: 10,
  secondary_topic_match: 6,
  emotional_state_match: 14,
  relationship_state_match: 26,
  desired_outcome_match: 16,
  temporal_orientation_match: 8,
  commercial_intent_high: 10,
  commercial_intent_medium: 4,
  /** 同一情绪命中多个时，按命中数递减，避免情绪堆量压过领域 */
  emotion_diminish: 0.6,
  outcome_diminish: 0.6,
} as const;

export const MAX_ARTICLES = 3;

/* ── 情境匹配（比 domain 细一层的相关性） ──────────────────────────── */

/**
 * 领域亲和度：用户问 money 时，career 文章是相关的；问 love 时，
 * breakup / relationships 相关。只认 domain 精确相等会把整池可用内容
 * 缩到几篇，进而把不相关的内容顶上来。
 */
export const DOMAIN_AFFINITY: Record<Domain, Domain[]> = {
  love: ['breakup', 'relationships', 'future'],
  breakup: ['love', 'relationships'],
  relationships: ['love', 'breakup', 'family'],
  money: ['career', 'future'],
  career: ['money', 'self_growth', 'future'],
  family: ['relationships', 'future'],
  spirituality: ['self_growth', 'future', 'protection'],
  future: ['self_growth', 'career', 'money', 'love'],
  self_growth: ['spirituality', 'future', 'career'],
  protection: ['spirituality', 'self_growth'],
};

export const SITUATION_WEIGHTS = {
  /** 情境命中：这是「这篇是给我写的」最强的一个信号 */
  match: 20,
  /**
   * 情境冲突：文章明确写的是另一个具体情境（怀孕 / 离婚 / 异地 / 宠物……）。
   * 扣到足以让它跌出旗舰位，因为这类错误在用户眼里最刺眼。
   */
  conflict: -16,
} as const;

/**
 * 旗舰位的相关性分级。数字越小越优先。
 *  0 = 领域精确 + 关系状态或情绪也命中   → 「就是写给你的」
 *  1 = 领域精确
 *  2 = 领域亲和
 *  3 = 无话题证据（平台测评 / 通识内容）→ 永不占旗舰位
 * 另外：情境冲突的文章一律降到 tier 3。
 */
export const TIER = {
  exact_plus: 0,
  exact: 1,
  affine: 2,
  agnostic: 3,
} as const;

/**
 * 「窄情境」标签：文章一旦被打上这些标签，就说明它只写给处于该情境的人。
 * 用户不在这个情境里 → 直接排除，不给任何补偿。
 *
 * 与「宽情境」（career_money / mental_health / healing / purpose /
 * first_timer / cost / legitimacy）的区别是刻意的：
 * 宽标签本身不足以判定一篇文章跑题，只做降级不做排除。
 * 所以「家庭冲突 + 焦虑」的用户仍然会拿到《Psychic Readings for Anxiety》，
 * 但不会拿到《怀孕占卜》或《第三者占卜》。
 */
export const EXCLUSIVE_SITUATIONS: readonly Situation[] = [
  'pregnancy', 'marriage', 'parenting', 'caregiving', 'estrangement',
  'pet', 'mediumship',
  'ldr', 'age_gap', 'lgbtq', 'third_party',
  'reconciliation', 'no_contact', 'breakup_recovery', 'toxic_relationship',
  'business', 'single', 'dating',
];
// 刻意不收：signs / awakening / past_life / dream / career_money /
// mental_health / healing / purpose / first_timer / cost / legitimacy。
// 这些是「话题」而不是「情境」—— 一个在找人生方向的人读《灵性觉醒》
// 并不跑题，所以它们不参与排除，只在命中时加分。

/** 领域精确命中但没有任何情绪/关系佐证时，旗舰位是否可接受 */
export const ALLOW_TIER1_FLAGSHIP = true;

/**
 * 旗舰位的分数下限。
 *
 * 低于这个分数意味着：这篇文章只是「领域勉强沾边」，并不真的写给这个人。
 * 此时宁可把标题改成 Background reading、不挂 Best match，也不要把一篇
 * 泛泛的内容包装成"为你写的"。实测中正是这个下限拦住了
 * 「家庭冲突 → 《怀孕占卜》」这类刺眼的错配。
 */
export const MIN_FLAGSHIP_SCORE = 20;


/* ── 转化原则（规格 §27） ──────────────────────────────────────────── */

/**
 * 高商业意图：明确在问「接下来会怎样 / 我该做什么 / 想被确认」
 * 这类人当下就想要一个具体答案，先给读者，再给文章。
 */
export const HIGH_INTENT_OUTCOMES = ['prediction', 'action', 'reassurance'] as const;
/**
 * 低商业意图：只是好奇、想要一个全新视角
 * 这类人给他内容与工具，不要立刻推付费咨询。
 */
export const LOW_INTENT_OUTCOMES = ['clarity', 'connection', 'control'] as const;

/**
 * 结果页区块顺序（规格 §27 + §28）。
 *
 * `mechanism` 是底层机制解读区块，紧跟 `narrative`。
 * 为什么位置固定在三档都是第 2 位：它属于「解读层」而不是「转化层」——
 * 它不含任何 CTA，不推荐读者，只是一个「被说中」的时刻。
 * 放在 narrative 之后是叙事上的必然（先讲发生了什么，再讲为什么卡住），
 * 放在所有转化区块之前，则保证它不会因为意图分级而被推到页面底部 ——
 * 那会让本页最好的一个留存钩子失效。它同时也是低意图用户唯一会读进去的内容，
 * 因此对低意图尤其重要。
 */
export const SECTION_ORDER: Record<'high' | 'medium' | 'low', string[]> = {
  high: ['narrative', 'mechanism', 'deeperQuestion', 'readers', 'article', 'whatNext', 'tool', 'email'],
  medium: ['narrative', 'mechanism', 'deeperQuestion', 'whatNext', 'readers', 'article', 'tool', 'email'],
  low: ['narrative', 'mechanism', 'deeperQuestion', 'whatNext', 'article', 'tool', 'email', 'readers'],
};

/**
 * 低意图用户是否完全不出读者区块。
 *
 * true  = 低意图（只是好奇 / 想要新视角）不推付费咨询，读者区块整体不渲染。
 * false = 仍然渲染，只是按 SECTION_ORDER.low 排到最后。
 *
 * 2026-09-15 由 false 改为 true：此前这个开关从未被任何代码读取，
 * 实际行为等于 false，但 config 注释却写着「不硬推」—— 属于误导性配置。
 * 现在 recommend.ts 真的读它了，取值也就必须与注释表达的产品意图一致。
 *
 * 代价是低意图用户的读者曝光减少（转化机会变少）；换来的是
 * 结果页不会对一个只是好奇的人立刻开价。要回到旧行为改这一个布尔即可。
 */
export const READERS_GATE_FOR_LOW_INTENT = true;

/* ── 底层机制轴（内部代号，规格 §28） ──────────────────────────────── */

/**
 * 机制轴入选阈值。
 *
 * 为什么用「不设默认值」的严格策略：机制解读的说服力全部来自「他确实说中了」。
 * 一旦在信号不足时退回一个泛泛的默认机制，这段文字立刻退化为 Barnum 套话，
 * 反而会把本来可信的结果页拉低。所以宁可不渲染这一整个区块。
 */
export const INTERNAL_RULES = {
  /** 最高分机制必须达到这个分数才认（专设题命中即 30 分） */
  minScore: 18,
  /**
   * 冠军机制的领先幅度：必须比第二名高这么多。
   * 低于这个差距说明用户的选择同时指向两种机制，硬选一个会显得武断。
   */
  minLead: 6,
  /** 结果页展示的反思问题条数 */
  reflectionCount: 2,
} as const;

/**
 * 🔒 机制自带的「解决方法」是否渲染。
 *
 * 2026-09-15 产品决策：**不提供**（用户明确指示）。
 * 机制区块只渲染解读与反思问题，让用户自己得出结论；
 * 直接给动作会把它从「被理解的时刻」变成「任务清单」，
 * 也会让这一段读起来像治疗建议 —— 而本站不做治疗。
 *
 * 数据层原文保留在 `content/internalMechanismActions.ARCHIVE.ts`，
 * **该文件刻意不被任何客户端代码 import** —— 这是唯一能保证它
 * 不进入 bundle 的方式（作为对象属性放在 internalMechanisms.ts 里，
 * 打包器会因「无法证明属性永不被读」而把整表保留）。
 *
 * 因此这个开关目前是**守卫标记**而非功能开关：没有任何渲染路径读它。
 * 若将来真要启用，必须先把 actions 移回客户端可达的模块，
 * 并重新过一遍文案纪律与合规审查（engine_suite §16 会拦住违规）。
 */
export const MECHANISM_ACTIONS_ENABLED = false;

/**
 * 机制轴 → 情境轴的桥接。
 *
 * 机制比情境更细：两个人可能都是 no_contact，但一个是真的失去了
 * （sudden_loss），一个是对象根本不可得（illusion_fixation）。
 * 把机制映射回情境，可以让推荐引擎用上这层新信息，
 * 而不必改动文章池的标注体系。
 */
export const INTERNAL_TO_SITUATIONS: Partial<Record<InternalKey, readonly Situation[]>> = {
  choice_friction: [],
  scarcity_panic: ['career_money'],
  boundary_invasion: ['toxic_relationship'],
  stagnation_void: ['purpose'],
  identity_crisis: ['purpose'],
  toxic_loop: ['toxic_relationship'],
  sudden_loss: ['breakup_recovery'],
  // illusion_fixation 刻意留空：它是「对象根本不可得」，
  // 但文章池里没有对应标签 —— no_contact 讲的是断联，意思不对；
  // thinking_about_someone 属于关系状态轴而非情境轴，不能放这里。
  // 空数组是诚实的：没有标签比硬塞一个错标签好。
  illusion_fixation: [],
};

/* ── 平台优先级（复用全站基线，不另立一套） ────────────────────────── */

export const PLATFORM_ORDER = PLATFORM_PRIORITY as readonly Platform[];
export const PLATFORM_LABEL: Record<Platform, string> = {
  kasamba: 'Kasamba',
  'purple-garden': 'Purple Garden',
  keen: 'Keen',
};

/* ── 邮件订阅 provider ────────────────────────────────────────────────
 * 规格 §32：需要外部服务时必须显式声明并做抽象层。
 * 本项目是 Cloudflare Pages 静态站，functions/ 下只有一个 postback 接收器，
 * **没有邮件后端**。所以这里必须显式选择一个 provider：
 *
 *   'local'      —— 默认。不做任何投递承诺：邮箱 + 画像落在本地与 PostHog，
 *                   结果页提供可收藏的永久链接，用户拿到的是「保存」而不是
 *                   「已发送」。这是唯一在零基建下不说谎的模式。
 *   'endpoint'   —— 把 email + 画像 POST 到一个你自己控制的表单地址。
 *                   最省事的做法是建一个 Google 表单（免费、无需后端、
 *                   收件人在 Sheets 里），把 formResponse 地址粘到 endpoint。
 *   'convertkit' —— app.convertkit.com 的表单订阅接口（CORS 可用）。
 *   'brevo'      —— Brevo 的托管表单。
 *
 * 换 provider 只改这一个对象，不改任何 UI 代码。
 */
export const EMAIL_CONFIG = {
  provider: 'local' as 'local' | 'endpoint' | 'convertkit' | 'brevo',
  /** provider='endpoint' 时必填 */
  endpoint: '',
  /** provider='convertkit' 时填表单 ID */
  convertkitFormId: '',
  /** provider='brevo' 时填托管表单地址 */
  brevoFormUrl: '',
  /** 这些字段会随订阅一起提交（画像快照，用于后续分主题发送） */
  includeProfileFields: true,
  /** 合规：必须显式同意才提交 */
  requireConsent: true,
} as const;

/** 结果页永久链接的参数名。用户可收藏/分享，也是「保存」承诺的实现方式。 */
export const RESULT_PARAM = 'r';

/** localStorage 命名空间 */
export const STORAGE = {
  profileHistory: 'ea_match_profile_history',
  lastProfile: 'ea_match_profile',
  dailyCards: 'ea_match_daily_cards',
  askHistory: 'ea_match_ask_history',
  email: 'ea_match_email',
  consent: 'ea_match_consent',
} as const;

/** 画像历史保留条数（规格 §14：历史必须保留而非覆盖） */
export const PROFILE_HISTORY_LIMIT = 24;

/* ── 文案纪律 ────────────────────────────────────────────────────────
 * 规格 §6 / §21：禁止确定性断言。
 * 下面这些词出现在任何生成文案里都视为缺陷，由 engine_suite 扫描。
 *
 * 注意：这里只收「对结果下确定性判断」的说法。
 * 像 narrativeBlocks 里 "identify what you know for certain" 这种
 * 鼓励用户留意自身确信的正面用法，不属于禁令范围，因此不收裸的
 * "for certain"（否则会把正常文案误判成违规，属于过宽的规则）。
 */
export const FORBIDDEN_ABSOLUTES = [
  'definitely will', 'will definitely', 'guaranteed', 'guarantee that',
  'your ex will', 'is going to happen', '100%', 'inevitable',
  'we predict that', 'certainly will',
];
