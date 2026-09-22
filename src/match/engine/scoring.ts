/**
 * src/match/engine/scoring.ts
 * Deterministic 100-point scoring algorithm for Eastern Alignment Reader Match.
 *
 * Scoring breakdown:
 *   - Intent Match: 35 pts
 *   - Practice Match: 20 pts
 *   - Question-Type Match: 15 pts
 *   - Communication Fit: 10 pts
 *   - Style Fit: 8 pts
 *   - Budget Fit: 7 pts
 *   - Availability: 5 pts
 *   Total: 100 pts
 */

import type { ReaderProfile, UserAnswers, ScoreBreakdown } from '../types';

export function scoreReader(reader: ReaderProfile, answers: UserAnswers): ScoreBreakdown {
  let isEligible = true;
  let ineligibilityReason: string | undefined;

  // Hard filter: Inactive readers
  if (!reader.active) {
    return {
      intentScore: 0,
      practiceScore: 0,
      questionTypeScore: 0,
      communicationScore: 0,
      styleScore: 0,
      budgetScore: 0,
      availabilityModifier: 0,
      totalScore: 0,
      isEligible: false,
      ineligibilityReason: 'Advisor currently inactive on platform.',
    };
  }

  // Hard filter: Strict format mismatch
  if (answers.preferredFormat !== 'no_preference') {
    if (!reader.formats.includes(answers.preferredFormat as 'chat' | 'phone' | 'video')) {
      isEligible = false;
      ineligibilityReason = `Advisor does not support requested format: ${answers.preferredFormat}`;
    }
  }

  // 1. Intent Match (Max 35)
  let rawIntentScore = 3;
  const fv = reader.fitVector;

  switch (answers.intent) {
    case 'love_relationship':
      rawIntentScore = fv.love ?? 3;
      break;
    case 'another_person_intentions':
      rawIntentScore = fv.intentions ?? fv.love ?? 3;
      break;
    case 'breakup_ex':
      rawIntentScore = fv.breakup ?? fv.love ?? 3;
      break;
    case 'dating':
      rawIntentScore = fv.dating ?? fv.love ?? 3;
      break;
    case 'career_work':
      rawIntentScore = fv.career ?? 2;
      break;
    case 'money_finance':
      rawIntentScore = fv.money ?? fv.career ?? 2;
      break;
    case 'decision_making':
      rawIntentScore = Math.max(fv.future ?? 3, fv.selfReflection ?? 3, 3);
      break;
    case 'future_direction':
      rawIntentScore = fv.future ?? 3;
      break;
    case 'grief_loss':
      rawIntentScore = fv.grief ?? (reader.primaryPractice === 'medium' ? 5 : (reader.practices.includes('medium') ? 4 : 1));
      break;
    case 'self_reflection':
      rawIntentScore = fv.selfReflection ?? 3;
      break;
    case 'general_guidance':
    default:
      rawIntentScore = fv.general ?? 3;
      break;
  }

  const intentScore = Math.round((Math.max(0, Math.min(5, rawIntentScore)) / 5) * 35);

  // 2. Practice Match (Max 20)
  let practiceScore = 14; // Default neutral baseline
  if (answers.preferredPractice !== 'open') {
    if (reader.primaryPractice === answers.preferredPractice) {
      practiceScore = 20;
    } else if (reader.practices.includes(answers.preferredPractice)) {
      practiceScore = 16;
    } else {
      // Modality mismatch: mediumship is strict; psychic and tarot have reasonable overlap
      if (answers.preferredPractice === 'medium') {
        practiceScore = 2; // Mediumship cannot be substituted by general tarot
      } else if (answers.preferredPractice === 'astrology') {
        practiceScore = 7;
      } else {
        practiceScore = 10;
      }
    }
  } else {
    // User is open: award practice score based on intent synergy
    if (answers.intent === 'grief_loss') {
      practiceScore = reader.primaryPractice === 'medium' ? 20 : (reader.practices.includes('medium') ? 16 : 8);
    } else if (answers.intent === 'future_direction' || answers.intent === 'decision_making') {
      practiceScore = (reader.practices.includes('psychic') || reader.practices.includes('tarot')) ? 19 : 15;
    } else {
      practiceScore = 18;
    }
  }

  // 3. Question-Type Match (Max 15)
  let questionTypeScore = 10;
  const qTypes = reader.questionTypes || [];

  switch (answers.situationSubject) {
    case 'another_person':
      if (qTypes.includes('another_person_intentions') || qTypes.includes('does_someone_have_feelings')) {
        questionTypeScore = 15;
      } else if (qTypes.includes('relationship_clarity')) {
        questionTypeScore = 12;
      } else {
        questionTypeScore = 7;
      }
      break;
    case 'relationship_dynamic':
      if (qTypes.includes('relationship_clarity') || qTypes.includes('relationship_direction')) {
        questionTypeScore = 15;
      } else {
        questionTypeScore = 11;
      }
      break;
    case 'myself':
      if (qTypes.includes('self_understanding') || qTypes.includes('emotional_reflection') || qTypes.includes('career_decision')) {
        questionTypeScore = 15;
      } else {
        questionTypeScore = 11;
      }
      break;
    case 'future_event':
      if (qTypes.includes('future_outlook') || qTypes.includes('timing')) {
        questionTypeScore = 15;
      } else {
        questionTypeScore = 10;
      }
      break;
    case 'past_closure':
      if (qTypes.includes('breakup_closure') || qTypes.includes('reconciliation')) {
        questionTypeScore = 15;
      } else {
        questionTypeScore = 10;
      }
      break;
    case 'not_sure':
    default:
      questionTypeScore = 12;
      break;
  }

  // 4. Communication Fit (Max 10)
  let communicationScore = 10;
  if (answers.preferredFormat !== 'no_preference') {
    if (reader.formats.includes(answers.preferredFormat as 'chat' | 'phone' | 'video')) {
      communicationScore = 10;
    } else {
      communicationScore = 0;
    }
  }

  // 5. Style Fit (Max 8)
  let styleScore = 4; // Baseline
  if (answers.preferredStyles && answers.preferredStyles.length > 0) {
    let matchedStyles = 0;
    for (const st of answers.preferredStyles) {
      if (reader.styles.includes(st)) matchedStyles++;
    }
    if (matchedStyles >= 2) styleScore = 8;
    else if (matchedStyles === 1) styleScore = 6;
    else styleScore = 3;
  }

  // 6. Budget Fit (Max 7)
  let budgetScore = 5;
  const rate = reader.pricePerMinute || 3.99;

  switch (answers.budget) {
    case 'under_20':
      // Under $20 favors introductory trials (Kasamba 3 free mins, Keen $1 trial, Purple Garden $30 credit)
      if (rate <= 4.99) budgetScore = 7;
      else if (rate <= 8.99) budgetScore = 6;
      else budgetScore = 4; // High minute rate, but still has free trial
      break;
    case '20_to_50':
      // Mid-range: best fits readers $3.00 - $8.00/min
      if (rate >= 3.0 && rate <= 7.99) budgetScore = 7;
      else if (rate < 3.0) budgetScore = 6;
      else budgetScore = 5;
      break;
    case '50_plus':
      // Comprehensive: favors elite & high-evidence readers
      if (rate >= 8.0) budgetScore = 7;
      else budgetScore = 6;
      break;
    case 'no_pref':
    default:
      budgetScore = 6;
      break;
  }

  // 7. Availability Modifier (Max 5)
  let availabilityModifier = 3; // Default unknown baseline
  const status = reader.availability?.status || 'unknown';

  if (status === 'available') {
    availabilityModifier = answers.urgency === 'right_now' ? 5 : 4;
  } else if (status === 'busy') {
    availabilityModifier = answers.urgency === 'right_now' ? 2 : 3;
  } else if (status === 'offline') {
    availabilityModifier = answers.urgency === 'right_now' ? 0 : 2;
  } else {
    availabilityModifier = 3;
  }

  const totalScore = isEligible
    ? Math.min(100, intentScore + practiceScore + questionTypeScore + communicationScore + styleScore + budgetScore + availabilityModifier)
    : 0;

  return {
    intentScore,
    practiceScore,
    questionTypeScore,
    communicationScore,
    styleScore,
    budgetScore,
    availabilityModifier,
    totalScore,
    isEligible,
    ineligibilityReason,
  };
}
