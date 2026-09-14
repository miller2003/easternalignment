import type { Domain, EmotionalState, RelationshipState, DesiredOutcome, TemporalOrientation, CommercialIntent, ArticleMetadata } from '../types';

export const GUIDE_SLUGS: string[] = [
  'age-gap-relationship-psychics', 'ai-psychic-readings-vs-human', 'am-i-psychic-signs-and-tests',
  'angel-numbers-1111-222-333-meaning-guide', 'are-psychics-real', 'aura-reading-meaning-colors',
  'avoidant-attachment-psychic-readings', 'before-you-pay-for-a-psychic-reading', 'best-kasamba-psychics-2026',
  'best-kasamba-psychics-career-money', 'best-kasamba-psychics-ex-recovery', 'best-kasamba-psychics-first-reading',
  'best-keen-psychics-2026', 'best-lgbtq-psychics-online', 'best-love-psychics-kasamba-ranked',
  'best-love-psychics-keen-ex-recovery', 'best-love-psychics-purple-garden', 'best-mediums-on-kasamba',
  'best-mediums-on-purple-garden', 'best-psychic-hotlines-2026', 'best-psychics-for-breakups',
  'best-purple-garden-psychics-2026', 'best-purple-garden-psychics-career-money', 'best-purple-garden-psychics-ex-recovery',
  'best-purple-garden-psychics-first-reading', 'best-soulmate-psychics-online', 'best-tarot-readers-for-love',
  'best-tarot-readers-on-kasamba', 'best-twin-flame-psychics-online', 'best-video-psychics-purple-garden',
  'brutally-honest-psychics-kasamba', 'brutally-honest-psychics-keen', 'brutally-honest-psychics-purple-garden',
  'can-psychic-predict-marriage', 'career-and-money-psychic-readings', 'chat-vs-phone-vs-video-psychic-reading',
  'cheap-love-psychics-online', 'choose-the-right-psychic-reader-for-you', 'clairs-the-four-psychic-abilities-guide',
  'divorce-breakup-psychics-online', 'does-he-like-me-psychics', 'dreaming-about-ex-psychic-meaning',
  'evidential-mediums-passed-spouse', 'financial-motives-psychics', 'first-psychic-reading-guide',
  'free-psychic-readings-online-truth', 'healing-after-heartbreak-spiritual-guide', 'how-much-does-a-psychic-reading-cost',
  'how-often-psychic-reading', 'how-to-choose-a-psychic-reader', 'how-to-pick-a-psychic-reader',
  'how-to-prepare-for-psychic-reading', 'how-to-spot-fake-psychic', 'how-to-tell-if-an-online-psychic-is-legitimate',
  'is-he-the-one-psychic-indicators', 'is-purple-garden-legit', 'karmic-relationships-signs-and-lessons',
  'kasamba-3-free-minutes-guide', 'kasamba-love-readings-review', 'kasamba-no-contact-love-reading',
  'kasamba-specific-person-reading', 'kasamba-twin-flame-reading', 'keen-ldr-timelines-close-the-gap',
  'keen-love-psychics-review', 'keen-twin-flame-reading', 'long-distance-relationship-psychics',
  'love-after-loss-mediums', 'love-or-career-psychics', 'love-triangles-psychics', 'most-accurate-love-psychics',
  'most-accurate-psychics-kasamba', 'most-accurate-psychics-keen', 'most-accurate-psychics-purple-garden',
  'no-contact-psychic-readings-guide', 'online-dating-psychics', 'other-woman-psychic-readings',
  'palm-reading-beginners-guide', 'past-life-connections-psychic-readings', 'pet-psychic-readings-online',
  'pregnancy-psychic-readings-guide', 'psychic-prediction-didnt-come-true', 'psychic-reading-prices',
  'psychic-reading-vs-therapy', 'psychic-readings-for-anxiety', 'psychic-vs-medium-vs-tarot-reader',
  'psychic-vs-tarot-vs-astrology', 'purple-garden-30-credit-guide', 'purple-garden-journeys-guide',
  'purple-garden-love-readings-review', 'purple-garden-twin-flame-readings', 'questions-to-ask-a-psychic',
  'real-marriage-psychics', 'should-you-pay-for-a-psychic-reading', 'signs-spiritual-connection-with-someone',
  'signs-your-ex-is-coming-back', 'single-parent-psychics', 'situationship-psychic-readings',
  'spiritual-awakening-signs-guide', 'tarot-card-meanings-beginners-guide', 'tarot-for-love-practical-guide',
  'third-party-psychic-readings-jealousy', 'top-love-psychics-kasamba', 'top-love-psychics-keen',
  'top-love-psychics-online', 'top-love-psychics-purple-garden', 'twin-flame-vs-soulmate-difference',
  'what-is-psychic-reading', 'what-to-expect-from-your-first-psychic-reading', 'when-will-i-get-married-psychics',
  'will-he-propose-psychics', 'win-her-back-psychics', 'zodiac-compatibility-psychic-readings'
];

function slugToTitle(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function classifyArticle(slug: string): ArticleMetadata {
  const s = slug.toLowerCase();

  // Primary domain
  let primary_domain: Domain = 'love';
  if (/career|money|financial|abundance/.test(s)) primary_domain = 'career';
  else if (/money|financial/.test(s)) primary_domain = 'money';
  else if (/single-parent|pregnancy/.test(s)) primary_domain = 'family';
  else if (/third-party|jealousy/.test(s)) primary_domain = 'protection';
  else if (/self-growth|personal-growth|life-purpose/.test(s)) primary_domain = 'self_growth';
  else if (/future|timeline|when-will|predict/.test(s)) primary_domain = 'future';
  else if (/spiritual|angel|aura|clairs|palm|past-life/.test(s) && !/love|relationship|breakup/.test(s)) primary_domain = 'spirituality';

  // Secondary topics
  const secondary_topics: Domain[] = [];
  if (/tarot/.test(s)) secondary_topics.push('spirituality');
  if (/medium|passed|deceased/.test(s)) secondary_topics.push('spirituality');
  if (/career|money/.test(s) && primary_domain === 'love') secondary_topics.push('career');
  if (/love|relationship/.test(s) && primary_domain !== 'love') secondary_topics.push('love');
  if (/breakup|ex-|divorce|separation/.test(s)) { if (!secondary_topics.includes('breakup' as Domain)) secondary_topics.push('breakup'); }

  // Emotional states
  const emotional_states: EmotionalState[] = [];
  if (/anxiety|worry|anxious/.test(s)) emotional_states.push('anxiety');
  if (/healing|heartbreak/.test(s)) emotional_states.push('grief');
  if (/confusion|uncertain/.test(s)) emotional_states.push('confusion');
  if (/hope|coming-back|signs-your-ex/.test(s)) emotional_states.push('hope');
  if (/fear/.test(s)) emotional_states.push('fear');

  // Relationship states
  const relationship_states: RelationshipState[] = [];
  if (/no-contact/.test(s)) relationship_states.push('no_contact');
  if (/breakup|divorce|ex-|separation|heartbreak|win-her-back|signs-your-ex/.test(s)) relationship_states.push('recently_separated');
  if (/does-he|is-he|specific-person/.test(s)) relationship_states.push('thinking_about_someone');
  if (/situationship|complicated|love-triangle|third-party|other-woman/.test(s)) relationship_states.push('complicated');
  if (/marriage|propose|when-will-i-get-married|real-marriage|can-psychic-predict-marriage/.test(s)) relationship_states.push('relationship');
  if (/soulmate/.test(s) && !relationship_states.length) relationship_states.push('thinking_about_someone');

  // Desired outcomes
  const desired_outcomes: DesiredOutcome[] = [];
  if (/win-her-back|coming-back|reconcil|signs-your-ex/.test(s)) desired_outcomes.push('action');
  if (/healing|closure/.test(s)) desired_outcomes.push('closure');
  if (/clarity|choose|how-to-pick|choose-the-right/.test(s)) desired_outcomes.push('clarity');
  if (/predict|when-will|future|timeline/.test(s)) desired_outcomes.push('prediction');
  if (/reassur|legit|are-psychics-real|is-purple-garden/.test(s)) desired_outcomes.push('reassurance');

  // Temporal orientation
  const temporal_orientation: TemporalOrientation[] = ['present'];
  if (/future|when-will|predict|timeline/.test(s)) temporal_orientation.push('future');
  if (/past-life|ex-|coming-back|signs-your-ex|dreaming-about-ex/.test(s)) temporal_orientation.push('past');

  // Commercial intent
  let commercial_intent: CommercialIntent = 'low';
  if (/best-|top-|kasamba|keen|purple-garden|credit|minutes|^most-accurate/.test(s)) commercial_intent = 'high';
  else if (/guide|review|how-to|first-psychic|before-you-pay|should-you-pay|cheap/.test(s)) commercial_intent = 'medium';

  return {
    slug,
    title: slugToTitle(slug),
    url: '/guides/' + slug + '/',
    primary_domain,
    secondary_topics,
    emotional_states,
    relationship_states,
    desired_outcomes,
    temporal_orientation,
    commercial_intent,
  };
}