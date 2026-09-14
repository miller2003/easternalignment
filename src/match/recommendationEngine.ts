/**
 * recommendationEngine.ts - Unified recommendation engine
 */
import type {
  UserProfile, ArticleMetadata, ReaderMatchMetadata, RecommendationResult, NarrativeBlock, Domain
} from './types';
import { NARRATIVE_BLOCKS, getFallbackNarrative } from './content/narrativeBlocks';
import { classifyArticle, GUIDE_SLUGS } from './content/articleClassifier';

// Configurable weights (content team can adjust without UI changes)
const ARTICLE_WEIGHTS = {
  primary_domain: 3,
  secondary_domain: 2,
  emotional_state: 2,
  relationship_state: 3,
  desired_outcome: 2,
  temporal_orientation: 1,
  commercial_high_bonus: 2,
  commercial_medium_bonus: 1,
} as const;

const READER_WEIGHTS = {
  specialty_match: 3,
  relationship_state_match: 3,
  secondary_domain: 2,
  rating_bonus: 1,
  availability_bonus: 2,
} as const;

export function scoreArticle(profile: UserProfile, article: ArticleMetadata): number {
  let score = 0;
  if (article.primary_domain === profile.primary_domain) score += ARTICLE_WEIGHTS.primary_domain;
  if (profile.secondary_domain && article.primary_domain === profile.secondary_domain) score += ARTICLE_WEIGHTS.secondary_domain;
  if (profile.secondary_domain && article.secondary_topics.includes(profile.secondary_domain)) score += 1;
  for (const e of profile.emotional_states) {
    if (article.emotional_states.includes(e)) score += ARTICLE_WEIGHTS.emotional_state;
  }
  if (profile.relationship_state && article.relationship_states.includes(profile.relationship_state)) score += ARTICLE_WEIGHTS.relationship_state;
  for (const o of profile.desired_outcomes) {
    if (article.desired_outcomes.includes(o)) score += ARTICLE_WEIGHTS.desired_outcome;
  }
  if (article.temporal_orientation.includes(profile.temporal_orientation)) score += ARTICLE_WEIGHTS.temporal_orientation;
  if (article.commercial_intent === 'high') score += ARTICLE_WEIGHTS.commercial_high_bonus;
  else if (article.commercial_intent === 'medium') score += ARTICLE_WEIGHTS.commercial_medium_bonus;
  return score;
}

export function scoreReader(profile: UserProfile, reader: ReaderMatchMetadata): number {
  if (!reader.availability) return 0;
  let score = 0;
  if (reader.specialties.includes(profile.primary_domain)) score += READER_WEIGHTS.specialty_match;
  if (profile.secondary_domain && reader.specialties.includes(profile.secondary_domain)) score += READER_WEIGHTS.secondary_domain;
  if (profile.relationship_state && reader.relationship_states.includes(profile.relationship_state)) score += READER_WEIGHTS.relationship_state_match;
  // Rating bonus: 4.0-5.0 normalized to 0-1
  score += Math.max(0, (reader.rating - 4.0)) * READER_WEIGHTS.rating_bonus;
  score += READER_WEIGHTS.availability_bonus;
  return score;
}

export function selectNarrative(profile: UserProfile): NarrativeBlock {
  if (profile.relationship_state) {
    const key = profile.primary_domain + '__' + profile.relationship_state;
    const block = NARRATIVE_BLOCKS.find(b => b.key === key);
    if (block) return block;
  }
  const primaryEmotion = profile.emotional_states[0];
  if (primaryEmotion) {
    const key = profile.primary_domain + '__' + primaryEmotion;
    const block = NARRATIVE_BLOCKS.find(b => b.key === key);
    if (block) return block;
  }
  const block = NARRATIVE_BLOCKS.find(b => b.key === profile.primary_domain);
  if (block) return block;
  return getFallbackNarrative(profile);
}

function recommendedEmailTopic(profile: UserProfile): string {
  const map: Partial<Record<Domain, string>> = {
    love: 'Your weekly love & relationship reading',
    breakup: 'Your weekly healing & clarity reading',
    relationships: 'Your weekly relationship reading',
    career: 'Your weekly career & abundance reading',
    money: 'Your weekly financial clarity reading',
    spirituality: 'Your weekly spiritual message',
    future: 'Your weekly guidance reading',
    family: 'Your weekly family energy reading',
    protection: 'Your weekly protection & clearing reading',
    self_growth: 'Your weekly growth & direction reading',
  };
  return map[profile.primary_domain] ?? 'Your weekly spiritual reading';
}

export function getRecommendations(
  profile: UserProfile,
  allReaders: ReaderMatchMetadata[],
): RecommendationResult {
  const articles = GUIDE_SLUGS.map(slug => classifyArticle(slug));
  const scoredArticles = articles
    .map(a => ({ a, s: scoreArticle(profile, a) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map(x => x.a);

  const scoredReaders = allReaders
    .filter(r => r.availability)
    .map(r => ({ r, s: scoreReader(profile, r) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map(x => ({ ...x.r, matchScore: Math.round(x.s * 10) }));

  return {
    recommended_readers: scoredReaders,
    recommended_articles: scoredArticles,
    recommended_email_topic: recommendedEmailTopic(profile),
    narrative: selectNarrative(profile),
  };
}
