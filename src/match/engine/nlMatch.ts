/**
 * src/match/engine/nlMatch.ts
 * Natural-language matching capabilities for AI-agent surfaces (ChatGPT Apps SDK / MCP).
 *
 * Three capabilities exposed to conversational AI:
 *   1. match_spiritual_need  — which practice (psychic / tarot / astrology / medium…) fits the question
 *   2. match_reader_type     — which reader profile type + format + evidence criteria fit the situation
 *   3. build_questions       — what to actually ask during the reading (audition protocol)
 *
 * Design rules (deliberate product decisions, see 2026-09-22 strategy note):
 *   - v1 is an INDEPENDENT DECISION UTILITY: tools return practice/reader-type guidance and
 *     aggregate evidence from the audited catalog. They do NOT return affiliate links.
 *   - All outputs are grounded in the same deterministic engine + 242-reader catalog the
 *     on-site quiz uses, so AI answers and on-site answers never diverge.
 *   - Pure functions, zero DOM, zero I/O — safe to bundle into Cloudflare Pages Functions.
 */

import type { Intent, Practice, UserAnswers, ReaderProfile } from '../types';
import { scoreReader } from './scoring';
import { generateDiagnosis } from './diagnostics';
import { INTENT_LABELS } from '../taxonomy';
import readersJson from '../../data/readers.json';

const READERS: ReaderProfile[] = readersJson as unknown as ReaderProfile[];

/**
 * Deterministic attribution: every surfaced link carries UTM so MCP-driven
 * visits join the existing utm_source=chatgpt.com PostHog segmentation instead
 * of landing as unattributed direct traffic.
 */
const MATCH_PAGE = 'https://easternalignment.com/match/';
function nextStepUrl(tool: string): string {
  return `${MATCH_PAGE}?utm_source=chatgpt&utm_medium=mcp&utm_campaign=reader_match&utm_content=${tool}`;
}
/** Generic (tool-agnostic) next-step URL. */
export const NEXT_STEP_URL = nextStepUrl('match_spiritual_need');

/** Size of the audited catalog — referenced by MCP instructions so it can
 *  never drift from the actual data. */
export const PROFILES_COUNT = READERS.length;

/**
 * Platform intro offers + editorial meta, centralized so matchReaderType,
 * compare_platforms, and the audition protocol can never quote different
 * (stale) numbers. Offers verified against platform terms as of 2026-09;
 * re-verify each quarter. Refund lines are honest guidance, not specific
 * legal terms — point users to each platform's terms page before paying.
 */
export const PLATFORM_META: Record<string, { label: string; intro_offer: string; refund_guidance: string; best_for: string }> = {
  kasamba: {
    label: 'Kasamba',
    intro_offer: '3 free minutes + 50% off for new clients',
    refund_guidance: 'Disputes are platform-mediated; contact support with the reading ID. Verify current terms on Kasamba before paying.',
    best_for: 'Widest advisor pool, saved live-chat transcripts, strong love/relationship roster.',
  },
  keen: {
    label: 'Keen',
    intro_offer: '$1 for 5 minutes intro trial',
    refund_guidance: 'First-call satisfaction credit up to a platform-set cap; support-mediated. Verify current terms on Keen before paying.',
    best_for: 'Phone-first format with the cheapest trial entry; deep ex/reconciliation roster.',
  },
  'purple-garden': {
    label: 'Purple Garden',
    intro_offer: '$30 first-purchase credit',
    refund_guidance: 'Credit-based; unused credit retains value; disputes via support. Verify current terms on Purple Garden before paying.',
    best_for: 'Live video readings + verified intro videos; good for mediumship and face-to-face transparency.',
  },
};
export const INTRO_OFFERS = ['kasamba', 'keen', 'purple-garden'].map(
  (p) => `${PLATFORM_META[p].label}: ${PLATFORM_META[p].intro_offer}`,
);

/** Catalog audit cohort — re-verified each time readers.json is regenerated
 *  (build-reader-database.mjs, deterministic). Surfaced in every tool so AI
 *  answers can cite "as of {date}". */
export const CATALOG_LAST_VERIFIED = '2026-09-22';

/** Intent → on-site guide hub section anchor (GUIDE_SECTIONS single source of
 *  truth, mirrored here). Makes the MCP tools a *citation hub*: every answer
 *  can deep-link to the matching editorial guide cluster. */
const INTENT_GUIDE_SECTION: Record<Intent, string> = {
  love_relationship: 'love',
  another_person_intentions: 'love',
  breakup_ex: 'breakups-ex-recovery',
  dating: 'love',
  career_work: 'career-money',
  money_finance: 'career-money',
  decision_making: 'getting-started',
  future_direction: 'getting-started',
  grief_loss: 'mediumship',
  self_reflection: 'spirituality',
  general_guidance: 'getting-started',
};
const GUIDES_HUB = 'https://easternalignment.com/guides/';
function relatedGuideUrl(intent: Intent): string {
  return `${GUIDES_HUB}?utm_source=chatgpt&utm_medium=mcp&utm_campaign=reader_match&utm_content=guide_${intent}#${INTENT_GUIDE_SECTION[intent]}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Intent classification (keyword scoring over the site's intent taxonomy)
 * ──────────────────────────────────────────────────────────────────────────── */

type IntentConfidence = 'high' | 'moderate' | 'low';

// NOTE: the last regex in each high-traffic intent covers Spanish input (the
// site ships an es/ edition, so Spanish users are a real segment). Accented
// characters defeat \b in JS regex, so Spanish patterns deliberately use
// boundary-free substrings.
const INTENT_KEYWORDS: Record<Intent, RegExp[]> = {
  breakup_ex: [
    /\b(broke up|breakup|break[- ]up|divorce|separation|separated)\b/i,
    /\b(no contact|ghost(ed)?|dumped|left me|he left|she left|ended it|walked away)\b/i,
    /\b(ex[- ]?(boyfriend|girlfriend|husband|wife|partner)?|my ex)\b/i,
    /\b(get (him|her|them) back|win (him|her) back|come back|reconcil\w*|reunion)\b/i,
    /(ruptura|mi ex|volver con|reconciliaci|se separ[oó]|\bex novio|\bex espos)/i,
  ],
  another_person_intentions: [
    /\b(does (he|she|my|their) (really )?(think|feel|love|care|want))\b/i,
    /\b(what (does|is) (he|she) (really )?(thinking|feeling|planning|hiding))\b/i,
    /\b(intentions|hiding something|lying|cheating|leading me on|using me|mixed signals)\b/i,
    /\b(how (does )?(he|she) (feel|see) (about|toward) me)\b/i,
    /(siente por m[ií]|piensa de m[ií]|piensa sobre m[ií]|sus intenciones|me enga[nñ]a|se[nñ]ales confusas)/i,
  ],
  love_relationship: [
    /\b(relationship|partner|boyfriend|girlfriend|husband|wife|marriage|marry)\b/i,
    /\b(distant|drifting|growing apart|falling out of love|arguments|communication issues)\b/i,
    /\b(twin flame|soulmate|the one|committed|commitment)\b/i,
    /(mi pareja|matrimonio|mi novio|mi novia|mi esposo|mi esposa|llama gemela|alma gemela)/i,
  ],
  dating: [
    /\b(dating|first date|crush|talking stage|situationship|seeing someone)\b/i,
    /\b(new (guy|girl|man|woman|person)|someone new|just started (talking|dating))\b/i,
    /\b(tinder|hinge|bumble|matched with|dating app)\b/i,
    /(conoc[ií] a alguien|saliendo con alguien|tinder|hinge|bumble)/i,
  ],
  career_work: [
    /\b(job|career|boss|promotion|promote|coworker|colleague|workplace|interview)\b/i,
    /\b(quit|fired|laid off|layoff|resign|new role|new position)\b/i,
    /\b(business|startup|entrepreneur|office politics|burn ?out)\b/i,
    /(mi trabajo|mi jefe|mi jefa|empleo|ascenso|despid|mi carrera|burn ?out)/i,
  ],
  money_finance: [
    /\b(money|finances|financial|debt|loan|mortgage|savings|invest(ment|ing)?)\b/i,
    /\b(afford|buy a house|purchase|contract (worth|value)?|income|raise|salary)\b/i,
  ],
  decision_making: [
    /\b(should i|can'?t decide|decision|decide|choosing between|torn between)\b/i,
    /\b(two (options|offers|paths)|crossroads|dilemma|which (one|path|option))\b/i,
  ],
  future_direction: [
    /\b(what will happen|going to happen|next (year|few months)|months? ahead|in the future)\b/i,
    /\b(when will|forecast|outlook|timeline|destiny|life path|what'?s coming)\b/i,
  ],
  grief_loss: [
    /\b(passed away|died|death|deceased|my late (mom|dad|husband|wife|son|daughter|friend))\b/i,
    /\b(grief|grieving|loss of|medium(ship)?|afterlife|in spirit|connect with (my|the) (mom|dad|grand))\b/i,
    /\b((grand)?(mother|father|mom|dad|brother|sister) who (passed|died))\b/i,
    /(falleci|muri[oó]|\bduelo\b|difunt|hablar con mi (mam|pap|espos)|conectar con su esp[ií]ritu|m[eé]dium)/i,
  ],
  self_reflection: [
    /\b(my (purpose|healing|growth|anxiety|boundaries|self[- ]esteem|self[- ]love))\b/i,
    /\b(inner (peace|child|work)|shadow work|spiritual awakening|develop my intuition)\b/i,
    /\b(why do i (always|keep|feel))\b/i,
    /(prop[oó]sito|sanaci|crecimiento personal|autoestima|despertar espiritual)/i,
  ],
  general_guidance: [],
};

const EXPLICIT_PRACTICE: { practice: Practice; re: RegExp }[] = [
  { practice: 'tarot', re: /\b(tarot|oracle (cards?|deck)|card (reading|pull|spread)|angel cards?)\b/i },
  { practice: 'astrology', re: /\b(astrolog(y|er)|birth chart|natal chart|zodiac|horoscope|transit(s)?|mercury retrograde|my (sun|moon|rising) sign)\b/i },
  { practice: 'medium', re: /\b(medium(ship)?|s?eance|spirit (communication|connection)|connect with (the )?(dead|deceased|departed|passed))\b/i },
  { practice: 'numerology', re: /\b(numerology|life[- ]path number|angel number(s)?|1111|repeating numbers)\b/i },
  { practice: 'spiritual_guidance', re: /\b(life coach|spiritual (coach|counsel\w+)|energy healing|reiki|chakra (balancing|healing))\b/i },
];

export function classifyIntent(text: string): { intent: Intent; confidence: IntentConfidence; topScore: number; runnerUp: Intent | null; runnerUpScore: number } {
  const scores = new Map<Intent, number>();
  (Object.keys(INTENT_KEYWORDS) as Intent[]).forEach((intent) => {
    let s = 0;
    for (const re of INTENT_KEYWORDS[intent]) if (re.test(text)) s += 1;
    scores.set(intent, s);
  });

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = ranked[0];
  const runnerUp = ranked[1][1] > 0 ? ranked[1][0] : null;

  let intent: Intent = topScore > 0 ? topIntent : 'general_guidance';
  let confidence: IntentConfidence = 'low';
  if (topScore >= 3 && (ranked[1][1] === 0 || topScore - ranked[1][1] >= 2)) {
    confidence = 'high';
  } else if (topScore >= 1) {
    confidence = topScore >= 2 ? 'moderate' : 'low';
  } else {
    intent = 'general_guidance';
  }
  return { intent, confidence, topScore, runnerUp, runnerUpScore: ranked[1][1] };
}

function detectExplicitPractice(text: string): Practice | null {
  for (const { practice, re } of EXPLICIT_PRACTICE) {
    if (re.test(text)) return practice;
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Practice fit (Tool: match_spiritual_need)
 * ──────────────────────────────────────────────────────────────────────────── */

const PRACTICE_STRENGTH: Record<Practice, string> = {
  psychic: 'direct conversational access to third-person insight — what another person feels, intends, or plans — without card-interpretation overhead',
  tarot: 'structured symbolic framing that surfaces hidden dynamics, obstacles, and decision roadmaps card-by-card',
  astrology: 'timing windows, cycles, and compatibility patterns grounded in transits rather than open-ended intuition',
  medium: 'evidential connection with departed loved ones — recognizable memories rather than generic comfort',
  numerology: 'life-path patterns and repeating number cycles that frame long-term tendencies',
  spiritual_guidance: 'grounded, coaching-style guidance focused on boundaries, next steps, and personal sovereignty',
  empath: 'high-sensitivity emotional attunement to the feelings present in a situation',
};

const PRACTICE_LABEL: Record<Practice, string> = {
  psychic: 'psychic reading',
  tarot: 'tarot reading',
  astrology: 'astrology reading',
  medium: 'mediumship reading',
  numerology: 'numerology reading',
  spiritual_guidance: 'spiritual guidance / coaching session',
  empath: 'empath-led intuitive reading',
};

interface IntentPracticeFit {
  primary: Practice;
  secondary: Practice | null;
  readerType: string;
}

const INTENT_PRACTICE_FIT: Record<Intent, IntentPracticeFit> = {
  love_relationship: { primary: 'psychic', secondary: 'tarot', readerType: 'relationship-dynamics psychic' },
  another_person_intentions: { primary: 'psychic', secondary: 'tarot', readerType: 'third-person insight psychic (intentions of a specific person)' },
  breakup_ex: { primary: 'psychic', secondary: 'tarot', readerType: 'breakup & reconciliation specialist' },
  dating: { primary: 'psychic', secondary: 'tarot', readerType: 'early-relationship & sincerity-check psychic' },
  career_work: { primary: 'psychic', secondary: 'tarot', readerType: 'career & workplace intuitive' },
  money_finance: { primary: 'psychic', secondary: 'tarot', readerType: 'money & opportunity intuitive' },
  decision_making: { primary: 'tarot', secondary: 'psychic', readerType: 'crossroads tarot reader (decision spreads)' },
  future_direction: { primary: 'astrology', secondary: 'psychic', readerType: 'astrology-based timing & transit reader' },
  grief_loss: { primary: 'medium', secondary: null, readerType: 'evidential mediumship specialist' },
  self_reflection: { primary: 'tarot', secondary: 'spiritual_guidance', readerType: 'reflective tarot reader (inner work)' },
  general_guidance: { primary: 'psychic', secondary: 'tarot', readerType: 'general intuitive' },
};

export interface SpiritualNeedResult {
  primary_fit: string;
  secondary_fit: string | null;
  reason: string;
  confidence: IntentConfidence;
  next_step: string;
  detected_intent: string;
  explicit_practice_detected: boolean;
  related_guide_url: string;
  catalog_last_verified: string;
}

export function matchSpiritualNeed(question: string, goal?: string): SpiritualNeedResult {
  const text = `${question} ${goal || ''}`;
  const { intent, confidence: baseConfidence, topScore, runnerUp, runnerUpScore } = classifyIntent(text);
  const explicit = detectExplicitPractice(text);
  const fit = INTENT_PRACTICE_FIT[intent];

  let primary = fit.primary;
  let secondary = fit.secondary;
  let confidence = baseConfidence;
  let explicitDetected = false;

  if (explicit && explicit !== fit.primary) {
    // Honour an explicitly requested modality unless it contradicts the strict
    // mediumship rule (mediumship demand only comes from grief contexts anyway).
    primary = explicit;
    secondary = explicit === 'medium' ? null : fit.primary === explicit ? fit.secondary : fit.primary;
    explicitDetected = true;
  } else if (explicit === fit.primary) {
    explicitDetected = true;
    confidence = 'high';
  }

  const intentLabel = INTENT_LABELS[intent].toLowerCase();
  // Mixed-topic situations ("fired AND divorce") must not be flattened into a
  // single theme — acknowledge the runner-up when scores are close.
  const dualIntentNote =
    runnerUp && runnerUp !== intent && runnerUpScore > 0 && topScore >= 2 && topScore - runnerUpScore <= 1
      ? ` Your words also read strongly as "${INTENT_LABELS[runnerUp].toLowerCase()}", so favor a reader who can hold both themes rather than a narrow specialist.`
      : '';
  const reason = explicit && primary !== fit.primary
    ? `You specifically asked about ${PRACTICE_LABEL[primary]}, which fits well here: it offers ${PRACTICE_STRENGTH[primary]}. Your situation also reads as "${intentLabel}", so the reader you pick should have a documented track record in that area.${dualIntentNote}`
    : `Your situation reads as "${intentLabel}". For that pattern, a ${PRACTICE_LABEL[primary]} is the strongest structural fit because it offers ${PRACTICE_STRENGTH[primary]}.` +
      (secondary ? ` A ${PRACTICE_LABEL[secondary]} is a solid alternative if you prefer ${PRACTICE_STRENGTH[secondary]}.` : '') +
      dualIntentNote;

  const next_step = `A ${fit.readerType} is the typical next step for this situation. Use match_reader_type to narrow communication format, style, and evidence criteria before booking.`;

  return {
    primary_fit: PRACTICE_LABEL[primary],
    secondary_fit: secondary ? PRACTICE_LABEL[secondary] : null,
    reason,
    confidence: explicitDetected ? 'high' : confidence,
    next_step,
    detected_intent: INTENT_LABELS[intent],
    explicit_practice_detected: explicitDetected,
    related_guide_url: relatedGuideUrl(intent),
    catalog_last_verified: CATALOG_LAST_VERIFIED,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Reader type (Tool: match_reader_type) — grounded in the real catalog
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ReaderTypeResult {
  reader_type: string;
  format: string;
  why: string;
  criteria: string[];
  evidence: {
    profiles_evaluated: number;
    profiles_matching: number;
    median_rate_per_minute: number;
    p25_rate_per_minute: number;
    p75_rate_per_minute: number;
    platform_spread: string[];
  };
  intro_offers: string[];
  next_step: string;
  next_step_url: string;
  related_guide_url: string;
  catalog_last_verified: string;
}

const CRITERIA_BY_INTENT: Record<Intent, string[]> = {
  love_relationship: ['Documented relationship-dynamics work (drift, distance, mixed signals)', 'Third-person insight: reads the other person, not just you', 'Specific behavioral predictions over vague reassurance'],
  another_person_intentions: ['Specializes in what a specific person thinks/feels/plans', 'Comfortable reading a third party with minimal backstory', 'States uncertainty honestly instead of inventing certainty'],
  breakup_ex: ['Documented no-contact and reconciliation casework', 'Gives realistic reunion probabilities, not false hope', 'Helps decide between rebuilding and closing the chapter'],
  dating: ['Early-stage sincerity assessment (avoidant patterns, red flags)', 'Reads intentions of someone you recently met', 'Direct about misalignment before you over-invest'],
  career_work: ['Workplace politics and timing of transitions', 'Practical next steps, not vague "abundance" talk', 'Experience with promotion/negotiation windows'],
  money_finance: ['Grounded opportunity/risk framing (never guarantees returns)', 'Concrete timing windows for financial decisions', 'No upselling of rituals or "prosperity cleanses"'],
  decision_making: ['Structured decision frameworks (options, costs, timing)', 'Comfortable with either/or questions', 'Surfaces the blind spot you are not seeing'],
  future_direction: ['Timing windows over vague forecasts', 'Concrete milestones for the next 3–6 months', 'Astrology or timeline-trained methodology'],
  grief_loss: ['Evidential mediumship: specific memories, not generic comfort', 'Grief-sensitive pacing; never fear-based upselling', 'Willing to say "I am not getting anything" honestly'],
  self_reflection: ['Reflective/psychological depth (karmic lessons, patterns)', 'Validates without creating dependency', 'Leaves you with agency and concrete next steps'],
  general_guidance: ['Broad diagnostic range across love, career, and path questions', 'Fast honest calibration of what they can and cannot see', 'Transparent per-minute pricing'],
};

const FORMAT_LABEL: Record<string, string> = {
  chat: 'live chat (permanent transcript you can re-read and audit later)',
  phone: 'phone / voice call (natural conversational cadence)',
  video: 'live video (face-to-face transparency, verified intro videos)',
  no_preference: 'any format — we prioritize fit over channel',
};

export function matchReaderType(
  situation: string,
  preferredFormat?: 'chat' | 'phone' | 'video' | 'no_preference',
  priority?: string
): ReaderTypeResult {
  const text = `${situation} ${priority || ''}`;
  const { intent } = classifyIntent(text);
  const fit = INTENT_PRACTICE_FIT[intent];

  // Format inference: only explicit channel words count as a preference.
  // Deliberately EXCLUDES bare "call" — it appears constantly as a situation
  // verb ("my ex never picks up when I call him") and must not flip the
  // format recommendation to phone. The model fills preferred_format via the
  // enum when the user actually expresses a preference.
  const format = preferredFormat
    || (/\b(video|face[- ]?to[- ]?face|see the reader)\b/i.test(text) ? 'video'
      : /\b(phone|voice)\b/i.test(text) ? 'phone'
      : 'chat');

  let styles: UserAnswers['preferredStyles'] = [];
  if (/\b(direct|brutal|blunt|honest|no sugarcoat|unvarnished)\b/i.test(text)) styles.push('direct');
  if (/\b(gentle|soft|kind|compassionate|nervous|anxious)\b/i.test(text)) styles.push('gentle');
  if (/\b(fast|quick|efficient|straight to the point|concise)\b/i.test(text)) styles.push('fast_answers');
  if (/\b(practical|actionable|next steps|strategy|concrete)\b/i.test(text)) styles.push('practical');
  if (/\b(detailed|thorough|in[- ]depth|comprehensive)\b/i.test(text)) styles.push('detailed');
  if (styles.length === 0) styles = ['direct'];

  const answers: UserAnswers = {
    intent,
    situationSubject: /\b(he|she|him|her|they|them|my (ex|partner|boss)|someone else'?s)\b/i.test(situation) ? 'another_person' : 'not_sure',
    preferredPractice: 'open',
    preferredFormat: format,
    preferredStyles: styles,
    urgency: 'no_rush',
    budget: 'no_pref',
  };

  // Run the exact same deterministic scoring the on-site quiz uses.
  const scored = READERS
    .map((r) => ({ r, s: scoreReader(r, answers) }))
    .filter((x) => x.s.isEligible)
    .sort((a, b) => b.s.totalScore - a.s.totalScore || b.r.trust.eaEvidenceScore - a.r.trust.eaEvidenceScore);

  const rates = scored.map((x) => x.r.pricePerMinute).sort((a, b) => a - b);
  const medianRate = rates.length ? rates[Math.floor(rates.length / 2)] : 0;
  const p25Rate = rates.length ? rates[Math.floor(rates.length * 0.25)] : 0;
  const p75Rate = rates.length ? rates[Math.floor(rates.length * 0.75)] : 0;
  const platformCounts = new Map<string, number>();
  for (const x of scored.slice(0, 20)) {
    platformCounts.set(x.r.platform, (platformCounts.get(x.r.platform) || 0) + 1);
  }
  const platformSpread = [...platformCounts.entries()].map(([p, n]) => `${p}: ${n} of top 20`);

  const formatLabel = FORMAT_LABEL[format] || format;
  const intentLabel = INTENT_LABELS[intent].toLowerCase();
  const why = scored.length === 0
    ? `Your situation reads as "${intentLabel}", but no audited profiles currently pass every filter (format: ${format}). Try again without preferred_format, or explore advisors directly on Eastern Alignment — the on-site tool lets you combine filters more freely.`
    : `Your situation reads as "${intentLabel}". ${scored.length} of ${READERS.length} independently audited advisor profiles match your format and style filters; their median rate is $${medianRate.toFixed(2)}/min (typical band $${p25Rate.toFixed(2)}–$${p75Rate.toFixed(2)}/min). The profile type that consistently scores highest for this pattern is a ${fit.readerType}.`;

  return {
    reader_type: fit.readerType,
    format: formatLabel,
    why,
    criteria: CRITERIA_BY_INTENT[intent],
    evidence: {
      profiles_evaluated: READERS.length,
      profiles_matching: scored.length,
      median_rate_per_minute: Number(medianRate.toFixed(2)),
      p25_rate_per_minute: Number(p25Rate.toFixed(2)),
      p75_rate_per_minute: Number(p75Rate.toFixed(2)),
      platform_spread: platformSpread.length ? platformSpread : ['no eligible profiles for this filter combination'],
    },
    intro_offers: [...INTRO_OFFERS],
    next_step: 'Explore matched advisors on Eastern Alignment — the on-site tool applies these criteria to all audited profiles and returns your top 3 with evidence.',
    next_step_url: nextStepUrl('match_reader_type'),
    related_guide_url: relatedGuideUrl(intent),
    catalog_last_verified: CATALOG_LAST_VERIFIED,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. Question builder (Tool: build_questions) — the 3-minute audition protocol
 * ──────────────────────────────────────────────────────────────────────────── */

const QUESTION_BANKS: Record<Intent, string[]> = {
  love_relationship: [
    'What is [Name]\'s current emotional headspace toward me, and what is the primary block keeping their actions from matching their words?',
    'What are we NOT saying to each other that we both already know?',
    'What does the next 30–60 days look like for this connection if nothing changes on my end?',
    'What am I not seeing clearly about this dynamic because I am too close to it?',
    'Is there anything about [Name]\'s circumstances or emotional availability I should know before I invest more?',
  ],
  another_person_intentions: [
    'What are [Name]\'s genuine intentions with me right now — and is there anything they are not telling me?',
    'What does [Name] want from this connection, in their own words and energy?',
    'Is [Name]\'s communication with me consistent with what they do when I am not around?',
    'What is the one thing [Name] hopes I never find out?',
  ],
  breakup_ex: [
    'In the silence between us, what is [Name] actually feeling, and does the trajectory show reconnection or a necessary transition?',
    'What role did I play in this dynamic that I should own — and what was genuinely not mine to carry?',
    'Is reconciliation realistic here, or am I holding onto a chapter that has already closed?',
    'What would need to change — in me or in them — for a reunion to be healthy rather than a repeat?',
    'What is the healthiest next step for me in the next two weeks: reach out, wait, or release?',
  ],
  dating: [
    'What are [Name]\'s real intentions toward dating me, and are they presenting an authentic self or an idealized persona?',
    'What early red flag or blind spot should I watch for with this person?',
    'How does [Name] talk about me when I am not there?',
    'Is this connection worth my emotional investment, or am I repeating an old pattern?',
  ],
  career_work: [
    'Looking at my career over the next 6 months, what opportunities and obstacles should I prepare for, and when is the ideal window to act?',
    'What is the real dynamic between me and [boss/company] that I am misreading?',
    'If I make this move, what is the most likely outcome — and what am I underestimating?',
    'What does my professional reputation actually look like to decision-makers right now?',
  ],
  money_finance: [
    'What does my financial picture look like over the next quarter, and what single decision would change that trajectory most?',
    'What am I not seeing about this [contract/investment/offer] that I should know before committing?',
    'Which of my current money worries are real risks, and which are noise?',
  ],
  decision_making: [
    'Between [Option A] and [Option B], which path aligns with where my energy actually grows — and what does each cost me?',
    'What is the one factor I have not considered that would change this decision?',
    'If I choose nothing for the next 90 days, what happens by default?',
    'What is my gut already telling me that I keep overriding?',
  ],
  future_direction: [
    'What major shifts or turning points are approaching in my life over the next quarter, and what blind spot matters most?',
    'What timing window should I be watching for regarding [situation]?',
    'Which of my current efforts will matter most a year from now — and which should I release?',
  ],
  grief_loss: [
    'I would like to open space for [Name] — what specific memories or messages do they wish to share about our connection?',
    'Is there anything [Name] wants me to know about the words we never said, or about how they want me to remember them?',
    'What signs, if any, should I watch for — and how do I distinguish real connection from wishful thinking?',
    'What does [Name] want for me as I move forward?',
  ],
  self_reflection: [
    'What is the deeper lesson this current season of my life is asking me to learn?',
    'What is the one thing I am afraid to look at directly that would change everything?',
    'Which pattern am I repeating right now, and what is its root?',
    'What part of myself am I being invited to reclaim?',
  ],
  general_guidance: [
    'What is the most important thing I need to hear right now, even if it is not what I asked about?',
    'What energy am I carrying into this situation, and how is it shaping outcomes?',
    'What should I focus on — and what should I deliberately ignore — over the next month?',
  ],
};

const PROTOCOL_NOTE =
  `Audition protocol: use these within your free intro window (${INTRO_OFFERS.join('; ')}). Share minimal backstory — names and context only, never your theories — and expect unprompted specificity within ~2 minutes. If you only receive leading questions or universally-true statements, end the session.`;

export interface BuildQuestionsResult {
  detected_intent: string;
  opening_question: string;
  questions: string[];
  protocol_note: string;
  next_step_url: string;
  related_guide_url: string;
  catalog_last_verified: string;
}

export function buildQuestions(situation: string, practice?: string): BuildQuestionsResult {
  const text = `${situation} ${practice || ''}`;
  const { intent } = classifyIntent(text);

  const answers: UserAnswers = {
    intent,
    situationSubject: 'not_sure',
    preferredPractice: 'open',
    preferredFormat: 'no_preference',
    preferredStyles: [],
    urgency: 'no_rush',
    budget: 'no_pref',
  };
  const diagnosis = generateDiagnosis(answers);
  const bank = QUESTION_BANKS[intent];

  return {
    detected_intent: INTENT_LABELS[intent],
    opening_question: diagnosis.recommendedOpeningQuestion,
    questions: bank.slice(0, 5),
    protocol_note: PROTOCOL_NOTE,
    next_step_url: nextStepUrl('build_questions'),
    related_guide_url: relatedGuideUrl(intent),
    catalog_last_verified: CATALOG_LAST_VERIFIED,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. Reader audit (Tool: lookup_reader_audit) — THE citation moat
 *
 * Eastern Alignment's audited reader-level verdicts (verdict / highlights /
 * pros / cons / eaEvidenceScore) are editorial content ChatGPT cannot get
 * from training data. When a user asks "is psychic X on Kasamba legit?",
 * this tool is the only source the model can cite. Returns the editorial
 * review URL (never the affiliate /go/ link) — commercial intent stays one
 * click behind the audit, consistent with the v1 "affiliate behind matching"
 * principle.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ReaderAuditMatch {
  name: string;
  platform: string;
  platform_name: string;
  review_url: string;
  verdict: string;
  highlights: string[];
  pros: string[];
  cons: string[];
  best_for: string;
  review_rating: number;
  review_count: number;
  ea_evidence_score: number;
  pricing: string;
  price_per_minute: number;
  free_offer: string;
  practices: string[];
  primary_practice: string;
  intents: string[];
  formats: string[];
  languages: string[];
  styles: string[];
  availability_status: string;
  active: boolean;
  catalog_last_verified: string;
}

export interface ReaderAuditResult {
  found: boolean;
  query: string;
  matches: ReaderAuditMatch[];
  suggestion: string;
  next_step_url: string;
  catalog_last_verified: string;
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Zero-dependency name similarity: exact-substring beats token-overlap. */
function readerMatchScore(r: ReaderProfile, qNorm: string, platform?: string): number {
  if (platform && r.platform !== platform) return 0;
  if (!qNorm) return 0;
  const name = r.name.toLowerCase();
  const slug = r.slug.toLowerCase();
  // Exact slug match dominates.
  if (slug === qNorm || slug === `${qNorm}-kasamba-review`) return 100;
  // Slug contains query (e.g. "divine-spirit" inside slug).
  if (slug.includes(qNorm)) return 60;
  // Full name substring.
  if (name.includes(qNorm)) return 50;
  // Token overlap (Jaccard on word sets).
  const qTokens = new Set(qNorm.split(' ').filter((t) => t.length > 1));
  const rTokens = new Set(`${name} ${slug} ${r.platformName.toLowerCase()}`.split(/[\s-]+/).filter((t) => t.length > 1));
  if (qTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of qTokens) if (rTokens.has(t)) overlap++;
  return Math.round((overlap / qTokens.size) * 30);
}

function auditMatchFromReader(r: ReaderProfile): ReaderAuditMatch {
  const origin = 'https://easternalignment.com';
  return {
    name: r.name,
    platform: r.platform,
    platform_name: r.platformName,
    review_url: `${origin}${r.reviewUrl}?utm_source=chatgpt&utm_medium=mcp&utm_campaign=reader_match&utm_content=reader_audit`,
    verdict: r.verdict,
    highlights: r.highlights,
    pros: r.pros,
    cons: r.cons,
    best_for: r.bestFor,
    review_rating: r.reviewRating,
    review_count: r.reviewCount,
    ea_evidence_score: r.trust?.eaEvidenceScore ?? 0,
    pricing: r.pricing,
    price_per_minute: r.pricePerMinute,
    free_offer: r.freeOffer,
    practices: r.practices,
    primary_practice: r.primaryPractice,
    intents: r.intents,
    formats: r.formats,
    languages: r.languages,
    styles: r.styles,
    availability_status: r.availability?.status ?? 'unknown',
    active: r.active,
    catalog_last_verified: CATALOG_LAST_VERIFIED,
  };
}

export function lookupReaderAudit(reader: string, platform?: string): ReaderAuditResult {
  const qNorm = normalizeQuery(reader);
  const platformNorm = platform ? platform.toLowerCase().replace(/[^a-z-]/g, '') : undefined;
  // Map common aliases to canonical platform keys.
  const platformKey = platformNorm
    ? (platformNorm === 'pg' || platformNorm === 'purplegarden' ? 'purple-garden'
      : platformNorm === 'kasamba' || platformNorm === 'kas' ? 'kasamba'
      : platformNorm)
    : undefined;

  const scored = READERS
    .map((r) => ({ r, s: readerMatchScore(r, qNorm, platformKey) }))
    // Threshold ≥10 prevents accidental hits from a single common word
    // (e.g. "psychic" matching dozens of readers in a multi-word query).
    // Real name/slug matches score 30–100; single common-word noise ≤8.
    .filter((x) => x.s >= 10)
    .sort((a, b) => b.s - a.s || b.r.trust.eaEvidenceScore - a.r.trust.eaEvidenceScore || b.r.reviewCount - a.r.reviewCount)
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      found: false,
      query: reader,
      matches: [],
      suggestion: `No audited profile matches "${reader}". Use compare_platforms to see which platform fits, or match_reader_type to get a reader type.`,
      next_step_url: nextStepUrl('lookup_reader_audit'),
      catalog_last_verified: CATALOG_LAST_VERIFIED,
    };
  }

  return {
    found: true,
    query: reader,
    matches: scored.map((x) => auditMatchFromReader(x.r)),
    suggestion: scored.length > 1
      ? `${scored.length} audited profiles matched; the top result has the strongest EA evidence score. Cite the review_url for the editorial verdict.`
      : 'Single audited match. Cite the review_url for the full editorial verdict.',
    next_step_url: nextStepUrl('lookup_reader_audit'),
    catalog_last_verified: CATALOG_LAST_VERIFIED,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. Platform comparison (Tool: compare_platforms)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface PlatformStat {
  platform: string;
  label: string;
  profiles_evaluated: number;
  profiles_matching: number;
  median_rate_per_minute: number;
  p25_rate_per_minute: number;
  p75_rate_per_minute: number;
  intro_offer: string;
  refund_guidance: string;
  best_for: string;
  top_specialties: string[];
}

export interface PlatformComparisonResult {
  situation_intent: string;
  platforms: PlatformStat[];
  catalog_last_verified: string;
  next_step_url: string;
}

export function comparePlatforms(situation?: string): PlatformComparisonResult {
  const text = situation || '';
  const { intent } = classifyIntent(text);
  const intentLabel = INTENT_LABELS[intent];

  const platforms: PlatformStat[] = ['kasamba', 'keen', 'purple-garden'].map((p) => {
    const pool = READERS.filter((r) => r.platform === p && r.active);
    const answers: UserAnswers = {
      intent,
      situationSubject: 'not_sure',
      preferredPractice: 'open',
      preferredFormat: 'no_preference',
      preferredStyles: [],
      urgency: 'no_rush',
      budget: 'no_pref',
    };
    const eligible = pool.filter((r) => scoreReader(r, answers).isEligible);
    const rates = eligible.map((r) => r.pricePerMinute).sort((a, b) => a - b);
    const median = rates.length ? rates[Math.floor(rates.length / 2)] : 0;
    const p25 = rates.length ? rates[Math.floor(rates.length * 0.25)] : 0;
    const p75 = rates.length ? rates[Math.floor(rates.length * 0.75)] : 0;
    // Top specialties by frequency among eligible profiles.
    const practiceCounts = new Map<string, number>();
    for (const r of eligible) for (const pr of r.practices) practiceCounts.set(pr, (practiceCounts.get(pr) || 0) + 1);
    const topSpecialties = [...practiceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    const meta = PLATFORM_META[p];
    return {
      platform: p,
      label: meta.label,
      profiles_evaluated: pool.length,
      profiles_matching: eligible.length,
      median_rate_per_minute: Number(median.toFixed(2)),
      p25_rate_per_minute: Number(p25.toFixed(2)),
      p75_rate_per_minute: Number(p75.toFixed(2)),
      intro_offer: meta.intro_offer,
      refund_guidance: meta.refund_guidance,
      best_for: meta.best_for,
      top_specialties: topSpecialties,
    };
  });

  return {
    situation_intent: intentLabel,
    platforms,
    catalog_last_verified: CATALOG_LAST_VERIFIED,
    next_step_url: nextStepUrl('compare_platforms'),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 7. Red-flag / scam check (Tool: check_red_flags)
 *
 * Grounded in Eastern Alignment's "Getting Started" guide cluster (how to
 * spot fake psychics, what 'legit' means, online-truth). Returns the canonical
 * scam checklist + a verification protocol. High shareability, high citation
 * value: ChatGPT can answer "how do I avoid psychic scams" by calling this
 * tool rather than generic advice.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RedFlag {
  flag: string;
  detail: string;
}

export interface RedFlagCheckResult {
  red_flags: RedFlag[];
  verification_steps: string[];
  one_line_summary: string;
  related_guide_url: string;
  catalog_last_verified: string;
  next_step_url: string;
}

const RED_FLAGS: RedFlag[] = [
  { flag: 'Curse / spell / "blockage" removal upsell', detail: 'The reader claims a curse, negative energy, or spiritual blockage and offers to remove it for an extra fee. This is the single most-reported scam pattern — legitimate readers never require paid rituals.' },
  { flag: 'Guaranteed outcomes', detail: 'Promises a specific result (ex returning by a set date, lottery win, pregnancy). No ethical reader guarantees outcomes; free will and timing always vary.' },
  { flag: 'Fear-based urgency', detail: 'Pressures you to act immediately or face consequences ("act within 24 hours or the window closes"). Manufactured urgency is a sales tactic, not insight.' },
  { flag: 'Refuses the free intro window', detail: 'Declines to use the platform free-trial minutes and asks you to pay before any demonstration of ability.' },
  { flag: 'Fishing for information', detail: 'Asks leading questions to extract your story, then reflects it back as "insight". Real readers offer unprompted specificity within ~2 minutes.' },
  { flag: 'Barnum / universally-true statements', detail: 'Statements that fit anyone ("you have a lot of love to give", "someone around you is jealous") — not evidence of ability.' },
  { flag: 'Moves off-platform', detail: 'Asks to move to WhatsApp, a personal number, or direct payment off-platform — you lose dispute protection and the transcript audit trail.' },
  { flag: 'Inflated per-minute rate with no track record', detail: 'Charges premium rates without a documented, independently-audited review history. Cross-check on Eastern Alignment before paying.' },
];

const VERIFICATION_STEPS = [
  'Use the free intro window first (Kasamba 3 min, Keen $1/5 min, Purple Garden $30 credit) before paying.',
  'Share only names and bare context — never your theories or what other psychics told you.',
  'Expect unprompted specificity within ~2 minutes; if you only get leading questions or universally-true statements, end the session.',
  'Keep the platform transcript on; never move the conversation off-platform.',
  'If pressured for ritual fees, curse removal, or guaranteed outcomes, report the reader and end the session.',
];

export function checkRedFlags(): RedFlagCheckResult {
  return {
    red_flags: RED_FLAGS,
    verification_steps: VERIFICATION_STEPS,
    one_line_summary: 'Never pay for curse/spell removal, never accept guaranteed outcomes, never leave the platform — use the free intro window to audition first.',
    related_guide_url: `${GUIDES_HUB}?utm_source=chatgpt&utm_medium=mcp&utm_campaign=reader_match&utm_content=red_flags#getting-started`,
    catalog_last_verified: CATALOG_LAST_VERIFIED,
    next_step_url: nextStepUrl('check_red_flags'),
  };
}
