import type { SessionAnswers, UserProfile, Domain, EmotionalState, RelationshipState, DesiredOutcome, TemporalOrientation, Urgency, SpiritualOrientation, WeightedTag } from './types';
import { QUIZ_QUESTIONS, getBranchedOptions } from './questions';

export const aggregateScores = (answers: SessionAnswers): Record<string, number> => {
  const scores: Record<string, number> = {};

  const addWeights = (weights: WeightedTag) => {
    for (const [key, val] of Object.entries(weights)) {
      scores[key] = (scores[key] || 0) + val;
    }
  };

  const q1Branch = answers['q1'] as string;

  for (const q of QUIZ_QUESTIONS) {
    const ans = answers[q.id];
    if (!ans) continue;

    if (q.type === 'freetext') continue;

    const optionsToSearch = q.branchFrom ? getBranchedOptions(q.optionSets || {}, q1Branch) : (q.options || []);

    if (Array.isArray(ans)) {
      for (const a of ans) {
        const opt = optionsToSearch.find(o => o.id === a);
        if (opt && opt.weights) addWeights(opt.weights);
      }
    } else {
      const opt = optionsToSearch.find(o => o.id === ans);
      if (opt && opt.weights) addWeights(opt.weights);
    }
  }

  return scores;
};

export const normalizeScores = (raw: Record<string, number>): Record<string, number> => {
  const maxScore = Math.max(...Object.values(raw), 1);
  const normalized: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[k] = Math.round((v / maxScore) * 100);
  }
  return normalized;
};

const domains: Domain[] = ['love', 'breakup', 'relationships', 'money', 'career', 'family', 'spirituality', 'future', 'self_growth', 'protection'];
const emotions: EmotionalState[] = ['curiosity', 'hope', 'anxiety', 'fear', 'confusion', 'grief', 'excitement', 'loneliness', 'frustration', 'anticipation', 'uncertainty', 'sadness'];
const outcomes: DesiredOutcome[] = ['clarity', 'reassurance', 'prediction', 'closure', 'action', 'validation', 'connection', 'control'];

export const buildProfile = (answers: SessionAnswers): UserProfile => {
  const rawScores = aggregateScores(answers);
  const normalizedScores = normalizeScores(rawScores);

  const getTop = (keys: string[], limit: number = 1, threshold: number = 0) => {
    const sorted = keys
      .filter(k => (rawScores[k] || 0) >= threshold)
      .sort((a, b) => (rawScores[b] || 0) - (rawScores[a] || 0));
    return sorted.slice(0, limit);
  };

  const topDomains = getTop(domains, 2) as Domain[];
  const primary_domain = topDomains[0] || 'future';
  const secondary_domain = topDomains[1];

  const emotional_states = getTop(emotions, 3, 15) as EmotionalState[];
  
  const relKeys = ['relationship_single', 'relationship_talking', 'relationship_dating', 'relationship_relationship', 'relationship_recently_separated', 'relationship_no_contact', 'relationship_complicated', 'relationship_thinking_about_someone'];
  const topRel = getTop(relKeys, 1)[0];
  const relationship_state = topRel ? topRel.replace('relationship_', '') as RelationshipState : undefined;

  const outKeys = outcomes.map(o => `outcome_${o}`);
  const topOutcomes = getTop(outKeys, 2).map(o => o.replace('outcome_', '')) as DesiredOutcome[];

  const timeKeys = ['past', 'present', 'future'];
  const temporal_orientation = (getTop(timeKeys, 1)[0] as TemporalOrientation) || 'present';

  const urgKeys = ['urgency_high', 'urgency_medium', 'urgency_low'];
  const topUrg = getTop(urgKeys, 1)[0];
  const urgency = topUrg ? topUrg.replace('urgency_', '') as Urgency : 'medium';

  const spirKeys = ['spirituality_curious', 'spirituality_open', 'spirituality_experienced', 'spirituality_skeptical'];
  const topSpir = getTop(spirKeys, 1)[0];
  let spiritual_orientation: SpiritualOrientation = 'open';
  if (topSpir) spiritual_orientation = topSpir.replace('spirituality_', '') as SpiritualOrientation;
  else if (rawScores['spirituality'] > 20) spiritual_orientation = 'spiritual';

  const loss_or_change = answers['q2'] as string; // simple mapping
  const freeTextAnswer = answers['q7'] as string;

  return {
    primary_domain,
    secondary_domain,
    emotional_states,
    relationship_state,
    desired_outcomes: topOutcomes.length ? topOutcomes : ['clarity'],
    temporal_orientation,
    urgency,
    spiritual_orientation,
    loss_or_change,
    freeTextAnswer,
    rawScores,
    normalizedScores,
    createdAt: new Date().toISOString(),
    sessionId: Math.random().toString(36).substring(2, 15)
  };
};
