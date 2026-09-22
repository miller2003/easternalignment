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

export const NEXT_STEP_URL = 'https://easternalignment.com/match/';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Intent classification (keyword scoring over the site's intent taxonomy)
 * ──────────────────────────────────────────────────────────────────────────── */

type IntentConfidence = 'high' | 'moderate' | 'low';

const INTENT_KEYWORDS: Record<Intent, RegExp[]> = {
  breakup_ex: [
    /\b(broke up|breakup|break[- ]up|divorce|separation|separated)\b/i,
    /\b(no contact|ghost(ed)?|dumped|left me|he left|she left|ended it|walked away)\b/i,
    /\b(ex[- ]?(boyfriend|girlfriend|husband|wife|partner)?|my ex)\b/i,
    /\b(get (him|her|them) back|win (him|her) back|come back|reconcil\w*|reunion)\b/i,
  ],
  another_person_intentions: [
    /\b(does (he|she|my|their) (really )?(think|feel|love|care|want))\b/i,
    /\b(what (does|is) (he|she) (really )?(thinking|feeling|planning|hiding))\b/i,
    /\b(intentions|hiding something|lying|cheating|leading me on|using me|mixed signals)\b/i,
    /\b(how (does )?(he|she) (feel|see) (about|toward) me)\b/i,
  ],
  love_relationship: [
    /\b(relationship|partner|boyfriend|girlfriend|husband|wife|marriage|marry)\b/i,
    /\b(distant|drifting|growing apart|falling out of love|arguments|communication issues)\b/i,
    /\b(twin flame|soulmate|the one|committed|commitment)\b/i,
  ],
  dating: [
    /\b(dating|first date|crush|talking stage|situationship|seeing someone)\b/i,
    /\b(new (guy|girl|man|woman|person)|someone new|just started (talking|dating))\b/i,
    /\b(tinder|hinge|bumble|matched with|dating app)\b/i,
  ],
  career_work: [
    /\b(job|career|boss|promotion|promote|coworker|colleague|workplace|interview)\b/i,
    /\b(quit|fired|laid off|layoff|resign|new role|new position)\b/i,
    /\b(business|startup|entrepreneur|office politics|burn ?out)\b/i,
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
  ],
  self_reflection: [
    /\b(my (purpose|healing|growth|anxiety|boundaries|self[- ]esteem|self[- ]love))\b/i,
    /\b(inner (peace|child|work)|shadow work|spiritual awakening|develop my intuition)\b/i,
    /\b(why do i (always|keep|feel))\b/i,
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

export function classifyIntent(text: string): { intent: Intent; confidence: IntentConfidence; topScore: number; runnerUp: Intent | null } {
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
  return { intent, confidence, topScore, runnerUp };
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
}

export function matchSpiritualNeed(question: string, goal?: string): SpiritualNeedResult {
  const text = `${question} ${goal || ''}`;
  const { intent, confidence: baseConfidence } = classifyIntent(text);
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
  const reason = explicit && primary !== fit.primary
    ? `You specifically asked about ${PRACTICE_LABEL[primary]}, which fits well here: it offers ${PRACTICE_STRENGTH[primary]}. Your situation also reads as "${intentLabel}", so the reader you pick should have a documented track record in that area.`
    : `Your situation reads as "${intentLabel}". For that pattern, a ${PRACTICE_LABEL[primary]} is the strongest structural fit because it offers ${PRACTICE_STRENGTH[primary]}.` +
      (secondary ? ` A ${PRACTICE_LABEL[secondary]} is a solid alternative if you prefer ${PRACTICE_STRENGTH[secondary]}.` : '');

  const next_step = `A ${fit.readerType} is the typical next step for this situation. Use match_reader_type to narrow communication format, style, and evidence criteria before booking.`;

  return {
    primary_fit: PRACTICE_LABEL[primary],
    secondary_fit: secondary ? PRACTICE_LABEL[secondary] : null,
    reason,
    confidence: explicitDetected ? 'high' : confidence,
    next_step,
    detected_intent: INTENT_LABELS[intent],
    explicit_practice_detected: explicitDetected,
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
    platform_spread: string[];
  };
  intro_offers: string[];
  next_step: string;
  next_step_url: string;
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

  const format = preferredFormat || (/\b(video|face to face|face-to-face|see the reader)\b/i.test(text) ? 'video' : /\b(phone|call|voice)\b/i.test(text) ? 'phone' : 'chat');

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
  const platformCounts = new Map<string, number>();
  for (const x of scored.slice(0, 20)) {
    platformCounts.set(x.r.platform, (platformCounts.get(x.r.platform) || 0) + 1);
  }
  const platformSpread = [...platformCounts.entries()].map(([p, n]) => `${p}: ${n} of top 20`);

  const formatLabel = FORMAT_LABEL[format] || format;
  const why = `Your situation reads as "${INTENT_LABELS[intent].toLowerCase()}". ${scored.length} of ${READERS.length} independently audited advisor profiles match your format and style filters; their median rate is $${medianRate.toFixed(2)}/min. The profile type that consistently scores highest for this pattern is a ${fit.readerType}.`;

  return {
    reader_type: fit.readerType,
    format: formatLabel,
    why,
    criteria: CRITERIA_BY_INTENT[intent],
    evidence: {
      profiles_evaluated: READERS.length,
      profiles_matching: scored.length,
      median_rate_per_minute: Number(medianRate.toFixed(2)),
      platform_spread: platformSpread.length ? platformSpread : ['no eligible profiles for this filter combination'],
    },
    intro_offers: [
      'Kasamba: 3 free minutes + 50% off for new clients',
      'Purple Garden: $30 first-purchase credit',
      'Keen: $1 for 5 minutes',
    ],
    next_step: 'Explore matched advisors on Eastern Alignment — the on-site tool applies these criteria to all audited profiles and returns your top 3 with evidence.',
    next_step_url: NEXT_STEP_URL,
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
  'Audition protocol: use these within your free intro window (Kasamba: 3 free minutes + 50% off; Purple Garden: $30 first-purchase credit; Keen: $1 for 5 minutes). Share minimal backstory — names and context only, never your theories — and expect unprompted specificity within ~2 minutes. If you only receive leading questions or universally-true statements, end the session.';

export interface BuildQuestionsResult {
  detected_intent: string;
  opening_question: string;
  questions: string[];
  protocol_note: string;
  next_step_url: string;
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
    next_step_url: NEXT_STEP_URL,
  };
}
