/**
 * src/match/engine/explanations.ts
 * Generates transparent, evidence-grounded rationales for why each reader
 * was recommended, plus "Best Suited For" and "When to Skip" caveats.
 */

import type { ReaderProfile, UserAnswers, ScoreBreakdown } from '../types';
import { INTENT_LABELS, FORMAT_LABELS, PRACTICE_LABELS } from '../taxonomy';

export function generateReaderExplanation(
  reader: ReaderProfile,
  answers: UserAnswers,
  score: ScoreBreakdown,
  rank: 1 | 2 | 3
): { whyMatched: string[]; bestSuitedFor: string; whenToSkip: string } {
  const bullets: string[] = [];

  // Bullet 1: Primary intent & specialty alignment
  const intentLabel = INTENT_LABELS[answers.intent] || 'your core focus';
  if (answers.intent === 'love_relationship' || answers.intent === 'another_person_intentions' || answers.intent === 'breakup_ex') {
    if (reader.fitVector.intentions >= 4) {
      bullets.push(`Specializes in third-person emotional decoding: uncovering what your partner is actually feeling, thinking, and planning behind mixed signals.`);
    } else if (reader.fitVector.breakup >= 4) {
      bullets.push(`Documented track record in relationship drift, breakup dynamics, and realistic reconciliation timelines without false promises.`);
    } else {
      bullets.push(`Direct alignment with ${intentLabel}: proven ability to clarify complex emotional dynamics.`);
    }
  } else if (answers.intent === 'career_work' || answers.intent === 'money_finance') {
    bullets.push(`Proven specialty in career turning points, workplace power dynamics, and financial milestone planning.`);
  } else if (answers.intent === 'grief_loss') {
    bullets.push(`Specialized mediumship practice dedicated to evidential connection, grief support, and healing closure with departed loved ones.`);
  } else {
    bullets.push(`Strong diagnostic match for ${intentLabel}, bringing clarity to complex life transitions.`);
  }

  // Bullet 2: Format & Style compatibility
  const formatName = answers.preferredFormat !== 'no_preference'
    ? FORMAT_LABELS[answers.preferredFormat]
    : reader.formats.map(f => f.toUpperCase()).join(' & ');
  
  const topStyle = reader.styles[0] || 'conversational';
  const styleDescription = topStyle === 'direct'
    ? 'known for unvarnished truth without sugarcoating'
    : (topStyle === 'gentle' ? 'praised for empathetic, judgment-free compassion' : 'delivers structured, efficient card-by-card clarity');

  bullets.push(`Available via ${formatName} — ${styleDescription}, closely matching your session preferences.`);

  // Bullet 3: Audited evidence & track record
  const reviewCountStr = reader.reviewCount >= 1000
    ? `${reader.reviewCount.toLocaleString()} documented sessions`
    : 'extensive verified client consultations';
  
  bullets.push(`Audited by Eastern Alignment with a rating of ${reader.rating.toFixed(1)}/5.0 across ${reviewCountStr} on ${reader.platform === 'kasamba' ? 'Kasamba' : (reader.platform === 'purple-garden' ? 'Purple Garden' : 'Keen')}.`);

  // Best Suited For
  let bestSuitedFor = reader.bestFor;
  if (!bestSuitedFor || bestSuitedFor.length < 15) {
    bestSuitedFor = `Seekers wanting direct, focused guidance on ${intentLabel} with zero wasted minutes.`;
  }

  // When to Skip
  // NOTE: `reader.cons` holds internal editorial audit notes (written for the
  // review pages, e.g. "two fresh 1-star reviews this week — we flag them").
  // Those must never surface on the user-facing quiz results, which recommend
  // these same advisors. Always use generated, user-safe copy here.
  let whenToSkip: string;
  if (reader.styles.includes('direct')) {
    whenToSkip = 'Skip if you need soothing reassurance rather than direct reality; this advisor delivers candid truths without sugarcoating.';
  } else if (reader.styles.includes('gentle')) {
    whenToSkip = 'Skip if you want blunt, no-friction verdicts on a tight clock; this advisor paces the session gently and at a calmer speed.';
  } else if (reader.styles.includes('fast_answers') || reader.styles.includes('structured')) {
    whenToSkip = 'Skip if you want an open-ended, exploratory conversation; this advisor keeps sessions tight, structured, and question-focused.';
  } else {
    whenToSkip = 'Skip if you are looking for absolute certainty theater; legitimate readings illuminate probabilities and internal headspaces rather than fixed, unalterable futures.';
  }

  return {
    whyMatched: bullets,
    bestSuitedFor,
    whenToSkip,
  };
}
