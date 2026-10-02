/**
 * src/match/engine/diagnostics.ts
 * Builds the personalised reading from the quiz answers.
 *
 * Composition (see src/match/reading.ts for the content rules):
 *   mirror     = duration lead + situation mirror + duration tail
 *   reflection = feeling validation + the area's two-sided line
 *   underneath = the hidden question behind their stated hope
 *   card, mechanism, what they already know, what a reading can help with,
 *   opening question + follow-up, and care notes where the answers call for them.
 *
 * Callers without the situation-depth answers (the MCP / NL tools) get a
 * representative situation for their intent, so the opening question stays
 * specific and on-topic.
 */

import type { UserAnswers, DiagnosticDossier, Intent, Area } from '../types';
import {
  AREA_BY_ID, DURATIONS, GRIEF_DURATIONS, HOPES, findSituation, findFeeling, cardFor, cap,
  CARE_CRISIS, CARE_GRIEF_RECENT, CARE_GRIEF_HONESTY, CARE_BREAKUP, CARE_MONEY,
} from '../reading';

const SCAM_WARNING = 'Never pay for “curse removal”, “energy cleansing” or candle rituals. A genuine reader offers insight and perspective, not fear followed by an upsell.';

/** Representative situation per intent, for callers that only know the intent. */
const INTENT_FALLBACK: Record<Intent, [Area, string]> = {
  love_relationship: ['love', 'their_feelings'],
  another_person_intentions: ['love', 'their_feelings'],
  breakup_ex: ['breakup', 'no_contact'],
  dating: ['dating', 'mixed_signals'],
  career_work: ['career', 'offer'],
  money_finance: ['career', 'money_move'],
  decision_making: ['direction', 'two_paths'],
  future_direction: ['direction', 'timing'],
  grief_loss: ['grief', 'parent'],
  self_reflection: ['direction', 'lost'],
  general_guidance: ['unsure', 'curious'],
};

const GUIDE_SLUGS: Record<Area, string[]> = {
  love: ['questions-to-ask-a-psychic', 'karmic-relationships-signs-and-lessons'],
  dating: ['questions-to-ask-a-psychic', 'how-to-choose-a-psychic-reader'],
  breakup: ['signs-your-ex-is-coming-back', 'no-contact-psychic-readings-guide'],
  career: ['how-much-does-a-psychic-reading-cost', 'how-to-choose-a-psychic-reader'],
  direction: ['what-is-psychic-reading', 'how-to-choose-a-psychic-reader'],
  unsure: ['what-is-psychic-reading', 'how-to-choose-a-psychic-reader'],
  grief: ['what-is-psychic-reading', 'questions-to-ask-a-psychic'],
};

export function generateDiagnosis(answers: UserAnswers): DiagnosticDossier {
  let area = answers.area;
  let sit = findSituation(area, answers.symptom);
  const personalised = !!sit;
  if (!sit) {
    const [fa, fs] = INTENT_FALLBACK[answers.intent] || INTENT_FALLBACK.general_guidance;
    area = fa;
    sit = findSituation(fa, fs)!;
  }
  const areaDef = AREA_BY_ID[area!];
  const isGrief = area === 'grief';

  const feel = findFeeling(area, answers.feeling);
  const hope = answers.hope ? HOPES[answers.hope] : undefined;
  const dur = isGrief
    ? GRIEF_DURATIONS.find((d) => d.id === answers.duration)
    : DURATIONS.find((d) => d.id === answers.duration);

  // Paragraph 1: the mirror. Only what they told us, in lived-in detail.
  let situationSummary: string;
  if (isGrief) {
    situationSummary = [sit.mirror, dur?.tail].filter(Boolean).join(' ');
  } else if (dur) {
    situationSummary = `${dur.lead} ${sit.mirror} ${dur.tail}`;
  } else {
    situationSummary = cap(sit.mirror);
  }

  // Paragraph 2: validate the feeling, then the two-sided reflection.
  // In crisis, care comes first, so the two-sided line is left out.
  const feelingReflection = personalised
    ? [feel?.validation, feel?.crisis ? '' : areaDef.twoSided].filter(Boolean).join(' ')
    : undefined;

  const whatIsClear = [...sit.known];
  if (dur) whatIsClear.push(dur.known);

  const careNotes: string[] = [];
  if (feel?.crisis) careNotes.push(CARE_CRISIS);
  if (isGrief && answers.duration === 'recent') careNotes.push(CARE_GRIEF_RECENT);
  if (isGrief) careNotes.push(CARE_GRIEF_HONESTY);
  if (area === 'breakup' && (answers.hope === 'come_back' || answers.hope === 'miss_me' || answers.hope === 'reach_out')) careNotes.push(CARE_BREAKUP);
  if (sit.id === 'money_move' || sit.id === 'money_pressure') careNotes.push(CARE_MONEY);

  return {
    coreDynamicTitle: sit.headline,
    situationSummary,
    feelingReflection,
    hiddenQuestion: hope?.hidden,
    card: cardFor(area, answers.card),
    careNotes,
    underlyingMechanism: sit.mechanism,
    whatIsClear,
    whatIsUnresolved: sit.helps,
    recommendedOpeningQuestion: sit.ask,
    recommendedFollowUp: hope?.followUp,
    scamWarning: SCAM_WARNING,
    suggestedGuideSlugs: GUIDE_SLUGS[area!],
  };
}
