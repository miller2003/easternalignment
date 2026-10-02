/**
 * src/match/taxonomy.ts
 * Central taxonomy, the branching quiz flow, and label dictionaries for
 * Eastern Alignment Reader Match.
 *
 * Flow: two phases.
 *   1. "Your situation" (5 questions, branched by the first answer): area ->
 *      what's happening -> how long -> how it feels -> what they most hope to
 *      hear. Then a three-card draw that doubles as the mid-quiz mirror.
 *   2. "Your reader" (2-3 questions): style, reading method (skipped for
 *      grief: always mediumship), format.
 * Budget and urgency are no longer asked: urgency had no live availability
 * data behind it, and budget moved the score by 2 points at most.
 */

import type { QuizQuestion, Intent, Practice, CommunicationFormat, ReadingStyle, UserAnswers } from './types';
import { AREAS, AREA_BY_ID, DURATIONS, GRIEF_DURATIONS, HOPES, feelingsFor, findSituation, reflectionLine } from './reading';

export const INTENT_LABELS: Record<Intent, string> = {
  love_relationship: 'Relationship Dynamic',
  another_person_intentions: "Someone's Hidden Intentions",
  breakup_ex: 'Breakup & Reconciliation',
  dating: 'Dating & New Connection',
  career_work: 'Career & Work Direction',
  money_finance: 'Money & Financial Choices',
  decision_making: 'Critical Decision',
  future_direction: 'Future Path & Timing',
  grief_loss: 'Mediumship & Departed Loved Ones',
  self_reflection: 'Personal Growth & Healing',
  general_guidance: 'General Intuitive Clarity',
};

export const PRACTICE_LABELS: Record<Practice, string> = {
  psychic: 'Psychic & Intuitive',
  tarot: 'Tarot & Oracle',
  astrology: 'Astrology & Horoscopes',
  medium: 'Psychic Mediumship',
  numerology: 'Numerology & Life Path',
  spiritual_guidance: 'Spiritual Life Coaching',
  empath: 'Clairvoyant Empath',
};

export const FORMAT_LABELS: Record<CommunicationFormat, string> = {
  chat: 'Live Chat (Transcripts Saved)',
  phone: 'Phone & Voice Call',
  video: 'Live Video Reading',
  no_preference: 'Any Format / Best Value',
};

export const STYLE_LABELS: Record<ReadingStyle, string> = {
  direct: 'Direct & Unvarnished',
  gentle: 'Empathetic & Gentle',
  fast_answers: 'Fast & Efficient',
  practical: 'Practical Next Steps',
  detailed: 'Detailed & Thorough',
  conversational: 'Warm & Conversational',
  reflective: 'Reflective & Psychological',
  structured: 'Structured & Card-by-Card',
};

export const PLATFORM_BADGES: Record<string, { label: string; class: string; promoTag: string }> = {
  kasamba: {
    label: 'Kasamba',
    class: 'platform-badge--kasamba',
    promoTag: '3 Free Minutes with New Advisors',
  },
  'purple-garden': {
    label: 'Purple Garden',
    class: 'platform-badge--purple',
    promoTag: '$30 First-Purchase Credit',
  },
  keen: {
    label: 'Keen',
    class: 'platform-badge--keen',
    promoTag: '$1 for 5 Minutes Intro Trial',
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * Branching quiz flow
 * ──────────────────────────────────────────────────────────────────────── */

/** Answer fields that depend on the area; cleared when the area changes. */
export const AREA_DEPENDENT_FIELDS: (keyof UserAnswers)[] = ['symptom', 'duration', 'feeling', 'hope', 'card'];

const STYLE_OPTIONS = [
  { id: 'style_direct', label: 'Straight to the point', sublabel: 'Honest, even when it’s hard to hear', value: 'direct' },
  { id: 'style_gentle', label: 'Gentle and kind', sublabel: 'Takes care with how things land', value: 'gentle' },
  { id: 'style_practical', label: 'Practical', sublabel: 'Clear next steps, not just predictions', value: 'practical' },
  { id: 'style_reflective', label: 'Deep and soulful', sublabel: 'Helps me understand the why, not just the what', value: 'reflective' },
  { id: 'style_fast', label: 'Quick and focused', sublabel: 'No padding; the most from every minute', value: 'fast_answers' },
];

function styleSubtitle(a: Partial<UserAnswers>): string {
  const tender = feelingsFor(a.area).find((f) => f.id === a.feeling)?.tender;
  if (tender) return 'Pick up to two. Given what you’re carrying, a lot of people in your place choose “Gentle and kind”, but go with your gut.';
  if (a.feeling === 'anxious' || a.feeling === 'confused') return 'Pick up to two. When your mind is racing, many people find a straight answer or practical steps the most settling.';
  return 'Pick up to two.';
}

/**
 * The quiz steps for the current answers. Re-evaluated on every render so
 * the branch follows the area answer; the step count only changes with the
 * area (grief skips the reading-method question).
 */
export function buildQuizSteps(a: Partial<UserAnswers>): QuizQuestion[] {
  const area = a.area ? AREA_BY_ID[a.area] : undefined;
  const isGrief = a.area === 'grief';
  const sitTotal = 5;
  const readerTotal = isGrief ? 2 : 3;
  const sit = (n: number) => `Your situation · ${n} of ${sitTotal}`;
  const rdr = (n: number) => `Your reader · ${n} of ${readerTotal}`;

  const steps: QuizQuestion[] = [
    {
      id: 'area', field: 'area', eyebrow: sit(1),
      title: 'What’s weighing on you most right now?',
      subtitle: 'Pick the one that’s been on your mind the most. Be as honest as you like; nothing here is tied to your name.',
      options: AREAS.map((x) => ({ id: `area_${x.id}`, label: x.label, sublabel: x.sublabel, value: x.id })),
    },
    {
      id: `symptom.${a.area || 'none'}`, field: 'symptom', eyebrow: sit(2),
      title: area?.situationTitle || 'What’s been happening?',
      subtitle: area?.situationSubtitle,
      options: (area?.situations || []).map((x) => ({ id: `sym_${x.id}`, label: x.label, sublabel: x.sublabel || undefined, value: x.id })),
    },
    isGrief
      ? {
          id: 'duration.grief', field: 'duration', eyebrow: sit(3),
          title: `When did you lose ${findSituation('grief', a.symptom)?.short || 'them'}?`,
          subtitle: 'There’s no timeline for grief. This just helps us be gentle in the right way.',
          options: GRIEF_DURATIONS.map((d) => ({ id: `dur_${d.id}`, label: d.label, value: d.id })),
        }
      : {
          id: 'duration', field: 'duration', eyebrow: sit(3),
          title: 'How long has this been on your mind?',
          options: DURATIONS.map((d) => ({ id: `dur_${d.id}`, label: d.label, value: d.id })),
        },
    {
      id: isGrief ? 'feeling.grief' : 'feeling', field: 'feeling', eyebrow: sit(4),
      title: isGrief ? 'How are you, honestly?' : 'Which is closest to how you feel right now?',
      subtitle: isGrief ? 'Whatever you’re feeling is allowed.' : 'Pick the one that’s most true today.',
      options: feelingsFor(a.area).map((f) => ({ id: `feel_${f.id}`, label: f.label, sublabel: f.sublabel || undefined, value: f.id })),
    },
    {
      id: `hope.${a.area || 'none'}`, field: 'hope', eyebrow: sit(5),
      title: isGrief ? 'If you could know one thing, what would it be?' : 'If a reading could tell you one thing, what would you most want to hear?',
      subtitle: 'Be honest with yourself. This is the question we’ll build your reading around.',
      options: (area?.hopes || []).map((h) => ({ id: `hope_${h}`, label: HOPES[h].label, value: h })),
    },
    {
      id: `card.${a.area || 'none'}`, field: 'card', kind: 'cards', eyebrow: 'Your card',
      reflection: reflectionLine(a),
      title: 'Draw a card for this',
      subtitle: 'Hold your question in mind, take a breath, and choose the card you’re drawn to.',
      options: (area?.deck || []).map((c) => ({ id: `card_${c.id}`, label: c.id, value: c.id })),
    },
    {
      id: 'preferredStyles', field: 'preferredStyles', eyebrow: rdr(1),
      title: 'How do you want a reader to talk to you?',
      subtitle: styleSubtitle(a),
      isMultiSelect: true, maxSelect: 2,
      options: STYLE_OPTIONS,
    },
  ];

  if (!isGrief) {
    steps.push({
      id: 'preferredPractice', field: 'preferredPractice', eyebrow: rdr(2),
      title: 'What kind of reading feels right?',
      subtitle: 'Not sure? Let us choose. We’ll pick what suits your situation.',
      options: [
        { id: 'prac_open', label: 'Whatever fits my situation best', sublabel: 'Recommended if you’re not sure', value: 'open' },
        { id: 'prac_psychic', label: 'A psychic reading', sublabel: 'Intuitive insight, often into what another person feels', value: 'psychic' },
        { id: 'prac_tarot', label: 'Tarot cards', sublabel: 'Cards that show the pattern and where it leads', value: 'tarot' },
        { id: 'prac_astrology', label: 'Astrology', sublabel: 'Your chart, timing, and compatibility', value: 'astrology' },
      ],
    });
  }

  steps.push({
    id: 'preferredFormat', field: 'preferredFormat', eyebrow: rdr(readerTotal),
    title: 'Where would you feel most comfortable talking?',
    options: [
      { id: 'fmt_chat', label: 'Chat', sublabel: 'Type privately, and keep the transcript to reread later', value: 'chat' },
      { id: 'fmt_phone', label: 'Phone', sublabel: 'Hear their voice; easier if you think out loud', value: 'phone' },
      { id: 'fmt_video', label: 'Video', sublabel: 'See them face to face (Purple Garden only)', value: 'video' },
      { id: 'fmt_open', label: 'Any is fine', sublabel: 'The widest choice of readers', value: 'no_preference' },
    ],
  });

  return steps;
}

const AREA_FALLBACK_INTENT: Record<string, Intent> = {
  love: 'love_relationship', dating: 'dating', breakup: 'breakup_ex', career: 'career_work',
  direction: 'decision_making', unsure: 'general_guidance', grief: 'grief_loss',
};

/** Turn raw quiz answers into the complete UserAnswers the engine scores. */
export function finalizeAnswers(a: Partial<UserAnswers>): UserAnswers {
  const sit = findSituation(a.area, a.symptom);
  const isGrief = a.area === 'grief';
  return {
    ...a,
    intent: sit?.intent || (a.area ? AREA_FALLBACK_INTENT[a.area] : 'general_guidance'),
    situationSubject: sit?.subject || 'not_sure',
    preferredPractice: isGrief ? 'medium' : (a.preferredPractice || 'open'),
    preferredFormat: a.preferredFormat || 'no_preference',
    preferredStyles: a.preferredStyles || [],
    urgency: 'no_rush',
    budget: 'no_pref',
  } as UserAnswers;
}
