/**
 * src/match/engine/explanations.ts
 * Generates the "why this reader" rationale, plus "Best for" and "When to
 * skip" caveats, tied to the user's own answers.
 *
 * Rule: never describe a reader in a way that contradicts what the user
 * asked for. The style line and the skip caveat both start from the styles
 * the user picked; when a reader doesn't share them, we say so plainly.
 */

import type { ReaderProfile, UserAnswers, ScoreBreakdown, ReadingStyle, Intent } from '../types';
import { AREA_BY_ID, findSituation, findFeeling } from '../reading';

const PLATFORM_NAME: Record<string, string> = { kasamba: 'Kasamba', 'purple-garden': 'Purple Garden', keen: 'Keen' };

const STYLE_WORDS: Record<ReadingStyle, string> = {
  direct: 'straight-to-the-point',
  gentle: 'gentle',
  fast_answers: 'quick, focused',
  practical: 'practical',
  detailed: 'detailed',
  conversational: 'warm, conversational',
  reflective: 'deep, reflective',
  structured: 'structured',
};

const STYLE_SKIP: Record<ReadingStyle, string> = {
  direct: 'Skip if you’d rather be eased in slowly. They tend to get straight to the point.',
  gentle: 'Skip if you want a fast yes-or-no. They take a moment to set a calm pace first.',
  fast_answers: 'Skip if you want a long, exploratory conversation. They keep sessions tight.',
  practical: 'Skip if you want a mystical, symbolic reading. They focus on what to do next.',
  detailed: 'Skip if you only have a few minutes. They like to go deep.',
  conversational: 'Skip if you want a structured card-by-card session. They read in a flowing conversation.',
  reflective: 'Skip if you just want a quick prediction. They’ll gently turn the question back toward you.',
  structured: 'Skip if you want a loose, chatty session. They work methodically through the cards.',
};

/** Styles whose skip caveat would contradict a style the user asked for. */
const STYLE_CONFLICTS: Partial<Record<ReadingStyle, ReadingStyle[]>> = {
  gentle: ['direct', 'fast_answers'],
  direct: ['gentle'],
  fast_answers: ['gentle', 'detailed', 'reflective', 'conversational'],
  practical: ['reflective'],
  reflective: ['practical', 'fast_answers'],
};

const INTENT_TOPIC: Record<Intent, string> = {
  love_relationship: 'relationship questions',
  another_person_intentions: 'reading what another person feels',
  breakup_ex: 'breakups and reconciliation',
  dating: 'new and undefined connections',
  career_work: 'career questions',
  money_finance: 'money questions',
  decision_making: 'decisions and crossroads',
  future_direction: 'timing and what’s ahead',
  grief_loss: 'mediumship and grief',
  self_reflection: 'personal patterns and direction',
  general_guidance: 'general guidance',
};

/** Same fit dimension the scorer uses for this intent. */
function intentStrength(reader: ReaderProfile, intent: Intent): number {
  const fv = reader.fitVector;
  switch (intent) {
    case 'love_relationship': return fv.love ?? 3;
    case 'another_person_intentions': return fv.intentions ?? fv.love ?? 3;
    case 'breakup_ex': return fv.breakup ?? fv.love ?? 3;
    case 'dating': return fv.dating ?? fv.love ?? 3;
    case 'career_work': return fv.career ?? 2;
    case 'money_finance': return fv.money ?? fv.career ?? 2;
    case 'decision_making': return Math.max(fv.future ?? 3, fv.selfReflection ?? 3);
    case 'future_direction': return fv.future ?? 3;
    case 'grief_loss': return fv.grief ?? (reader.primaryPractice === 'medium' ? 5 : reader.practices.includes('medium') ? 4 : 1);
    case 'self_reflection': return fv.selfReflection ?? 3;
    default: return fv.general ?? 3;
  }
}

export function generateReaderExplanation(
  reader: ReaderProfile,
  answers: UserAnswers,
  _score: ScoreBreakdown,
  rank: 1 | 2 | 3
): { whyMatched: string[]; bestSuitedFor: string; whenToSkip: string } {
  const bullets: string[] = [];
  const topic = INTENT_TOPIC[answers.intent] || 'your question';
  const sit = findSituation(answers.area, answers.symptom);
  const forWhat = sit ? `, which is exactly what ${sit.short} calls for` : '';

  // 1. Situation fit, from the same fit vector the score uses
  const strength = intentStrength(reader, answers.intent);
  if (answers.intent === 'grief_loss') {
    bullets.push(reader.primaryPractice !== 'medium'
      ? 'Offers mediumship alongside other work, with a steady track record for grief questions.'
      : rank === 1
        ? 'A dedicated medium: their readings centre on evidential detail and comfort, not general fortune-telling.'
        : rank === 2
          ? 'Also a dedicated medium, with a different voice and pace from #1.'
          : 'Another dedicated medium, so you can try two or three in the free minutes and stay with the one who feels like them.');
  } else if (strength >= 5) {
    bullets.push(rank === 1
      ? `One of the strongest readers in our notes for ${topic}${forWhat}.`
      : rank === 2
        ? `Rated top-tier for ${topic} in our notes, with a different way of reading than #1.`
        : `Also top-tier for ${topic}, so you can compare two or three readers in your free minutes.`);
  } else if (strength >= 4) {
    bullets.push(`Strong on ${topic}${rank === 1 ? forWhat : ''}.`);
  } else {
    bullets.push(`A broad, well-rated reader. ${topic.charAt(0).toUpperCase() + topic.slice(1)} isn’t their single specialty, but they cover it.`);
  }

  // 2. Style + format, starting from what the user asked for
  const wanted = answers.preferredStyles || [];
  const shared = wanted.filter((s) => reader.styles.includes(s));
  const formats = answers.preferredFormat !== 'no_preference'
    ? answers.preferredFormat
    : reader.formats.join(' and ').replace(/ and (?=.* and )/, ', ');
  const tender = findFeeling(answers.area, answers.feeling)?.tender;
  if (shared.length) {
    const words = shared.map((s) => STYLE_WORDS[s]).join(' and ');
    const care = tender && shared.includes('gentle') ? ', which matters with what you’re carrying' : '';
    bullets.push(`Reads in the ${words} style you asked for${care}. Available by ${formats}.`);
  } else if (wanted.length) {
    bullets.push(`Their style leans ${STYLE_WORDS[reader.styles[0] || 'conversational']} rather than what you picked; worth knowing going in. Available by ${formats}.`);
  } else {
    bullets.push(`Available by ${formats}.`);
  }

  // 3. Track record: the reader's own top highlight from our review when we
  // have one (unique per reader), otherwise rating and volume
  const highlight = (reader.highlights || [])[0];
  if (highlight && highlight.length <= 160) {
    bullets.push(`From our review: ${highlight.replace(/\.$/, '')}.`);
  } else {
    const volume = reader.reviewCount >= 1000 ? `${reader.reviewCount.toLocaleString()} readings` : 'a solid base of client reviews';
    bullets.push(`${reader.rating.toFixed(1)}/5 across ${volume} on ${PLATFORM_NAME[reader.platform] || reader.platform}.`);
  }

  // Best For: our editorial note on the reader
  let bestSuitedFor = reader.bestFor;
  if (!bestSuitedFor || bestSuitedFor.length < 15) {
    bestSuitedFor = `People who want focused guidance on ${topic}.`;
  }

  // When to Skip
  // NOTE: `reader.cons` holds internal editorial audit notes (written for the
  // review pages, e.g. "two fresh 1-star reviews this week — we flag them").
  // Those must never surface on the user-facing quiz results, which recommend
  // these same advisors. Always use generated, user-safe copy here.
  // The caveat describes a real trait of the reader that never contradicts
  // the styles the user asked for; ranks rotate through the candidates so
  // the three cards don't all say the same thing.
  const candidates = [...shared, ...reader.styles.filter((s) => !shared.includes(s))]
    .filter((s) => !wanted.some((w) => STYLE_CONFLICTS[w]?.includes(s)));
  const skipStyle: ReadingStyle | undefined = candidates.length ? candidates[(rank - 1) % candidates.length] : undefined;
  const whenToSkip = skipStyle
    ? STYLE_SKIP[skipStyle]
    : 'Skip if you want certainty. A genuine reading shows likelihoods and choices, not a fixed future.';

  return { whyMatched: bullets, bestSuitedFor, whenToSkip };
}

/** Area label for UI copy ("Three readers for {topic}"). */
export function areaTopic(answers: UserAnswers): string {
  return (answers.area && AREA_BY_ID[answers.area]?.topic) || INTENT_TOPIC[answers.intent] || 'your situation';
}
